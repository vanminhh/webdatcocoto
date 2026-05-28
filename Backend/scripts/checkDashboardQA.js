const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const connectDB = require('../database');
const DashboardController = require('../Controllers/DashboardController');

async function testDashboard() {
    try {
        await connectDB();
        
        const req = {
            query: {
                month: '2026-05'
            }
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

        await DashboardController.getMonthlyStats(req, res);
        
        console.log('Status Code:', res.statusCode);
        console.log('Cards:', JSON.stringify(res.data.cards, null, 2));
        
        const cards = res.data.cards;
        
        let pass = true;
        // Kiểm tra doanh thu
        if (cards.totalRevenue.value < 1300000000) {
            console.log('❌ Doanh thu không khớp. Kỳ vọng chứa Xe A 500tr + Xe B 800tr = 1300tr');
            pass = false;
        } else {
            console.log('✅ Doanh thu OK');
        }

    } catch (error) {
        console.error('Lỗi check dashboard:', error);
    } finally {
        await mongoose.connection.close();
    }
}

testDashboard();
