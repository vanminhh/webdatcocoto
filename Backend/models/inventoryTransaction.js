const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema({
    carCode: { type: String, required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'order', default: null },
    type: {
        type: String,
        enum: ['IMPORT', 'RESERVE', 'RELEASE', 'CONFIRM_DEPOSIT', 'DELIVER', 'ADJUSTMENT', 'MIGRATION'],
        required: true
    },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be greater than 0'] },
    
    beforeTotal: { type: Number, required: true, min: [0, 'beforeTotal cannot be negative'] },
    afterTotal: { type: Number, required: true, min: [0, 'afterTotal cannot be negative'] },
    
    beforePhysical: { type: Number, required: true, min: [0, 'beforePhysical cannot be negative'] },
    afterPhysical: { type: Number, required: true, min: [0, 'afterPhysical cannot be negative'] },
    
    beforeReserved: { type: Number, required: true, min: [0, 'beforeReserved cannot be negative'] },
    afterReserved: { type: Number, required: true, min: [0, 'afterReserved cannot be negative'] },
    
    beforeAvailable: { type: Number, required: true, min: [0, 'beforeAvailable cannot be negative'] },
    afterAvailable: { type: Number, required: true, min: [0, 'afterAvailable cannot be negative'] },
    
    reason: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

// Tạo indexes
inventoryTransactionSchema.index({ carCode: 1, createdAt: -1 });
inventoryTransactionSchema.index({ orderId: 1 });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
