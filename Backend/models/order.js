const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    name: { type: String },
    email: { type: String },
    phoneNumber: { type: String, required: true },
    carId: { type: String, required: true },
    date: { type: Date, required: true },
    city: { type: String, required: true },
    dealer: { type: String, required: true },
    type: { type: String, enum: ['datlich', 'dangky'], default: 'datlich' },
    quantity: { type: Number, default: 1, min: 1, max: 5 },
    userId: { type: String, default: null },

    // ─── E-Commerce fields ───
    status: {
        type: String,
        enum: ['pending', 'pending_payment', 'deposited', 'purchased', 'cancelled', 'deposit_expired'],
        default: 'pending'
    },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'payment', default: null },
    depositAmount: { type: Number, default: 0 },
    penaltyAmount: { type: Number, default: 0 },
    refundAmount: { type: Number, default: 0 },
    forfeitedDeposit: { type: Number, default: 0 },  // Cọc bị giữ lại khi hết hạn (doanh thu)
    forfeitedAt: { type: Date, default: null },
    deadline: { type: Date },
    deposit_expire_date: { type: Date, default: null },
    cancelled_reason: { type: String, default: null },
    confirmedAt: { type: Date },
    purchasedAt: { type: Date },
    note: { type: String, default: '' },
    inventoryReserved: { type: Boolean, default: false },
    inventoryReleasedAt: { type: Date, default: null },
    inventoryPhysicalDeductedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Auto-update updatedAt on save
OrderSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model("order", OrderSchema);