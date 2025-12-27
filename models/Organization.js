const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    organizationName: {
        type: String,
        required: [true, 'Organization name is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Hospital', 'Clinic', 'Bank', 'Service Center', 'Government Office', 'Other'],
        default: 'Other'
    },
    workingHours: [{
        day: {
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            required: true
        },
        startTime: {
            type: String,
            required: true,
            match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
        },
        endTime: {
            type: String,
            required: true,
            match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
        },
        isOpen: {
            type: Boolean,
            default: true
        }
    }],
    experts: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        specialization: {
            type: String,
            required: true,
            trim: true
        },
        available: {
            type: Boolean,
            default: true
        }
    }],
    appointmentDuration: {
        type: Number,
        default: 30,
        min: 5,
        max: 240
    },
    address: {
        type: String,
        trim: true
    },
    phone: {
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
organizationSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual field to check if organization is currently open
organizationSchema.virtual('isCurrentlyOpen').get(function () {
    const now = new Date();
    const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const todaySchedule = this.workingHours.find(wh => wh.day === currentDay && wh.isOpen);

    if (!todaySchedule) return false;

    return currentTime >= todaySchedule.startTime && currentTime <= todaySchedule.endTime;
});

// Ensure virtuals are included in JSON
organizationSchema.set('toJSON', { virtuals: true });
organizationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Organization', organizationSchema);
