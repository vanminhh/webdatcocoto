const Order = require("../models/order");
const Car = require("../models/car");
const InventoryService = require("../services/InventoryService");
const OrderStatusService = require("../services/OrderStatusService");
const { normalizeDateToStartOfSaigon } = require("../utils/dateHelper");

/* ═══════════════════════════════════════
   ORDER CONTROLLER — Hệ thống 5 trạng thái
   pending → deposited → purchased
   pending → cancelled (auto / manual)
   deposited → deposit_expired (auto)
   ═══════════════════════════════════════ */

// ─── Tạo đơn hàng + giữ tồn kho ───
const createOrder = async (req, res) => {
    try {
        const { carId, date, depositAmount, quantity } = req.body;
        
        if (date) {
            const dateInput = new Date(date).toISOString().split('T')[0];
            const orderDate = normalizeDateToStartOfSaigon(dateInput);
            const now = new Date();
            const saigonOffset = 7 * 60 * 60 * 1000;
            const saigonNow = new Date(now.getTime() + saigonOffset);
            const todayStart = normalizeDateToStartOfSaigon(saigonNow.toISOString().split('T')[0]);
            
            if (orderDate < todayStart) {
                return res.status(400).json({ message: 'Ngày đặt lịch không được là ngày quá khứ!' });
            }
        }
        
        const qty = parseInt(quantity);
        if (isNaN(qty) || qty < 1) {
            return res.status(400).json({ message: 'Số lượng xe đặt cọc phải lớn hơn hoặc bằng 1!' });
        }

        const car = await Car.findOne({ id: String(carId) });
        if (!car) return res.status(404).json({ message: 'Không tìm thấy dòng xe này!' });

        const inv = await InventoryService.getInventoryByCarCode(String(carId));
        if (!inv || inv.availableQuantity < qty) {
            return res.status(400).json({ 
                message: `Không đủ số lượng xe khả dụng! Bạn yêu cầu đặt ${qty} xe, nhưng showroom chỉ còn ${inv ? inv.availableQuantity : 0} xe khả dụng.` 
            });
        }

        const userId = req.user ? req.user.userId || req.user.id || req.user._id : null;

        if (userId) {
            const existingOrder = await Order.findOne({
                userId,
                carId: String(carId),
                status: { $in: OrderStatusService.ACTIVE_BLOCKING_STATUSES }
            });
            if (existingOrder) {
                return res.status(400).json({ 
                    message: 'Bạn đã đặt cọc dòng xe này rồi! Mỗi tài khoản chỉ được đặt cọc 1 lần cho mỗi dòng xe.' 
                });
            }
        }

        const viewDate = new Date(date);
        const deadline = new Date(viewDate);
        deadline.setDate(deadline.getDate() + 1);

        const totalDeposit = (depositAmount || 0) * qty;

        const newOrder = new Order({
            ...req.body,
            quantity: qty,
            userId,
            status: 'pending',
            depositAmount: totalDeposit,
            deadline,
            inventoryReserved: false,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const savedOrder = await newOrder.save();

        try {
            await InventoryService.reserveStock(String(carId), qty, savedOrder._id, 'Khách hàng đặt cọc online', userId);
            savedOrder.inventoryReserved = true;
            await savedOrder.save();
        } catch (reserveErr) {
            console.error('Lỗi giữ tồn kho, tiến hành rollback order:', reserveErr);
            await Order.findByIdAndDelete(savedOrder._id);
            return res.status(400).json({ message: 'Lỗi giữ chỗ tồn kho: ' + reserveErr.message });
        }

        res.status(201).json(savedOrder);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// ─── Lấy tất cả đơn ───
const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Lấy đơn theo ID (kèm thông tin xe) ───
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        let carName = order.carName || null;
        let carImage = null;
        if (order.carId) {
            const car = await Car.findOne({ id: String(order.carId) });
            if (car) {
                carName  = carName || car.name;
                carImage = car.URL || car.detailURL || car.bannerURL || null;
            }
        }

        res.status(200).json({
            ...order.toObject(),
            carName,
            carImage
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Cập nhật đơn (đổi trạng thái) ───
// ─── Cập nhật đơn (đổi trạng thái) ───
const updateOrder = async (req, res) => {
    try {
        const adminId = req.user ? req.user.id || req.user._id || req.user.userId : null;
        const newStatus = req.body.status;
        
        // Cập nhật metadata chung ngoài status (nếu có)
        const updates = { ...req.body };
        delete updates.status; // status được quản lý bởi OrderStatusService

        // Gọi service xử lý chuyển trạng thái
        const updatedOrder = await OrderStatusService.transitionStatus(
            req.params.id,
            newStatus,
            'admin',
            adminId,
            updates
        );

        res.status(200).json(updatedOrder);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// ─── Xóa đơn + hoàn stock ───
const deleteOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        const nonRefundStatuses = ['cancelled', 'deposit_expired', 'purchased'];
        if (!nonRefundStatuses.includes(order.status) && order.inventoryReserved) {
            // Đơn đang active bị xóa cứng -> hoàn tồn
            await InventoryService.releaseStock(order.carId, order.quantity || 1, order._id, 'Xóa đơn hàng trên hệ thống');
        }

        await Order.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ═══════════════════════════════════════
// AUTO-EXPIRE FUNCTIONS (Cron Jobs)
// ═══════════════════════════════════════

const expirePendingOrders = async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const expiredOrders = await Order.find({
        status: 'pending',
        createdAt: { $lt: sevenDaysAgo }
    });

    let count = 0;
    for (const order of expiredOrders) {
        order.status = 'cancelled';
        order.cancelled_reason = 'auto_expired_pending';
        order.note = (order.note || '') + ' [Tự động hủy - chờ xác nhận > 7 ngày]';
        
        if (order.inventoryReserved) {
            await InventoryService.releaseStock(order.carId, order.quantity || 1, order._id, 'Auto-expire pending');
            order.inventoryReserved = false;
            order.inventoryReleasedAt = new Date();
        }
        
        await order.save();
        count++;
    }
    return count;
};

const expireDepositOrders = async () => {
    const now = new Date();

    const expiredOrders = await Order.find({
        status: 'deposited',
        deposit_expire_date: { $lte: now, $ne: null }
    });

    let count = 0;
    for (const order of expiredOrders) {
        order.status = 'deposit_expired';
        order.cancelled_reason = 'auto_expired_deposit';
        order.note = (order.note || '') + ' [Tự động hủy cọc - quá hạn đặt cọc]';
        
        if (order.inventoryReserved) {
            await InventoryService.releaseStock(order.carId, order.quantity || 1, order._id, 'Auto-expire deposit');
            order.inventoryReserved = false;
            order.inventoryReleasedAt = new Date();
        } else if (order.inventoryPhysicalDeductedAt) {
            await InventoryService.releaseConfirmedDeposit(order.carId, order.quantity || 1, order._id, 'Auto-expire deposit');
            order.inventoryPhysicalDeductedAt = null;
            order.inventoryReleasedAt = new Date();
        }
        
        await order.save();
        count++;
    }
    return count;
};

const cleanupCancelledOrders = async () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const result = await Order.deleteMany({
        status: 'cancelled',
        updatedAt: { $lt: sixMonthsAgo }
    });

    return result.deletedCount;
};

const autoExpireAll = async (req, res) => {
    try {
        const pendingCount = await expirePendingOrders();
        const depositCount = await expireDepositOrders();
        res.status(200).json({
            message: `Đã xử lý: ${pendingCount} đơn pending, ${depositCount} đơn cọc quá hạn`,
            pendingExpired: pendingCount,
            depositExpired: depositCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const cleanupCancelled = async (req, res) => {
    try {
        const count = await cleanupCancelledOrders();
        res.status(200).json({
            message: `Đã dọn dẹp ${count} đơn hủy cũ (> 6 tháng)`,
            deletedCount: count
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const trackByPhone = async (req, res) => {
    try {
        const { phone } = req.params;
        const orders = await Order.find({ phoneNumber: phone }).sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMyOrders = async (req, res) => {
    try {
        const { email, userId } = req.query;
        if (!email && !userId) {
            return res.status(400).json({ message: 'Cần cung cấp email hoặc userId!' });
        }

        let query = {};
        if (userId) query.userId = userId;
        else if (email) query.email = email;

        const orders = await Order.find(query).sort({ createdAt: -1 });

        const ordersWithCarInfo = await Promise.all(orders.map(async (order) => {
            const orderObj = order.toObject();
            const car = await Car.findOne({ id: String(order.carId) });
            orderObj.carName = car?.name || 'Xe không xác định';
            orderObj.carImage = car?.URL || '';
            orderObj.carPrice = car?.Price || 0;
            return orderObj;
        }));

        res.status(200).json(ordersWithCarInfo);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const checkActiveDeposit = async (req, res) => {
    try {
        const { carId } = req.query;
        const userId = req.user?.userId;

        if (!carId) return res.status(400).json({ message: 'Thiếu carId' });
        if (!userId) return res.status(401).json({ message: 'Vui lòng đăng nhập' });

        const existingOrder = await Order.findOne({
            userId,
            carId: String(carId),
            status: { $in: OrderStatusService.ACTIVE_BLOCKING_STATUSES }
        });

        if (existingOrder) {
            return res.status(200).json({
                hasActiveDeposit: true,
                orderId: existingOrder._id,
                message: 'Bạn đang có đơn hàng xử lý cho xe này.'
            });
        }

        return res.status(200).json({ hasActiveDeposit: false });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createOrder,
    getAllOrders,
    getOrderById,
    updateOrder,
    deleteOrder,
    autoExpireAll,
    cleanupCancelled,
    trackByPhone,
    getMyOrders,
    checkActiveDeposit,
    expirePendingOrders,
    expireDepositOrders,
    cleanupCancelledOrders
};