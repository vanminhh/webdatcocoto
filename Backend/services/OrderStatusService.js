const Order = require('../models/order');
const InventoryService = require('./InventoryService');
const { normalizeDateToStartOfSaigon } = require('../utils/dateHelper');

// A6: Định nghĩa constant
const ACTIVE_BLOCKING_STATUSES = ['pending', 'pending_payment', 'deposited'];
const FINISHED_STATUSES = ['purchased', 'cancelled', 'deposit_expired'];

const VALID_TRANSITIONS = {
    'pending': ['pending_payment', 'deposited', 'cancelled', 'deposit_expired', 'purchased'],
    'pending_payment': ['deposited', 'cancelled', 'deposit_expired', 'pending', 'purchased'],
    'deposited': ['purchased', 'cancelled', 'deposit_expired'],
    'purchased': ['cancelled'], // Chặn purchased -> deposited, purchased -> pending
    'cancelled': ['pending', 'deposited', 'purchased'], // Khôi phục
    'deposit_expired': ['pending', 'deposited', 'purchased']
};

class OrderStatusService {
    static get ACTIVE_BLOCKING_STATUSES() { return ACTIVE_BLOCKING_STATUSES; }
    static get FINISHED_STATUSES() { return FINISHED_STATUSES; }
    static get VALID_TRANSITIONS() { return VALID_TRANSITIONS; }

