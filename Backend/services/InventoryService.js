const Inventory = require('../models/inventory');
const InventoryTransaction = require('../models/inventoryTransaction');

class InventoryService {
    // Lấy danh sách tồn kho
    static async getInventoryList() {
        return await Inventory.find().populate('carObjectId', 'name URL Price');
    }

    // Lấy tồn kho theo mã xe
    static async getInventoryByCarCode(carCode) {
        return await Inventory.findOne({ carCode }).populate('carObjectId', 'name URL Price');
    }

    // Nhập hàng (atomic — chống race condition khi nhiều admin nhập đồng thời)
    static async importStock(carCode, quantity, reason, adminId) {
        if (quantity <= 0) throw new Error('Số lượng nhập phải lớn hơn 0');

        // Đọc snapshot TRƯỚC update để ghi transaction log
        const snapshotBefore = await Inventory.findOne({ carCode });
        if (!snapshotBefore) throw new Error('Không tìm thấy thông tin tồn kho cho mã xe này');

        const beforeTotal = snapshotBefore.totalQuantity || 0;
        const beforePhysical = snapshotBefore.physicalQuantity || 0;
        const beforeReserved = snapshotBefore.reservedQuantity || 0;
        const beforeAvailable = snapshotBefore.availableQuantity || 0;

        // Atomic update — dùng $inc để tránh ghi đè khi có concurrent request
        const updatedInventory = await Inventory.findOneAndUpdate(
            { carCode },
            {
                $inc: {
                    totalQuantity: quantity,
                    physicalQuantity: quantity,
                    availableQuantity: quantity
                },
                $set: { lastImportAt: new Date() }
            },
            { new: true, runValidators: true }
        );

        if (!updatedInventory) throw new Error('Không thể cập nhật tồn kho (lỗi atomic update)');

        const afterTotal = updatedInventory.totalQuantity || 0;
        const afterPhysical = updatedInventory.physicalQuantity || 0;
        const afterReserved = updatedInventory.reservedQuantity || 0;
        const afterAvailable = updatedInventory.availableQuantity || 0;

        // Ghi transaction log
        await InventoryTransaction.create({
            carCode,
            type: 'IMPORT',
            quantity,
            beforeTotal,
            afterTotal,
            beforePhysical,
            afterPhysical,
            beforeReserved,
            afterReserved,
            beforeAvailable,
            afterAvailable,
            reason: reason || 'Nhập hàng',
            createdBy: adminId
        });

        return updatedInventory;
    }

