const InventoryService = require('../services/InventoryService');
const InventoryTransaction = require('../models/inventoryTransaction');

exports.getInventoryList = async (req, res) => {
    try {
        const list = await InventoryService.getInventoryList();
        res.json(list);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getInventoryByCarCode = async (req, res) => {
    try {
        const inv = await InventoryService.getInventoryByCarCode(req.params.carCode);
        if (!inv) return res.status(404).json({ message: 'Không tìm thấy tồn kho cho mã xe này' });
        
        res.json({
            _id: inv._id,
            carCode: inv.carCode,
            carObjectId: inv.carObjectId,
            totalQuantity: inv.totalQuantity || 0,
            physicalQuantity: inv.physicalQuantity || 0,
            reservedQuantity: inv.reservedQuantity || 0,
            availableQuantity: inv.availableQuantity || 0,
            soldQuantity: inv.soldQuantity || 0,
            lastImportAt: inv.lastImportAt,
            createdAt: inv.createdAt,
            updatedAt: inv.updatedAt
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getInventoryTransactions = async (req, res) => {
    try {
        const trans = await InventoryTransaction.find({ carCode: req.params.carCode })
            .sort({ createdAt: -1 })
            .populate('createdBy', 'username email name')
            .populate('orderId', 'name phoneNumber status');
        res.json(trans);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.importStock = async (req, res) => {
    try {
        const { carCode, quantity, reason } = req.body;
        const adminId = req.user ? req.user.id || req.user._id || req.user.userId : null;
        
        if (!carCode || !quantity) {
            return res.status(400).json({ message: 'Thiếu mã xe hoặc số lượng nhập' });
        }

        const qtyNum = Number(quantity);
        if (isNaN(qtyNum) || qtyNum <= 0) {
            return res.status(400).json({ message: 'Số lượng nhập phải là số lớn hơn 0' });
        }

        const inv = await InventoryService.importStock(carCode, qtyNum, reason, adminId);
        
        res.status(200).json({
            message: 'Nhập hàng thành công',
            inventory: {
                _id: inv._id,
                carCode: inv.carCode,
                totalQuantity: inv.totalQuantity || 0,
                physicalQuantity: inv.physicalQuantity || 0,
                reservedQuantity: inv.reservedQuantity || 0,
                availableQuantity: inv.availableQuantity || 0,
                soldQuantity: inv.soldQuantity || 0,
                lastImportAt: inv.lastImportAt
            }
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
