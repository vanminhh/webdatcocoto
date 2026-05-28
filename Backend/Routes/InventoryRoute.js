const express = require('express');
const router = express.Router();
const InventoryController = require('../Controllers/InventoryController');
const { authenticateToken, requireAdmin } = require('../Middlewares/authMiddleware');

router.get('/', authenticateToken, requireAdmin, InventoryController.getInventoryList);
router.post('/import', authenticateToken, requireAdmin, InventoryController.importStock);
router.get('/:carCode/transactions', authenticateToken, requireAdmin, InventoryController.getInventoryTransactions);
router.get('/:carCode', authenticateToken, requireAdmin, InventoryController.getInventoryByCarCode);

module.exports = router;
