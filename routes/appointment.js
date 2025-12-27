const express = require('express');
const router = express.Router();
const {
    bookAppointment,
    getUserAppointments,
    getOrganizationAppointments,
    updateAppointmentStatus,
    cancelAppointment,
    getAppointmentById
} = require('../controllers/appointmentController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Private routes - user role only
router.post('/', auth, roleCheck('user'), bookAppointment);
router.get('/user', auth, roleCheck('user'), getUserAppointments);
router.delete('/:id', auth, roleCheck('user'), cancelAppointment);

// Private routes - organization role only
router.get('/organization/:orgId', auth, roleCheck('organization'), getOrganizationAppointments);
router.put('/:id/status', auth, roleCheck('organization'), updateAppointmentStatus);

// Private routes - authenticated users (both roles)
router.get('/:id', auth, getAppointmentById);

module.exports = router;
