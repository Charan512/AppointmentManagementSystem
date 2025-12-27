const express = require('express');
const router = express.Router();
const {
    createOrganization,
    updateOrganization,
    getAllOrganizations,
    getOrganizationById,
    getOrganizationByUserId,
    getOrganizationAnalytics
} = require('../controllers/organizationController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Public routes
router.get('/', getAllOrganizations);
router.get('/:id', getOrganizationById);

// Private routes - organization role only
router.post('/', auth, roleCheck('organization'), createOrganization);
router.put('/:id', auth, roleCheck('organization'), updateOrganization);
router.get('/:id/analytics', auth, roleCheck('organization'), getOrganizationAnalytics);

// Private routes - authenticated users
router.get('/user/:userId', auth, getOrganizationByUserId);

module.exports = router;
