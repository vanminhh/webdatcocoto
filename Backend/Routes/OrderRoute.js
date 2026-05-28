const express = require('express');
const orderController = require("../Controllers/OrderController");
const { authenticateToken, requireAdmin } = require("../Middlewares/authMiddleware");
const router = express.Router();
const Order = require('../models/order');

// ─── CRUD ───
router.get('/my-orders', orderController.getMyOrders);
router.post('/create', authenticateToken, orderController.createOrder);
router.get('/list', orderController.getAllOrders);
router.get('/list/:type', async (req, res) => {
    try {
        const { type } = req.params;
        let query;
        if (type === 'datlich') {
            query = { $or: [{ type: 'datlich' }, { type: { $exists: false } }, { type: null }] };
        } else {
            query = { type };
        }
        const orders = await Order.find(query).sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ─── Auto-expire ALL (pending 7d + deposit quá hạn) ───
router.get('/auto-expire-all', orderController.autoExpireAll);

// ─── Cleanup cancelled > 6 tháng ───
router.delete('/cleanup-cancelled', orderController.cleanupCancelled);

// ─── Tra cứu theo SĐT ───
router.get('/track/:phone', orderController.trackByPhone);

// ─── Kiểm tra đơn đặt cọc active ───
router.get('/check-active-deposit', authenticateToken, orderController.checkActiveDeposit);

// ─── By ID ───
router.get('/:id', orderController.getOrderById);
router.put('/:id', authenticateToken, requireAdmin, orderController.updateOrder);
router.delete('/:id', authenticateToken, requireAdmin, orderController.deleteOrder);

module.exports = router;