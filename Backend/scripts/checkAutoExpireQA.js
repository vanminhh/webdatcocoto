const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const connectDB = require('../database');
const Order = require('../models/order');
const Inventory = require('../models/inventory');
const OrderController = require('../Controllers/OrderController');

async function testAutoExpire() {
    try {
        await connectDB();
        
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 2); // 2 ngày trước
        
        // Dọn dẹp trước đó
        await Order.deleteMany({ email: 'expire1@test.com' });
        await Order.deleteMany({ email: 'expire2@test.com' });
        
        // Clean up ghost expired orders from previous tests
        const now = new Date();
        await Order.deleteMany({
            status: 'deposited',
            deposit_expire_date: { $lte: now, $ne: null }
        });
        
        // Lấy tồn kho trước
        const invBefore = await Inventory.findOne({ carCode: 'CAR_A_QA' });
        
        // 1. Đơn deposited quá hạn
        const order1 = await Order.create({
            carId: 'CAR_A_QA',
            status: 'deposited',
            quantity: 1,
            depositAmount: 50000000,
            date: new Date(),
            deposit_expire_date: pastDate,
            name: 'Expire QA 1', email: 'expire1@test.com', phoneNumber: '0900000091', city: 'HN', dealer: 'DL1',
            inventoryPhysicalDeductedAt: new Date(),
            inventoryReserved: false
        });

        // 2. Đơn purchased quá hạn cọc (để xem có bị expire nhầm không)
        const order2 = await Order.create({
            carId: 'CAR_A_QA',
            status: 'purchased',
            quantity: 1,
            depositAmount: 50000000,
            date: new Date(),
            deposit_expire_date: pastDate,
            name: 'Expire QA 2', email: 'expire2@test.com', phoneNumber: '0900000092', city: 'HN', dealer: 'DL1',
            inventoryPhysicalDeductedAt: new Date(),
            inventoryReserved: false
        });
        
        const req = {};
        const res = {
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) { this.data = data; return this; }
        };

        console.log('Gọi API auto-expire...');
        await OrderController.autoExpireAll(req, res);
        
        console.log('API Status Code:', res.statusCode);
        console.log('Response:', res.data);
        
        const checkOrder1 = await Order.findById(order1._id);
        const checkOrder2 = await Order.findById(order2._id);
        
        if (checkOrder1.status === 'deposit_expired') {
            console.log('✅ ĐẠT: Đơn deposited quá hạn đã chuyển sang deposit_expired.');
        } else {
            console.log('❌ LỖI: Đơn deposited không chuyển sang deposit_expired. Hiện tại:', checkOrder1.status);
        }
        
        if (checkOrder2.status === 'purchased') {
            console.log('✅ ĐẠT: Đơn purchased KHÔNG bị auto-expire nhầm.');
        } else {
            console.log('❌ LỖI: Đơn purchased bị đổi status. Hiện tại:', checkOrder2.status);
        }
        
        const invAfter = await Inventory.findOne({ carCode: 'CAR_A_QA' });
        // availableQuantity = availableQuantity_before + order1.quantity (vì order1 expired, hoàn tồn kho vật lý -> cộng vào available)
        // Wait: releaseConfirmedDeposit cộng vào physicalQuantity và availableQuantity.
        if (invAfter.availableQuantity === invBefore.availableQuantity + 1) {
            console.log('✅ ĐẠT: Tồn kho đã được hoàn lại đúng.');
        } else {
            console.log(`❌ LỖI: Tồn kho hoàn không đúng. Trước: ${invBefore.availableQuantity}, Sau: ${invAfter.availableQuantity}`);
        }

    } catch (error) {
        console.error('Lỗi check auto expire:', error);
    } finally {
        await mongoose.connection.close();
    }
}

testAutoExpire();
