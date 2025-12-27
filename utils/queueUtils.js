const Appointment = require('../models/Appointment');

/**
 * Calculate queue position for a new appointment
 * @param {ObjectId} organizationId - Organization ID
 * @param {Date} appointmentDate - Appointment date
 * @param {String} appointmentTime - Appointment time
 * @returns {Number} Queue position
 */
const calculateQueuePosition = async (organizationId, appointmentDate, appointmentTime) => {
    try {
        // Get the start of the day
        const startOfDay = new Date(appointmentDate);
        startOfDay.setHours(0, 0, 0, 0);

        // Get the end of the day
        const endOfDay = new Date(appointmentDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Count appointments for the same organization on the same day that are pending or in-progress
        const count = await Appointment.countDocuments({
            organizationId,
            appointmentDate: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            status: { $in: ['pending', 'in-progress'] }
        });

        return count + 1;
    } catch (error) {
        console.error('Error calculating queue position:', error);
        return 1;
    }
};

/**
 * Calculate estimated wait time
 * @param {Number} queuePosition - Position in queue
 * @param {Number} appointmentDuration - Duration per appointment in minutes
 * @returns {Number} Estimated wait time in minutes
 */
const calculateEstimatedWaitTime = (queuePosition, appointmentDuration = 30) => {
    // Simple calculation: (position - 1) * duration
    // Subtract 1 because if you're position 1, you don't wait
    return Math.max(0, (queuePosition - 1) * appointmentDuration);
};

/**
 * Check if a time slot is available
 * @param {ObjectId} organizationId - Organization ID
 * @param {Date} appointmentDate - Appointment date
 * @param {String} appointmentTime - Appointment time
 * @param {String} expertName - Expert name
 * @returns {Boolean} True if slot is available
 */
const isSlotAvailable = async (organizationId, appointmentDate, appointmentTime, expertName) => {
    try {
        const startOfDay = new Date(appointmentDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(appointmentDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Check if there's already an appointment at this time with this expert
        const existingAppointment = await Appointment.findOne({
            organizationId,
            appointmentDate: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            appointmentTime,
            expertName,
            status: { $in: ['pending', 'in-progress'] }
        });

        return !existingAppointment;
    } catch (error) {
        console.error('Error checking slot availability:', error);
        return false;
    }
};

/**
 * Check if appointment time is within working hours
 * @param {Array} workingHours - Array of working hour objects
 * @param {Date} appointmentDate - Appointment date
 * @param {String} appointmentTime - Appointment time (HH:MM)
 * @returns {Boolean} True if within working hours
 */
const isWithinWorkingHours = (workingHours, appointmentDate, appointmentTime) => {
    try {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const date = new Date(appointmentDate);
        const dayName = dayNames[date.getDay()];

        const schedule = workingHours.find(wh => wh.day === dayName && wh.isOpen);

        if (!schedule) {
            console.log(`No schedule found for ${dayName}`);
            return false;
        }

        // Convert times to minutes for accurate comparison
        const timeToMinutes = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        };

        const appointmentMinutes = timeToMinutes(appointmentTime);
        const startMinutes = timeToMinutes(schedule.startTime);
        const endMinutes = timeToMinutes(schedule.endTime);

        const isWithin = appointmentMinutes >= startMinutes && appointmentMinutes <= endMinutes;

        console.log(`Checking ${appointmentTime} against ${schedule.startTime}-${schedule.endTime}: ${isWithin}`);

        return isWithin;
    } catch (error) {
        console.error('Error in isWithinWorkingHours:', error);
        return false;
    }
};

/**
 * Update queue positions after status change
 * @param {ObjectId} organizationId - Organization ID
 * @param {Date} appointmentDate - Appointment date
 */
const updateQueuePositions = async (organizationId, appointmentDate) => {
    try {
        const startOfDay = new Date(appointmentDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(appointmentDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Get all pending and in-progress appointments for the day, sorted by creation time
        const appointments = await Appointment.find({
            organizationId,
            appointmentDate: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            status: { $in: ['pending', 'in-progress'] }
        }).sort({ createdAt: 1 });

        // Update queue positions
        for (let i = 0; i < appointments.length; i++) {
            appointments[i].queuePosition = i + 1;
            await appointments[i].save();
        }
    } catch (error) {
        console.error('Error updating queue positions:', error);
    }
};

module.exports = {
    calculateQueuePosition,
    calculateEstimatedWaitTime,
    isSlotAvailable,
    isWithinWorkingHours,
    updateQueuePositions
};
