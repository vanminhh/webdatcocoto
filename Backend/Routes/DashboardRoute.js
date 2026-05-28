const express = require('express');
const router = express.Router();
const DashboardController = require('../Controllers/DashboardController');

const { authenticateToken, requireAdmin } = require('../Middlewares/authMiddleware');

router.get('/monthly-stats', authenticateToken, requireAdmin, DashboardController.getMonthlyStats);

module.exports = router;