    /**
     * A4, A5: State machine tập trung
     * @param {string} orderId 
     * @param {string} nextStatus 
     * @param {string} actorType - admin, payment_webhook, cron, system
     * @param {string} actorId - id người/hệ thống thực hiện
     * @param {object} metadata - deposit_expire_date, cancelled_reason, note, v.v.
     */
    static async transitionStatus(orderId, nextStatus, actorType, actorId, metadata = {}) {
        const order = await Order.findById(orderId);
        if (!order) throw new Error('Không tìm thấy đơn hàng!');

        const oldStatus = order.status;
        
        if (oldStatus === nextStatus) {
            // Cập nhật metadata nếu cùng trạng thái (VD: Admin cập nhật thông tin)
            // nhưng không đổi status, ta xử lý ở controller, service này chỉ dùng đổi trạng thái
            return order;
        }

        const allowed = VALID_TRANSITIONS[oldStatus];
        if (allowed && !allowed.includes(nextStatus)) {
            throw new Error(`Chuyển trạng thái không hợp lệ từ '${oldStatus}' sang '${nextStatus}'!`);
        }

        const updates = { ...metadata };

        // ── Logic chuyển → deposited ──
        if (nextStatus === 'deposited' && oldStatus !== 'deposited') {
            // Ưu tiên: ngày hẹn xem xe (order.date) → deposit_expire_date cũ → deadline → tự tính
            const isAutoDate = !updates.deposit_expire_date; // true = hệ thống tự set, false = admin nhập
            if (!updates.deposit_expire_date) {
                if (order.date) {
                    updates.deposit_expire_date = order.date; // Dùng ngày hẹn làm hạn cọc
                } else if (order.deposit_expire_date) {
                    updates.deposit_expire_date = order.deposit_expire_date;
                } else if (order.deadline) {
                    updates.deposit_expire_date = order.deadline;
                } else {
                    const fallbackDate = new Date();
                    fallbackDate.setDate(fallbackDate.getDate() + 1);
                    updates.deposit_expire_date = fallbackDate;
                }
            }
            
            if (updates.deposit_expire_date) {
                const dateInput = new Date(updates.deposit_expire_date).toISOString().split('T')[0];
                const expireDate = normalizeDateToStartOfSaigon(dateInput);
                
                // Chỉ validate ngày quá khứ nếu admin tự nhập (không phải auto từ order.date)
                if (!isAutoDate) {
                    const now = new Date();
                    const saigonOffset = 7 * 60 * 60 * 1000;
                    const saigonNow = new Date(now.getTime() + saigonOffset);
                    const todayStart = normalizeDateToStartOfSaigon(saigonNow.toISOString().split('T')[0]);
                    if (expireDate < todayStart) {
                        throw new Error('Ngày hết hạn cọc không được là ngày quá khứ!');
                    }
                }
                
                updates.deposit_expire_date = expireDate;
            }
            updates.confirmedAt = new Date();
        }

        // ── Logic chuyển → cancelled (thủ công) ──
        if (nextStatus === 'cancelled' && oldStatus !== 'cancelled') {
            updates.cancelled_reason = updates.cancelled_reason || metadata.cancelled_reason || 'manual';
            if (actorType === 'admin') {
                const deposit = order.depositAmount || 0;
                const penalty = Math.round(deposit * 0.1);
                const refund = deposit - penalty;
                updates.penaltyAmount = penalty;
                updates.refundAmount = refund;
                updates.note = (order.note || '') + ` [Hủy cọc - Phí hủy: ${penalty.toLocaleString('vi-VN')}₫, Hoàn lại: ${refund.toLocaleString('vi-VN')}₫]`;
            }
        }

        // ── Logic chuyển → deposit_expired: ghi nhận tiền cọc làm doanh thu ──
        // Khi khách đến xem xe nhưng không mua → cọc bị giữ lại 100% là doanh thu
        if (nextStatus === 'deposit_expired' && oldStatus !== 'deposit_expired') {
            const deposit = order.depositAmount || 0;
            if (deposit > 0) {
                updates.forfeitedDeposit = deposit;
                updates.forfeitedAt = new Date();
                updates.note = (order.note || '') + ` [Hết hạn cọc - Giữ lại: ${deposit.toLocaleString('vi-VN')}₫ (doanh thu cọc)]`;
            }
        }

        // ── Logic nhả/giữ tồn kho ──
        const cancelStatuses = ['cancelled', 'deposit_expired'];
        
        // Hủy đơn -> Nhả tồn
        if (cancelStatuses.includes(nextStatus) && !cancelStatuses.includes(oldStatus)) {
            if (order.inventoryReserved) {
                await InventoryService.releaseStock(
                    order.carId, 
                    order.quantity || 1, 
                    order._id, 
                    `Hủy đơn hàng chưa cọc (lý do: ${updates.cancelled_reason || 'unknown'})`, 
                    actorId
                );
                updates.inventoryReserved = false;
                updates.inventoryReleasedAt = new Date();
            }
            else if (oldStatus === 'deposited' && order.inventoryPhysicalDeductedAt) {
                await InventoryService.releaseConfirmedDeposit(
                    order.carId,
                    order.quantity || 1,
                    order._id,
                    `Hủy đơn hàng đã cọc (lý do: ${updates.cancelled_reason || 'unknown'})`,
                    actorId
                );
                updates.inventoryPhysicalDeductedAt = null;
                updates.inventoryReleasedAt = new Date();
            }
        }

        // Phục hồi đơn -> Giữ tồn lại
        if (cancelStatuses.includes(oldStatus) && !cancelStatuses.includes(nextStatus)) {
            try {
                await InventoryService.reserveStock(
                    order.carId, 
                    order.quantity || 1, 
                    order._id, 
                    'Khôi phục đơn hàng bị hủy', 
                    actorId
                );
                updates.inventoryReserved = true;
                updates.inventoryReleasedAt = null;

                if (nextStatus === 'deposited') {
                    await InventoryService.confirmDeposit(
                        order.carId, 
                        order.quantity || 1, 
                        order._id, 
                        'Khôi phục đơn về trạng thái đã cọc', 
                        actorId
                    );
                    updates.inventoryReserved = false;
                    updates.inventoryPhysicalDeductedAt = new Date();
                }
            } catch (err) {
                throw new Error('Không đủ tồn kho để khôi phục đơn! Chi tiết: ' + err.message);
            }
        }

        // Trừ tồn kho vật lý khi Admin/Webhook xác nhận đã cọc (deposited)
        if (nextStatus === 'deposited' && oldStatus !== 'deposited') {
            if (order.inventoryReserved && !order.inventoryPhysicalDeductedAt) {
                await InventoryService.confirmDeposit(
                    order.carId, 
                    order.quantity || 1, 
                    order._id, 
                    'Xác nhận khách cọc tiền', 
                    actorId
                );
                updates.inventoryReserved = false;
                updates.inventoryPhysicalDeductedAt = new Date();
            }
        }

        // Mua thành công -> Bàn giao xe (DELIVER)
        if (nextStatus === 'purchased' && oldStatus !== 'purchased') {
            updates.purchasedAt = new Date();
            
            if (oldStatus === 'deposited') {
                await InventoryService.deliverStock(
                    order.carId, 
                    order.quantity || 1, 
                    order._id, 
                    'Bàn giao xe mua thành công', 
                    actorId
                );
            } 
            else if (order.inventoryReserved) {
                await InventoryService.confirmDeposit(
                    order.carId, 
                    order.quantity || 1, 
                    order._id, 
                    'Xác nhận cọc nhanh để giao xe', 
                    actorId
                );
                await InventoryService.deliverStock(
                    order.carId, 
                    order.quantity || 1, 
                    order._id, 
                    'Bàn giao xe mua thành công', 
                    actorId
                );
                updates.inventoryReserved = false;
                updates.inventoryPhysicalDeductedAt = new Date();
            }
        }

        updates.status = nextStatus;
        updates.updatedAt = new Date();

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            updates,
            { new: true, runValidators: true }
        );

        return updatedOrder;
    }
}

module.exports = OrderStatusService;
