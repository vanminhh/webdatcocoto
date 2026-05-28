const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require("cors");
const session = require("express-session");
const passport = require("./passport");
const connectDB = require("./database");
const userRoute = require("./Routes/UserRoute");
const authRoute = require("./Routes/AuthRoute");
const carRoute = require("./Routes/CarRoute");
const cusRoute = require("./Routes/CustomerRoute");
const orderRoute = require("./Routes/OrderRoute");
const paymentRoute = require("./Routes/PaymentRoute");
const inventoryRoute = require("./Routes/InventoryRoute");
const dashboardRoute = require("./Routes/DashboardRoute");

const cron = require('node-cron');
const { expirePendingOrders, expireDepositOrders, cleanupCancelledOrders } = require('./Controllers/OrderController');
const PaymentService = require('./services/PaymentService');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
    origin: "http://localhost:4000", // Thay đổi nếu frontend chạy ở domain khác
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"] // Cho phép header Authorization
}));
app.use(express.json());

connectDB();

//Check .env
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, "../Frontend"))); // Serve all static files from the Frontend directory
app.use(express.static(path.join(__dirname, "../Frontend/javascript")));
app.use(express.static(path.join(__dirname, "../Frontend/stylecss")));
app.use(express.static(path.join(__dirname, "../Frontend/image")));

// Redirect root to index.html
app.get("/", (req, res) => {
    res.redirect("/index.html");
});
app.use("/auth", authRoute);
app.use("/user", userRoute);
app.use("/api", carRoute);
app.use("/customer", cusRoute);
app.use("/order", orderRoute);
app.use("/payment", paymentRoute);
app.use("/inventory", inventoryRoute);
app.use("/dashboard", dashboardRoute);

// SePay Webhook — route riêng theo URL đã đăng ký trên SePay dashboard
const PaymentController = require('./Controllers/PaymentController');
app.post("/api/sepay-webhook", PaymentController.sePayWebhook);

app.listen(PORT, () => {
    console.log(`*Server is running at: http://localhost:${PORT}`);
});

// ═══════════════════════════════════════
// CRON JOBS — Tự động xử lý đơn hàng
// ═══════════════════════════════════════

// Mỗi ngày 00:00: Expire pending > 7 ngày + Expire deposit quá hạn
cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Chạy auto-expire...');
    try {
        const p = await expirePendingOrders();
        const d = await expireDepositOrders();
        console.log(`[CRON] Kết quả: ${p} pending hết hạn, ${d} deposit hết hạn`);
    } catch (e) {
        console.error('[CRON] Lỗi auto-expire:', e.message);
    }
});

// Ngày 1 mỗi tháng lúc 01:00: Dọn dẹp đơn cancelled > 6 tháng
cron.schedule('0 1 1 * *', async () => {
    console.log('[CRON] Chạy cleanup cancelled...');
    try {
        const count = await cleanupCancelledOrders();
        console.log(`[CRON] Đã xóa ${count} đơn cancelled cũ`);
    } catch (e) {
        console.error('[CRON] Lỗi cleanup:', e.message);
    }
});

// Mỗi 5 phút check expire payment
cron.schedule('*/5 * * * *', async () => {
    try {
        await PaymentService.expirePayments();
    } catch (e) {
        console.error('[CRON] Lỗi expirePayments:', e.message);
    }
});