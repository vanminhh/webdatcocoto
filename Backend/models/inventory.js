const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    carCode: { type: String, required: true, unique: true },
    carObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
    totalQuantity: { type: Number, default: 0, min: [0, 'Total quantity cannot be negative'] },
    physicalQuantity: { type: Number, default: 0, min: [0, 'Physical quantity cannot be negative'] },
    availableQuantity: { type: Number, default: 0, min: [0, 'Available quantity cannot be negative'] },
    reservedQuantity: { type: Number, default: 0, min: [0, 'Reserved quantity cannot be negative'] },
    soldQuantity: { type: Number, default: 0, min: [0, 'Sold quantity cannot be negative'] },
    lastImportAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Inventory', inventorySchema);
