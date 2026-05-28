const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'order', required: true },
    method: {
        type: String,
        enum: ['bank_transfer', 'momo', 'zalopay'],
        required: true
    },
    amount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'processing', 'success', 'failed', 'expired'],
        default: 'pending'
    },

    // ─── Mã giao dịch ───
    orderCode: { type: String, unique: true },          // Mã ngắn gọn nội bộ (VD: N18-XXXXXX)
    transactionId: { type: String, default: null },       // Mã giao dịch bên thứ 3 (MoMo/ZaloPay/Bank)

    // ─── QR ngân hàng ───
    qrData: { type: String, default: null },              // URL VietQR image
    bankTransferNote: { type: String, default: null },    // Nội dung chuyển khoản

    // ─── MoMo / ZaloPay ───
    paymentUrl: { type: String, default: null },          // Link thanh toán redirect
    requestId: { type: String, default: null },           // requestId gửi lên MoMo/ZaloPay

    // ─── Security & Anti-duplicate ───
    signature: { type: String, default: null },           // Checksum đã verify
    callbackReceived: { type: Boolean, default: false },  // Chống callback trùng
    rawCallback: { type: mongoose.Schema.Types.Mixed, default: null }, // Lưu raw callback data

    // ─── Timestamps ───
    expiredAt: { type: Date, required: true },            // Thời gian hết hạn payment (15 phút)
    paidAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Auto-update updatedAt on save
PaymentSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Index cho query nhanh
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ status: 1, expiredAt: 1 });

module.exports = mongoose.model('Payment', PaymentSchema);
