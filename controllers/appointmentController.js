const Appointment = require('../models/Appointment');
const Organization = require('../models/Organization');
const {
    calculateQueuePosition,
    calculateEstimatedWaitTime,
    isSlotAvailable,
    isWithinWorkingHours,
    updateQueuePositions
} = require('../utils/queueUtils');

/**
 * @desc    Book new appointment
 * @route   POST /api/appointments
 * @access  Private (user role only)
 */
const bookAppointment = async (req, res) => {
    try {
        const { organizationId, expertName, serviceName, appointmentDate, appointmentTime, notes } = req.body;

        // Validate required fields
        if (!organizationId || !expertName || !serviceName || !appointmentDate || !appointmentTime) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Get organization
        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Check if appointment date is in the future
        const appointmentDateTime = new Date(appointmentDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (appointmentDateTime < today) {
            return res.status(400).json({
                success: false,
                message: 'Cannot book appointment in the past'
            });
        }

        // Check if within working hours
        if (!isWithinWorkingHours(
            organization.workingHours,
            appointmentDate,
            appointmentTime,
            organization.daysOff,
            organization.isCurrentlyOpen,
            organization.weeklyDaysOff
        )) {
            return res.status(400).json({
                success: false,
                message: 'Appointment time is outside working hours, on a day off, or organization is temporarily closed'
            });
        }

        // Check if expert exists and is available
        const expert = organization.experts.find(e => e.name === expertName);
        if (!expert) {
            return res.status(404).json({
                success: false,
                message: 'Expert not found'
            });
        }

        if (!expert.available) {
            return res.status(400).json({
                success: false,
                message: 'Expert is not available'
            });
        }

        // Check slot availability
        const slotAvailable = await isSlotAvailable(
            organizationId,
            appointmentDate,
            appointmentTime,
            expertName,
            organization.reservedSlotsPerDay || 0
        );
        if (!slotAvailable) {
            return res.status(400).json({
                success: false,
                message: 'Slot is already taken'
            });
        }

        // Calculate queue position
        const queuePosition = await calculateQueuePosition(organizationId, appointmentDate, appointmentTime);

        // Calculate estimated wait time
        const estimatedWaitTime = calculateEstimatedWaitTime(queuePosition, organization.appointmentDuration);

        // Create appointment
        const appointment = await Appointment.create({
            userId: req.user.id,
            organizationId,
            expertName,
            serviceName,
            appointmentDate,
            appointmentTime,
            queuePosition,
            estimatedWaitTime,
            notes
        });

        // Populate user and organization details
        await appointment.populate('userId', 'name email phone');
        await appointment.populate('organizationId', 'organizationName category');

        res.status(201).json({
            success: true,
            message: 'Appointment booked successfully',
            data: { appointment }
        });
    } catch (error) {
        console.error('Book appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

/**
 * @desc    Get user appointments
 * @route   GET /api/appointments/user
 * @access  Private (user role only)
 */
const getUserAppointments = async (req, res) => {
    try {
        const { status } = req.query;

        const query = { userId: req.user.id };
        if (status) {
            query.status = status;
        }

        const appointments = await Appointment.find(query)
            .populate('organizationId', 'organizationName category address phone')
            .sort({ appointmentDate: -1, appointmentTime: -1 });

        res.status(200).json({
            success: true,
            count: appointments.length,
            data: { appointments }
        });
    } catch (error) {
        console.error('Get user appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

/**
 * @desc    Get organization appointments
 * @route   GET /api/appointments/organization/:orgId
 * @access  Private (organization role only)
 */
const getOrganizationAppointments = async (req, res) => {
    try {
        const { status, date } = req.query;

        // Verify organization belongs to user
        const organization = await Organization.findById(req.params.orgId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        if (organization.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view these appointments'
            });
        }

        const query = { organizationId: req.params.orgId };

        if (status) {
            query.status = status;
        }

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            query.appointmentDate = {
                $gte: startOfDay,
                $lte: endOfDay
            };
        }

        const appointments = await Appointment.find(query)
            .populate('userId', 'name email phone')
            .sort({ appointmentDate: 1, appointmentTime: 1, queuePosition: 1 });

        res.status(200).json({
            success: true,
            count: appointments.length,
            data: { appointments }
        });
    } catch (error) {
        console.error('Get organization appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

/**
 * @desc    Update appointment status
 * @route   PUT /api/appointments/:id/status
 * @access  Private (organization role only)
 */
const updateAppointmentStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Please provide status'
            });
        }

        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Verify organization belongs to user
        const organization = await Organization.findById(appointment.organizationId);
        if (organization.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this appointment'
            });
        }

        // Update status
        appointment.status = status;
        await appointment.save();

        // Update queue positions if appointment is completed or cancelled
        if (status === 'completed' || status === 'cancelled') {
            await updateQueuePositions(appointment.organizationId, appointment.appointmentDate);
        }

        await appointment.populate('userId', 'name email phone');
        await appointment.populate('organizationId', 'organizationName category');

        res.status(200).json({
            success: true,
            message: 'Appointment status updated successfully',
            data: { appointment }
        });
    } catch (error) {
        console.error('Update appointment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

/**
 * @desc    Cancel appointment
 * @route   DELETE /api/appointments/:id
 * @access  Private (user role only)
 */
const cancelAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Check if user owns this appointment
        if (appointment.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this appointment'
            });
        }

        // Check if appointment can be cancelled
        if (appointment.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel completed appointment'
            });
        }

        if (appointment.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Appointment is already cancelled'
            });
        }

        // Update status to cancelled
        appointment.status = 'cancelled';
        await appointment.save();

        // Update queue positions
        await updateQueuePositions(appointment.organizationId, appointment.appointmentDate);

        res.status(200).json({
            success: true,
            message: 'Appointment cancelled successfully',
            data: { appointment }
        });
    } catch (error) {
        console.error('Cancel appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

/**
 * @desc    Get appointment by ID
 * @route   GET /api/appointments/:id
 * @access  Private
 */
const getAppointmentById = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate('userId', 'name email phone')
            .populate('organizationId', 'organizationName category address phone');

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Check authorization
        const organization = await Organization.findById(appointment.organizationId);
        const isOwner = appointment.userId._id.toString() === req.user.id;
        const isOrgOwner = organization && organization.userId.toString() === req.user.id;

        if (!isOwner && !isOrgOwner) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this appointment'
            });
        }

        res.status(200).json({
            success: true,
            data: { appointment }
        });
    } catch (error) {
        console.error('Get appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    bookAppointment,
    getUserAppointments,
    getOrganizationAppointments,
    updateAppointmentStatus,
    cancelAppointment,
    getAppointmentById
};
