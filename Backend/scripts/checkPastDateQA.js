const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const connectDB = require('../database');
const OrderController = require('../Controllers/OrderController');

async function testPastDate() {
    try {
        await connectDB();
        
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 5); // 5 ngày trước
        
        const req = {
            body: {
                carId: 'CAR_A_QA',
                date: pastDate,
                depositAmount: 50000000,
                quantity: 1,
                type: 'datlich',
                dealer: 'N18 CS1',
                city: 'Hà Nội',
                phoneNumber: '0900000009',
                name: 'User QA Past Date',
                email: 'qapast@example.com'
            },
            user: { userId: new mongoose.Types.ObjectId().toString(), role: 'user' }
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

        console.log('Đang thử đặt lịch với ngày trong quá khứ:', pastDate);
        await OrderController.createOrder(req, res);
        
        console.log('Status Code:', res.statusCode);
        console.log('Response:', res.data);
        
        if (res.statusCode === 400 && res.data.message.includes('quá khứ')) {
            console.log('✅ ĐẠT: Backend đã từ chối ngày quá khứ hợp lệ.');
        } else {
            console.log('❌ LỖI: Backend không chặn ngày quá khứ hoặc báo lỗi sai.');
        }

    } catch (error) {
        console.error('Lỗi check past date:', error);
    } finally {
        await mongoose.connection.close();
    }
}

testPastDate();
