const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    expertName: {
        type: String,
        required: [true, 'Expert name is required'],
        trim: true
    },
    serviceName: {
        type: String,
        required: [true, 'Service name is required'],
        trim: true
    },
    appointmentDate: {
        type: Date,
        required: [true, 'Appointment date is required']
    },
    appointmentTime: {
        type: String,
        required: [true, 'Appointment time is required'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    queuePosition: {
        type: Number,
        default: 0
    },
    estimatedWaitTime: {
        type: Number,
        default: 0
    },
    notes: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
appointmentSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Index for efficient queries
appointmentSchema.index({ organizationId: 1, appointmentDate: 1, status: 1 });
appointmentSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
