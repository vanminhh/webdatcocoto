const Order = require('../models/order');
const Car = require('../models/car');
const Customer = require('../models/customer');
const mongoose = require('mongoose');

const getMonthlyStats = async (req, res) => {
    try {
        const { month } = req.query; // format YYYY-MM
        
        let startDate, endDate;
        const now = new Date();
        if (month) {
            startDate = new Date(`${month}-01T00:00:00.000Z`);
            endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);
        } else {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        }

        // 1. Tổng xe (Total cars in system)
        const totalCars = await Car.countDocuments();

        // 2. Tổng khách hàng mới trong tháng
        const customersCount = await Customer.countDocuments({
            createdAt: { $gte: startDate, $lt: endDate }
        });

        // 3. Tổng đơn hàng trong tháng
        const ordersCount = await Order.countDocuments({
            createdAt: { $gte: startDate, $lt: endDate }
        });

        // 4. Tổng tiền cọc trong tháng (dựa vào confirmedAt)
        const depositsAgg = await Order.aggregate([
            {
                $match: {
                    status: { $in: ['deposited', 'purchased'] },
                    confirmedAt: { $gte: startDate, $lt: endDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalDeposit: { $sum: "$depositAmount" }
                }
            }
        ]);
        const depositsAmount = depositsAgg.length > 0 ? depositsAgg[0].totalDeposit : 0;

        // 5. Tổng doanh thu trong tháng (dựa vào purchasedAt)
        const revenueAgg = await Order.aggregate([
            {
                $match: {
                    status: 'purchased',
                    purchasedAt: { $gte: startDate, $lt: endDate }
                }
            },
            {
                $lookup: {
                    from: 'cars',
                    localField: 'carId',
                    foreignField: 'id',
                    as: 'carInfo'
                }
            },
            {
                $unwind: '$carInfo'
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $multiply: ["$carInfo.Price", "$quantity"] } }
                }
            }
        ]);
        const revenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

        // ─── CHARTS DATA ───

        // 6 tháng gần nhất cho orders/deposits by month
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        
        const ordersByMonthAgg = await Order.aggregate([
            {
                $match: { createdAt: { $gte: sixMonthsAgo } }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const depositsByMonthAgg = await Order.aggregate([
            {
                $match: { 
                    status: { $in: ['deposited', 'purchased'] },
                    confirmedAt: { $gte: sixMonthsAgo } 
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$confirmedAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Format ordersByMonth, depositsByMonth to ensure all 6 months are present
        const ordersByMonth = [];
        const depositsByMonth = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            
            const oMatch = ordersByMonthAgg.find(x => x._id === key);
            ordersByMonth.push({ key, count: oMatch ? oMatch.count : 0 });

            const dMatch = depositsByMonthAgg.find(x => x._id === key);
            depositsByMonth.push({ key, count: dMatch ? dMatch.count : 0 });
        }

        // topInterestedCars (top 8 cars in orders all time or this month? Assume all time to match previous logic)
        const topCarsAgg = await Order.aggregate([
            {
                $group: {
                    _id: "$carId",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 8 },
            {
                $lookup: {
                    from: 'cars',
                    localField: '_id',
                    foreignField: 'id',
                    as: 'carInfo'
                }
            },
            { $unwind: { path: '$carInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    carId: "$_id",
                    count: 1,
                    carName: { $ifNull: ["$carInfo.name", "$_id"] }
                }
            }
        ]);

        // carTypeDistribution
        const carTypeAgg = await Car.aggregate([
            {
                $group: {
                    _id: { $ifNull: ["$Type", "Khác"] },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            range: {
                from: startDate,
                to: endDate
            },
            cards: {
                totalCars,
                orders: ordersCount,
                customers: customersCount,
                depositsAmount,
                revenue
            },
            charts: {
                ordersByMonth,
                depositsByMonth,
                topInterestedCars: topCarsAgg,
                carTypeDistribution: carTypeAgg
            }
        });
    } catch (error) {
        console.error("Lỗi lấy dashboard stats:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getMonthlyStats
};
