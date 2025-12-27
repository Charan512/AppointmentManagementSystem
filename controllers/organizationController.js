const Organization = require('../models/Organization');
const Appointment = require('../models/Appointment');

/**
 * @desc    Create organization profile
 * @route   POST /api/organizations
 * @access  Private (organization role only)
 */
const createOrganization = async (req, res) => {
    try {
        const { organizationName, description, category, workingHours, experts, appointmentDuration, address, phone } = req.body;

        // Check if organization already exists for this user
        const existingOrg = await Organization.findOne({ userId: req.user.id });
        if (existingOrg) {
            return res.status(400).json({
                success: false,
                message: 'Organization profile already exists for this user'
            });
        }

        // Create organization
        const organization = await Organization.create({
            userId: req.user.id,
            organizationName,
            description,
            category,
            workingHours: workingHours || [],
            experts: experts || [],
            appointmentDuration: appointmentDuration || 30,
            address,
            phone
        });

        res.status(201).json({
            success: true,
            message: 'Organization created successfully',
            data: { organization }
        });
    } catch (error) {
        console.error('Create organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

/**
 * @desc    Update organization profile
 * @route   PUT /api/organizations/:id
 * @access  Private (organization role only)
 */
const updateOrganization = async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.id);

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Check if user owns this organization
        if (organization.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this organization'
            });
        }

        // Update organization
        const updatedOrganization = await Organization.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Organization updated successfully',
            data: { organization: updatedOrganization }
        });
    } catch (error) {
        console.error('Update organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

/**
 * @desc    Get all organizations
 * @route   GET /api/organizations
 * @access  Public
 */
const getAllOrganizations = async (req, res) => {
    try {
        const organizations = await Organization.find().populate('userId', 'name email phone');

        res.status(200).json({
            success: true,
            count: organizations.length,
            data: { organizations }
        });
    } catch (error) {
        console.error('Get organizations error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

/**
 * @desc    Get organization by ID
 * @route   GET /api/organizations/:id
 * @access  Public
 */
const getOrganizationById = async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.id).populate('userId', 'name email phone');

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        res.status(200).json({
            success: true,
            data: { organization }
        });
    } catch (error) {
        console.error('Get organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

/**
 * @desc    Get organization by user ID
 * @route   GET /api/organizations/user/:userId
 * @access  Private
 */
const getOrganizationByUserId = async (req, res) => {
    try {
        const organization = await Organization.findOne({ userId: req.params.userId });

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found for this user'
            });
        }

        res.status(200).json({
            success: true,
            data: { organization }
        });
    } catch (error) {
        console.error('Get organization by user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

/**
 * @desc    Get organization analytics
 * @route   GET /api/organizations/:id/analytics
 * @access  Private (organization role only)
 */
const getOrganizationAnalytics = async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.id);

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Check if user owns this organization
        if (organization.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this organization analytics'
            });
        }

        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get analytics
        const totalAppointments = await Appointment.countDocuments({
            organizationId: req.params.id
        });

        const todayAppointments = await Appointment.countDocuments({
            organizationId: req.params.id,
            appointmentDate: { $gte: today, $lt: tomorrow }
        });

        const pendingAppointments = await Appointment.countDocuments({
            organizationId: req.params.id,
            status: 'pending'
        });

        const inProgressAppointments = await Appointment.countDocuments({
            organizationId: req.params.id,
            status: 'in-progress'
        });

        const completedAppointments = await Appointment.countDocuments({
            organizationId: req.params.id,
            status: 'completed'
        });

        const cancelledAppointments = await Appointment.countDocuments({
            organizationId: req.params.id,
            status: 'cancelled'
        });

        const todayCompleted = await Appointment.countDocuments({
            organizationId: req.params.id,
            appointmentDate: { $gte: today, $lt: tomorrow },
            status: 'completed'
        });

        const todayPending = await Appointment.countDocuments({
            organizationId: req.params.id,
            appointmentDate: { $gte: today, $lt: tomorrow },
            status: 'pending'
        });

        res.status(200).json({
            success: true,
            data: {
                analytics: {
                    total: totalAppointments,
                    today: {
                        total: todayAppointments,
                        completed: todayCompleted,
                        pending: todayPending
                    },
                    overall: {
                        pending: pendingAppointments,
                        inProgress: inProgressAppointments,
                        completed: completedAppointments,
                        cancelled: cancelledAppointments
                    }
                }
            }
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    createOrganization,
    updateOrganization,
    getAllOrganizations,
    getOrganizationById,
    getOrganizationByUserId,
    getOrganizationAnalytics
};
