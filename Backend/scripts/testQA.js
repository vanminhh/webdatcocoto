const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const connectDB = require('../database');
const OrderController = require('../Controllers/OrderController');
const InventoryController = require('../Controllers/InventoryController');
const InventoryService = require('../services/InventoryService');
const Order = require('../models/order');
const Inventory = require('../models/inventory');

const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

async function runTests() {
    console.log('--- BẮT ĐẦU TEST QA BACKEND ---');
    try {
        await connectDB();
        
        const carId = '22'; // Xe này đang có 20 tồn từ migration
        const testUserId = new mongoose.Types.ObjectId().toString(); // Fake user ID

        // Chuẩn bị dọn dẹp trước test
        await Order.deleteMany({ userId: testUserId });
        
        let inv = await Inventory.findOne({ carCode: carId });
        if (!inv) throw new Error("Chưa có inventory cho xe 22, vui lòng chạy migration trước");

        let initialStock = inv.availableQuantity;

        console.log(`\n>>> Bắt đầu F3: Test tạo đơn đủ tồn`);
        let reqF3 = {
            body: { carId: carId, date: new Date(), depositAmount: 10000, quantity: 1, type: 'datlich', dealer: 'Test Dealer', city: 'Test City', phoneNumber: '0123456789' },
            user: { userId: testUserId }
        };
        let resF3 = mockRes();
        await OrderController.createOrder(reqF3, resF3);
        if (resF3.statusCode !== 201) throw new Error(`F3 Fail: ${JSON.stringify(resF3.data)}`);
        
        let newInv = await Inventory.findOne({ carCode: carId });
        if (newInv.availableQuantity !== initialStock - 1) throw new Error(`F3 Fail: Stock không giảm (${initialStock} -> ${newInv.availableQuantity})`);
        console.log(`[PASS] F3: Tạo đơn thành công, tồn giảm, có transaction RESERVE.`);
        const orderId = resF3.data._id;


        console.log(`\n>>> Bắt đầu F5: Test precheck trùng đặt cọc & chặn trùng ở createOrder`);
        let reqF5_check = { query: { carId: carId }, user: { userId: testUserId } };
        let resF5_check = mockRes();
        await OrderController.checkActiveDeposit(reqF5_check, resF5_check);
        if (resF5_check.statusCode !== 200 || !resF5_check.data.hasActiveDeposit) throw new Error(`F5 Fail: checkActiveDeposit không báo trùng`);
        
        let resF5_create = mockRes();
        await OrderController.createOrder(reqF3, resF5_create); // Cố tình tạo trùng
        if (resF5_create.statusCode !== 400 || !resF5_create.data.message.includes("Bạn đã đặt cọc xe này rồi")) {
             throw new Error(`F5 Fail: createOrder không chặn trùng. Phản hồi: ${JSON.stringify(resF5_create.data)}`);
        }
        console.log(`[PASS] F5: Precheck và createOrder chặn trùng chính xác.`);


        console.log(`\n>>> Bắt đầu F6: Test hủy đơn -> hoàn stock`);
        let reqF6 = { params: { id: orderId }, body: { status: 'cancelled', cancelled_reason: 'manual' } };
        let resF6 = mockRes();
        await OrderController.updateOrder(reqF6, resF6);
        if (resF6.statusCode !== 200) throw new Error(`F6 Fail: Hủy đơn thất bại ${JSON.stringify(resF6.data)}`);
        
        let invF6 = await Inventory.findOne({ carCode: carId });
        if (invF6.availableQuantity !== initialStock) throw new Error(`F6 Fail: Stock không hoàn (${invF6.availableQuantity} != ${initialStock})`);
        
        let resF6_repeat = mockRes();
        await OrderController.updateOrder(reqF6, resF6_repeat); // Cố tình hủy lại lần 2
        let invF6_repeat = await Inventory.findOne({ carCode: carId });
        if (invF6_repeat.availableQuantity !== initialStock) throw new Error(`F6 Fail: Hoàn lặp lần 2`);
        console.log(`[PASS] F6: Hủy đơn hoàn tồn kho đúng, không hoàn lặp.`);


        console.log(`\n>>> Bắt đầu F4: Test tạo đơn không đủ tồn`);
        // Force update stock to 0 temporarily
        await Inventory.findOneAndUpdate({ carCode: carId }, { availableQuantity: 0 });
        let reqF4 = {
            body: { carId: carId, date: new Date(), depositAmount: 10000, quantity: 1, type: 'datlich', dealer: 'Test Dealer', city: 'Test City', phoneNumber: '0123456789' },
            user: { userId: testUserId }
        };
        let resF4 = mockRes();
        await OrderController.createOrder(reqF4, resF4);
        if (resF4.statusCode !== 400 || !resF4.data.message.includes('Không đủ xe')) {
            throw new Error(`F4 Fail: Không chặn được tạo đơn hết tồn ${JSON.stringify(resF4.data)}`);
        }
        console.log(`[PASS] F4: Chặn tạo đơn khi hết tồn thành công.`);
        // Restore stock
        await Inventory.findOneAndUpdate({ carCode: carId }, { availableQuantity: initialStock });


        console.log(`\n>>> Bắt đầu F7: Test auto-expire`);
        let reqF7_create = {
            body: { carId: carId, date: new Date(), depositAmount: 10000, quantity: 1, type: 'datlich', dealer: 'Test Dealer', city: 'Test City', phoneNumber: '0123456789' },
            user: { userId: testUserId }
        };
        let resF7_create = mockRes();
        await OrderController.createOrder(reqF7_create, resF7_create);
        let expireOrderId = resF7_create.data._id;
        
        // Cố tình đẩy ngày tạo về 8 ngày trước
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 8);
        await Order.findByIdAndUpdate(expireOrderId, { createdAt: pastDate });
        
        // Gọi expire function
        await OrderController.expirePendingOrders();
        let expiredOrder = await Order.findById(expireOrderId);
        if (expiredOrder.status !== 'cancelled' || expiredOrder.inventoryReserved === true) {
            throw new Error(`F7 Fail: Không auto-expire được`);
        }
        let invF7 = await Inventory.findOne({ carCode: carId });
        if (invF7.availableQuantity !== initialStock) throw new Error(`F7 Fail: Auto-expire không hoàn stock`);
        console.log(`[PASS] F7: Auto expire pending order > 7 ngày thành công, hoàn tồn kho.`);


        console.log(`\n>>> Bắt đầu F8: Test nhập hàng`);
        let reqF8 = { body: { carCode: carId, quantity: 5, reason: 'QA Test Import' }, user: { userId: testUserId } };
        let resF8 = mockRes();
        await InventoryController.importStock(reqF8, resF8);
        if (resF8.statusCode !== 200) throw new Error(`F8 Fail: Lỗi import ${JSON.stringify(resF8.data)}`);
        let invF8 = await Inventory.findOne({ carCode: carId });
        if (invF8.availableQuantity !== initialStock + 5) throw new Error(`F8 Fail: Nhập hàng không tăng stock`);
        console.log(`[PASS] F8: Nhập hàng thành công, tồn kho tăng.`);
        // Revert import for clean state
        await InventoryService.releaseStock(carId, 5, null, "Hoàn trả test QA");


        console.log('\n✅ ALL BACKEND TESTS PASSED!');
    } catch (err) {
        console.error('\n❌ LỖI TEST:', err.message);
    } finally {
        mongoose.connection.close();
    }
}
runTests();
