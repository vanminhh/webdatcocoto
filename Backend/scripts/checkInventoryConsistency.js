const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const connectDB = require('../database');
const Car = require('../models/car');
const Inventory = require('../models/inventory');
const Order = require('../models/order');

async function checkConsistency() {
    console.log('==================================================');
    console.log('    🔍 KIỂM TRA TÍNH CÂN BẰNG & NHẤT QUÁN KHO 🔍  ');
    console.log('==================================================');

    try {
        await connectDB();

        const cars = await Car.find({});
        const inventories = await Inventory.find({});
        // Đơn hàng còn giữ chỗ kho ảo (chưa cọc chính thức)
        const activeOrders = await Order.find({ status: { $in: ['pending', 'pending_payment'] } });

        let issueCount = 0;

        console.log(`\n[1] Thống kê chung:`);
        console.log(`- Tổng số xe trong danh mục (Car):  ${cars.length}`);
        console.log(`- Tổng số bản ghi tồn kho (Inventory): ${inventories.length}`);
        console.log(`- Tổng số đơn hàng đang hoạt động:     ${activeOrders.length}`);

        // --- 1. KIỂM TRA CHỈ SỐ ÂM ---
        console.log(`\n[2] Kiểm tra tồn kho âm...`);
        for (const inv of inventories) {
            const hasNegative = 
                inv.availableQuantity < 0 || 
                inv.physicalQuantity < 0 || 
                inv.reservedQuantity < 0 || 
                inv.totalQuantity < 0 ||
                inv.soldQuantity < 0;

            if (hasNegative) {
                console.error(`❌ [LỖI] Xe ${inv.carCode} có chỉ số âm:`, {
                    total: inv.totalQuantity,
                    physical: inv.physicalQuantity,
                    available: inv.availableQuantity,
                    reserved: inv.reservedQuantity,
                    sold: inv.soldQuantity
                });
                issueCount++;
            }
        }
        if (issueCount === 0) console.log('   => OK: Không có chỉ số kho nào bị âm.');

        // --- 2. KIỂM TRA ĐỒNG BỘ CÔNG THỨC KHO ---
        console.log(`\n[3] Kiểm tra công thức cân bằng kho...`);
        let formulaIssue = 0;
        for (const inv of inventories) {
            const available = inv.availableQuantity || 0;
            const physical = inv.physicalQuantity || 0;
            const reserved = inv.reservedQuantity || 0;
            const total = inv.totalQuantity || 0;
            const sold = inv.soldQuantity || 0;

            // Công thức 1: available = physical - reserved
            if (available !== (physical - reserved)) {
                console.error(`❌ [LỖI] Lệch công thức khả dụng xe ${inv.carCode}: available (${available}) !== physical (${physical}) - reserved (${reserved})`);
                formulaIssue++;
                issueCount++;
            }

            // Công thức 2: total = physical + sold
            if (total !== (physical + sold)) {
                console.error(`❌ [LỖI] Lệch công thức tổng kho xe ${inv.carCode}: total (${total}) !== physical (${physical}) + sold (${sold})`);
                formulaIssue++;
                issueCount++;
            }
        }
        if (formulaIssue === 0) console.log('   => OK: Tất cả bản ghi Inventory đều tuân thủ công thức chuẩn.');

        // --- 3. KIỂM TRA MISMATCH CARCODE GIỮA CAR VÀ INVENTORY ---
        console.log(`\n[4] Kiểm tra đồng bộ mã xe (carCode)...`);
        let mismatchIssue = 0;
        
        // Car -> Inventory
        const carCodesInDb = new Set(cars.map(c => c.id).filter(Boolean));
        const invCodesInDb = new Set(inventories.map(i => i.carCode).filter(Boolean));

        for (const car of cars) {
            if (!car.id) {
                console.warn(`⚠️ [CẢNH BÁO] Xe "${car.name}" (_id: ${car._id}) không có trường 'id' (carCode).`);
                mismatchIssue++;
                issueCount++;
                continue;
            }
            if (!invCodesInDb.has(car.id)) {
                console.error(`❌ [LỖI] Xe "${car.name}" (carCode: ${car.id}) tồn tại trong danh mục nhưng CHƯA CÓ bản ghi Inventory.`);
                mismatchIssue++;
                issueCount++;
            }
        }

        // Inventory -> Car
        for (const inv of inventories) {
            if (!carCodesInDb.has(inv.carCode)) {
                console.error(`❌ [LỖI] Bản ghi Inventory mã "${inv.carCode}" tồn tại nhưng không tìm thấy xe tương ứng trong danh mục.`);
                mismatchIssue++;
                issueCount++;
            }
        }
        if (mismatchIssue === 0) console.log('   => OK: Đồng bộ mã xe giữa Car và Inventory hoàn hảo.');

        // --- 4. KIỂM TRA ĐƠN HÀNG HOẠT ĐỘNG CHƯA GIỮ CHỖ ---
        console.log(`\n[5] Kiểm tra đơn hàng hoạt động chưa giữ chỗ...`);
        let orderReserveIssue = 0;
        for (const order of activeOrders) {
            if (order.inventoryReserved !== true) {
                console.error(`❌ [LỖI] Đơn hàng ${order._id} (Trạng thái: ${order.status}, Xe: ${order.carId}) đang hoạt động nhưng chưa được đánh dấu giữ chỗ kho (inventoryReserved === false).`);
                orderReserveIssue++;
                issueCount++;
            }
        }
        if (orderReserveIssue === 0) console.log('   => OK: Tất cả đơn hàng hoạt động đều đã được giữ chỗ kho thành công.');

        // --- 5. KIỂM TRA LỆCH SỐ LƯỢNG GIỮ CHỖ (RESERVED) ---
        console.log(`\n[6] So sánh số lượng giữ chỗ (Reserved) so với đơn hàng thực tế...`);
        let reservedMatchIssue = 0;

        // Gom nhóm số lượng reserved của các đơn hàng active theo carId
        const activeOrderReservedMap = {};
        for (const order of activeOrders) {
            const cId = String(order.carId);
            const qty = order.quantity || 1;
            activeOrderReservedMap[cId] = (activeOrderReservedMap[cId] || 0) + qty;
        }

        for (const inv of inventories) {
            const expectedReserved = activeOrderReservedMap[inv.carCode] || 0;
            const actualReserved = inv.reservedQuantity || 0;

            if (expectedReserved !== actualReserved) {
                console.error(`❌ [LỖI] Lệch giữ chỗ xe ${inv.carCode}: Đơn hàng active yêu cầu giữ ${expectedReserved} xe, nhưng reservedQuantity trong Inventory là ${actualReserved}.`);
                reservedMatchIssue++;
                issueCount++;
            }
        }
        if (reservedMatchIssue === 0) console.log('   => OK: Số lượng giữ chỗ (Reserved) khớp hoàn toàn với các đơn hàng hoạt động.');

        console.log('\n==================================================');
        console.log('             📊 BÁO CÁO TỔNG HỢP 📊               ');
        console.log('==================================================');
        if (issueCount === 0) {
            console.log('✅ HỆ THỐNG KHO HOÀN TOÀN CÂN BẰNG VÀ NHẤT QUÁN.');
        } else {
            console.error(`❌ PHÁT HIỆN ${issueCount} VẤN ĐỀ CẦN XỬ LÝ (Xem chi tiết log ở trên).`);
        }
        console.log('==================================================');

    } catch (error) {
        console.error('❌ LỖI TRONG QUÁ TRÌNH KIỂM TRA:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Đã ngắt kết nối database.');
    }
}

checkConsistency();
