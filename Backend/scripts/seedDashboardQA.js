const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const connectDB = require('../database');
const Car = require('../models/car');
const Inventory = require('../models/inventory');
const Order = require('../models/order');

async function seedData() {
    try {
        await connectDB();

        // 1. Dọn dẹp
        await Car.deleteMany({ id: { $in: ['CAR_A_QA', 'CAR_B_QA'] } });
        await Inventory.deleteMany({ carCode: { $in: ['CAR_A_QA', 'CAR_B_QA'] } });
        await Order.deleteMany({ carId: { $in: ['CAR_A_QA', 'CAR_B_QA'] } });

        // 2. Tạo 2 xe
        const carA = await Car.create({
            name: 'CAR_A QA Test',
            id: 'CAR_A_QA',
            URL: 'http://example.com/cara.png',
            Price: 500000000,
            Type: 'SEDAN',
            Fuel: 'GAS',
            seats: 5,
            availableQuantity: 10,
            stock: 10
        });

        const carB = await Car.create({
            name: 'CAR_B QA Test',
            id: 'CAR_B_QA',
            URL: 'http://example.com/carb.png',
            Price: 800000000,
            Type: 'SUV',
            Fuel: 'DIESEL',
            seats: 7,
            availableQuantity: 10,
            stock: 10
        });

        await Inventory.create({
            carCode: 'CAR_A_QA',
            carObjectId: carA._id,
            totalQuantity: 10, physicalQuantity: 10, availableQuantity: 10, reservedQuantity: 0, soldQuantity: 0
        });

        await Inventory.create({
            carCode: 'CAR_B_QA',
            carObjectId: carB._id,
            totalQuantity: 10, physicalQuantity: 10, availableQuantity: 10, reservedQuantity: 0, soldQuantity: 0
        });

        // 3. Tạo 4 đơn hàng
        const today = new Date();
        
        // Đơn 1: CAR_A purchased tháng này
        await Order.create({
            carId: 'CAR_A_QA',
            status: 'purchased',
            quantity: 1,
            depositAmount: 50000000,
            date: today,
            purchasedAt: today,
            createdAt: today,
            name: 'QA User 1', phoneNumber: '0900000001', email: 'qa1@test.com', city: 'HN', dealer: 'DL1'
        });

        // Đơn 2: CAR_B purchased tháng này
        await Order.create({
            carId: 'CAR_B_QA',
            status: 'purchased',
            quantity: 1,
            depositAmount: 80000000,
            date: today,
            purchasedAt: today,
            createdAt: today,
            name: 'QA User 2', phoneNumber: '0900000002', email: 'qa2@test.com', city: 'HN', dealer: 'DL1'
        });

        // Đơn 3: CAR_A deposited tháng này
        await Order.create({
            carId: 'CAR_A_QA',
            status: 'deposited',
            quantity: 1,
            depositAmount: 50000000,
            date: today,
            confirmedAt: today,
            createdAt: today,
            name: 'QA User 3', phoneNumber: '0900000003', email: 'qa3@test.com', city: 'HN', dealer: 'DL1'
        });

        // Đơn 4: CAR_B purchased 4 tháng trước
        const fourMonthsAgo = new Date();
        fourMonthsAgo.setMonth(today.getMonth() - 4);
        await Order.create({
            carId: 'CAR_B_QA',
            status: 'purchased',
            quantity: 1,
            depositAmount: 80000000,
            date: fourMonthsAgo,
            purchasedAt: fourMonthsAgo,
            createdAt: fourMonthsAgo,
            name: 'QA User 4', phoneNumber: '0900000004', email: 'qa4@test.com', city: 'HN', dealer: 'DL1'
        });

        console.log('Seed dữ liệu QA hoàn tất! (CAR_A_QA, CAR_B_QA và 4 orders)');
    } catch (error) {
        console.error('Lỗi seed data:', error);
    } finally {
        await mongoose.connection.close();
    }
}

seedData();