    // Giữ hàng (khi tạo đơn/chờ cọc)
    static async reserveStock(carCode, quantity, orderId, reason, adminId) {
        if (quantity <= 0) throw new Error('Số lượng giữ phải lớn hơn 0');

        const inventory = await Inventory.findOne({ carCode });
        if (!inventory) throw new Error('Không tìm thấy thông tin tồn kho cho xe này');

        const beforeTotal = inventory.totalQuantity || 0;
        const beforePhysical = inventory.physicalQuantity || 0;
        const beforeReserved = inventory.reservedQuantity || 0;
        const beforeAvailable = inventory.availableQuantity || 0;

        if (beforeAvailable < quantity) {
            throw new Error(`Kho không đủ số lượng khả dụng để giữ hàng. Tồn khả dụng hiện tại: ${beforeAvailable}`);
        }

        // Thực hiện atomic update chống oversell
        const updatedInventory = await Inventory.findOneAndUpdate(
            { 
                carCode, 
                availableQuantity: { $gte: quantity } 
            },
            {
                $inc: { 
                    availableQuantity: -quantity, 
                    reservedQuantity: quantity 
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedInventory) {
            throw new Error('Không đủ số lượng xe khả dụng (tranh chấp đồng thời). Vui lòng thử lại!');
        }

        const afterTotal = updatedInventory.totalQuantity || 0;
        const afterPhysical = updatedInventory.physicalQuantity || 0;
        const afterReserved = updatedInventory.reservedQuantity || 0;
        const afterAvailable = updatedInventory.availableQuantity || 0;

        // Ghi transaction log
        await InventoryTransaction.create({
            carCode,
            orderId,
            type: 'RESERVE',
            quantity,
            beforeTotal,
            afterTotal,
            beforePhysical,
            afterPhysical,
            beforeReserved,
            afterReserved,
            beforeAvailable,
            afterAvailable,
            reason: reason || 'Giữ hàng cho đơn hàng mới',
            createdBy: adminId
        });

        return updatedInventory;
    }

    // Nhả hàng (khi hủy đơn, hoàn cọc, hết hạn cọc) — atomic
    // NOTE: Đổi contract: reject lỗi khi reservedQuantity < quantity thay vì clamp Math.max(0,...)
    static async releaseStock(carCode, quantity, orderId, reason, adminId) {
        if (quantity <= 0) throw new Error('Số lượng nhả phải lớn hơn 0');

        // Đọc snapshot BEFORE
        const snapshotBefore = await Inventory.findOne({ carCode });
        if (!snapshotBefore) throw new Error('Không tìm thấy thông tin tồn kho cho dòng xe này');

        const beforeTotal = snapshotBefore.totalQuantity || 0;
        const beforePhysical = snapshotBefore.physicalQuantity || 0;
        const beforeReserved = snapshotBefore.reservedQuantity || 0;
        const beforeAvailable = snapshotBefore.availableQuantity || 0;

        // Atomic: chỉ update nếu reservedQuantity đủ
        const updatedInventory = await Inventory.findOneAndUpdate(
            { carCode, reservedQuantity: { $gte: quantity } },
            {
                $inc: {
                    reservedQuantity: -quantity,
                    availableQuantity: quantity
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedInventory) {
            throw new Error(`Không đủ số lượng giữ chỗ để nhả (reservedQuantity hiện tại: ${beforeReserved}, yêu cầu: ${quantity})`);
        }

        const afterTotal = updatedInventory.totalQuantity || 0;
        const afterPhysical = updatedInventory.physicalQuantity || 0;
        const afterReserved = updatedInventory.reservedQuantity || 0;
        const afterAvailable = updatedInventory.availableQuantity || 0;

        await InventoryTransaction.create({
            carCode,
            orderId,
            type: 'RELEASE',
            quantity,
            beforeTotal,
            afterTotal,
            beforePhysical,
            afterPhysical,
            beforeReserved,
            afterReserved,
            beforeAvailable,
            afterAvailable,
            reason: reason || 'Nhả hàng từ đơn đặt cọc',
            createdBy: adminId
        });

        return updatedInventory;
    }

    // Xác nhận đã đặt cọc xe (trừ giữ chỗ và trừ tồn kho vật lý) — atomic
    // NOTE: Đổi contract: reject lỗi khi physicalQuantity hay reservedQuantity < quantity
    static async confirmDeposit(carCode, quantity, orderId, reason, adminId) {
        if (quantity <= 0) throw new Error('Số lượng xác nhận cọc phải lớn hơn 0');

        // Đọc snapshot BEFORE
        const snapshotBefore = await Inventory.findOne({ carCode });
        if (!snapshotBefore) throw new Error('Không tìm thấy thông tin tồn kho cho dòng xe này');

        const beforeTotal = snapshotBefore.totalQuantity || 0;
        const beforePhysical = snapshotBefore.physicalQuantity || 0;
        const beforeReserved = snapshotBefore.reservedQuantity || 0;
        const beforeAvailable = snapshotBefore.availableQuantity || 0;

        // Atomic: chỉ update nếu cả physical và reserved đủ
        const updatedInventory = await Inventory.findOneAndUpdate(
            {
                carCode,
                physicalQuantity: { $gte: quantity },
                reservedQuantity: { $gte: quantity }
            },
            {
                $inc: {
                    physicalQuantity: -quantity,
                    reservedQuantity: -quantity
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedInventory) {
            throw new Error(`Không đủ tồn kho vật lý hoặc số lượng giữ chỗ để xác nhận cọc (physical: ${beforePhysical}, reserved: ${beforeReserved}, yêu cầu: ${quantity})`);
        }

        const afterTotal = updatedInventory.totalQuantity || 0;
        const afterPhysical = updatedInventory.physicalQuantity || 0;
        const afterReserved = updatedInventory.reservedQuantity || 0;
        const afterAvailable = updatedInventory.availableQuantity || 0;

        await InventoryTransaction.create({
            carCode,
            orderId,
            type: 'CONFIRM_DEPOSIT',
            quantity,
            beforeTotal,
            afterTotal,
            beforePhysical,
            afterPhysical,
            beforeReserved,
            afterReserved,
            beforeAvailable,
            afterAvailable,
            reason: reason || 'Xác nhận khách cọc thành công',
            createdBy: adminId
        });

        return updatedInventory;
    }

    // Xác nhận đã giao xe (khi hoàn thành toàn bộ đơn hàng) — atomic
    static async deliverStock(carCode, quantity, orderId, reason, adminId) {
        if (quantity <= 0) throw new Error('Số lượng giao xe phải lớn hơn 0');

        // Đọc snapshot BEFORE
        const snapshotBefore = await Inventory.findOne({ carCode });
        if (!snapshotBefore) throw new Error('Không tìm thấy thông tin tồn kho cho dòng xe này');

        const beforeTotal = snapshotBefore.totalQuantity || 0;
        const beforePhysical = snapshotBefore.physicalQuantity || 0;
        const beforeReserved = snapshotBefore.reservedQuantity || 0;
        const beforeAvailable = snapshotBefore.availableQuantity || 0;

        // Atomic: chỉ tăng soldQuantity
        const updatedInventory = await Inventory.findOneAndUpdate(
            { carCode },
            { $inc: { soldQuantity: quantity } },
            { new: true, runValidators: true }
        );

        if (!updatedInventory) throw new Error('Không thể cập nhật số lượng đã bán (lỗi atomic update)');

        const afterTotal = updatedInventory.totalQuantity || 0;
        const afterPhysical = updatedInventory.physicalQuantity || 0;
        const afterReserved = updatedInventory.reservedQuantity || 0;
        const afterAvailable = updatedInventory.availableQuantity || 0;

        await InventoryTransaction.create({
            carCode,
            orderId,
            type: 'DELIVER',
            quantity,
            beforeTotal,
            afterTotal,
            beforePhysical,
            afterPhysical,
            beforeReserved,
            afterReserved,
            beforeAvailable,
            afterAvailable,
            reason: reason || 'Đã bàn giao xe cho khách hàng',
            createdBy: adminId
        });

        return updatedInventory;
    }

    // Giữ tương thích ngược với tên hàm markSold cũ
    static async markSold(carCode, quantity, orderId, reason, adminId) {
        return await this.deliverStock(carCode, quantity, orderId, reason, adminId);
    }

    // Nhả hàng từ đơn đã đặt cọc bị hủy (hoàn lại kho vật lý và kho khả dụng) — atomic
    static async releaseConfirmedDeposit(carCode, quantity, orderId, reason, adminId) {
        if (quantity <= 0) throw new Error('Số lượng hoàn kho phải lớn hơn 0');

        // Đọc snapshot BEFORE
        const snapshotBefore = await Inventory.findOne({ carCode });
        if (!snapshotBefore) throw new Error('Không tìm thấy thông tin tồn kho cho dòng xe này');

        const beforeTotal = snapshotBefore.totalQuantity || 0;
        const beforePhysical = snapshotBefore.physicalQuantity || 0;
        const beforeReserved = snapshotBefore.reservedQuantity || 0;
        const beforeAvailable = snapshotBefore.availableQuantity || 0;

        // Atomic: tăng physical và available
        const updatedInventory = await Inventory.findOneAndUpdate(
            { carCode },
            {
                $inc: {
                    physicalQuantity: quantity,
                    availableQuantity: quantity
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedInventory) throw new Error('Không thể hoàn kho (lỗi atomic update)');

        const afterTotal = updatedInventory.totalQuantity || 0;
        const afterPhysical = updatedInventory.physicalQuantity || 0;
        const afterReserved = updatedInventory.reservedQuantity || 0;
        const afterAvailable = updatedInventory.availableQuantity || 0;

        await InventoryTransaction.create({
            carCode,
            orderId,
            type: 'RELEASE',
            quantity,
            beforeTotal,
            afterTotal,
            beforePhysical,
            afterPhysical,
            beforeReserved,
            afterReserved,
            beforeAvailable,
            afterAvailable,
            reason: reason || 'Hoàn kho từ đơn đặt cọc bị hủy',
            createdBy: adminId
        });

        return updatedInventory;
    }
}

module.exports = InventoryService;
