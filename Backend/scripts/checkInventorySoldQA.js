const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const connectDB = require('../database');
const Order = require('../models/order');
const Inventory = require('../models/inventory');
const OrderController = require('../Controllers/OrderController');

async function testInventorySold() {
    try {
        await connectDB();
        
        const carCode = 'CAR_A_QA';
        
        // Xem kho ban đầu
        const invBefore = await Inventory.findOne({ carCode });
        console.log(`Kho trước khi update: soldQuantity = ${invBefore.soldQuantity}`);
        
        // Tìm đơn hàng deposited
        const order = await Order.findOne({ carId: carCode, status: 'deposited' });
        if (!order) {
            console.log('Không tìm thấy đơn deposited nào!');
            return;
        }
        
        // Mock request & response để gọi Controller
        const req = {
            params: { id: order._id.toString() },
            body: { status: 'purchased' },
            user: { id: new mongoose.Types.ObjectId().toString(), role: 'admin' }
        };
        const res = {
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                this.data = data;
                return this;
            }
        };
        
        console.log('Đang gọi API chuyển Order -> purchased...');
        await OrderController.updateOrder(req, res);
        
        console.log('API Status Code:', res.statusCode);
        
        // Xem lại kho
        const invAfter = await Inventory.findOne({ carCode });
        console.log(`Kho sau khi update: soldQuantity = ${invAfter.soldQuantity}`);
        
        if (invAfter.soldQuantity === invBefore.soldQuantity + order.quantity) {
            console.log('✅ Cột "Xe đã bán" (soldQuantity) tăng đúng!');
        } else {
            console.log('❌ LỖI: soldQuantity không tăng đúng.');
        }

    } catch (error) {
        console.error('Lỗi check inventory sold:', error);
    } finally {
        await mongoose.connection.close();
    }
}

testInventorySold();
