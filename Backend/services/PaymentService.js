const Payment = require('../models/payment');
const Order = require('../models/order');
const OrderStatusService = require('./OrderStatusService');
const { generateVietQR, generateOrderCode } = require('../utils/paymentUtils');

class PaymentService {
    async createPayment(orderId, method) {
        const order = await Order.findById(orderId);
        if (!order) throw new Error("Order not found");
        if (order.status !== 'pending' && order.status !== 'pending_payment') {
            throw new Error("Đơn hàng không ở trạng thái chờ thanh toán");
        }

        // Check if there is already a pending payment
        let payment = await Payment.findOne({ orderId: order._id, status: { $in: ['pending', 'processing'] } });
        if (payment) {
             return payment; // Trả về payment hiện tại nếu còn hiệu lực
        }

        const amount = order.depositAmount || 20000000;
        const orderCode = generateOrderCode();
        
        await OrderStatusService.transitionStatus(order._id, 'pending_payment', 'system', null);

        let paymentData = {
            orderId: order._id,
            method,
            amount,
            orderCode,
            expiredAt: new Date(Date.now() + 15 * 60 * 1000), // 15 phút
            status: 'pending'
        };

        if (method === 'bank_transfer') {
            const memo = `${orderCode}`;
            paymentData.bankTransferNote = memo;
            paymentData.qrData = generateVietQR({
                bankId: process.env.BANK_ID || 'VCB',
                accountNo: process.env.BANK_ACCOUNT || '0123456789',
                accountName: process.env.BANK_NAME || 'CONG TY N18 AUTO',
                amount: amount,
                memo: memo
            });
        } else if (method === 'momo') {
            // Placeholder cho MoMo API redirect URL
            paymentData.paymentUrl = "https://test-payment.momo.vn/v2/gateway/pay?id=mock_momo_" + orderCode; 
        } else if (method === 'zalopay') {
            // Placeholder cho ZaloPay API redirect URL
            paymentData.paymentUrl = "https://sb-openapi.zalopay.vn/v2/create?id=mock_zlp_" + orderCode;
        }

        payment = new Payment(paymentData);
        await payment.save();

        order.paymentId = payment._id;
        await order.save();

        return payment;
    }

    async confirmBankTransfer(paymentId) {
        const payment = await Payment.findById(paymentId);
        if (!payment) throw new Error("Payment not found");
        if (payment.status !== 'pending' && payment.status !== 'processing') {
            throw new Error(`Payment is already ${payment.status}`);
        }

        payment.status = 'success';
        payment.paidAt = new Date();
        await payment.save();

        const order = await Order.findById(payment.orderId);
        if (order) {
            await OrderStatusService.transitionStatus(order._id, 'deposited', 'payment_webhook', payment._id.toString());
        }

        return payment;
    }

    async checkPaymentStatus(paymentId) {
        const payment = await Payment.findById(paymentId).populate('orderId', 'status name phoneNumber');
        if (!payment) throw new Error("Payment not found");
        return payment;
    }

    async expirePayments() {
        const now = new Date();
        const expiredPayments = await Payment.find({
            status: { $in: ['pending', 'processing'] },
            expiredAt: { $lt: now }
        });

        for (const payment of expiredPayments) {
            payment.status = 'expired';
            await payment.save();

            const order = await Order.findById(payment.orderId);
            if (order && order.status === 'pending_payment') {
                await OrderStatusService.transitionStatus(order._id, 'deposit_expired', 'cron', null);
            }
        }
    }

    async processBankWebhook(payload) {
        const { orderCode, amount, transactionId, transactionTime, rawCallback } = payload;
        
        // 1. Tìm payment khớp orderCode
        const payment = await Payment.findOne({ orderCode });
        if (!payment) throw new Error('Không tìm thấy giao dịch với orderCode này');

        // 2. Idempotency Check (D4)
        if (payment.status === 'success' || payment.callbackReceived || payment.transactionId === transactionId) {
            console.log(`Bỏ qua webhook trùng lặp cho giao dịch ${transactionId}`);
            return { message: 'Webhook đã được xử lý trước đó', payment };
        }

        payment.rawCallback = rawCallback || payload;
        payment.transactionId = transactionId;
        payment.callbackReceived = true;

        // 3. Match số tiền (D6)
        if (Number(amount) < Number(payment.amount)) {
            payment.status = 'processing'; // Đưa vào trạng thái đối soát thủ công
            payment.bankTransferNote = (payment.bankTransferNote || '') + ` [LỖI: Khách chuyển thiếu tiền. Nhận ${amount}, Yêu cầu ${payment.amount}]`;
            await payment.save();
            return { message: 'Cần đối soát thủ công do sai số tiền', payment };
        }

        // 4. Nếu quá thời gian hết hạn (expiredAt) mà vẫn thanh toán
        if (payment.expiredAt && new Date(transactionTime || Date.now()) > payment.expiredAt) {
            // Có thể xem xét chấp nhận nếu chưa huỷ hẳn đơn hàng, ở đây tạm chấp nhận
            console.log(`Giao dịch ${transactionId} thanh toán sau khi hết hạn payment.`);
        }

        // 5. Xác nhận thành công (D5)
        payment.status = 'success';
        payment.paidAt = new Date(transactionTime || Date.now());
        await payment.save();

        const order = await Order.findById(payment.orderId);
        if (order && order.status === 'pending_payment') {
            await OrderStatusService.transitionStatus(order._id, 'deposited', 'payment_webhook', payment._id.toString());
        }

        return payment;
    }

    /**
     * Xử lý webhook từ SePay — tự động xác nhận thanh toán khi ngân hàng nhận tiền
     * Payload SePay: { id, gateway, transactionDate, accountNumber, subAccount,
     *   code, content, transferType, description, transferAmount, accumulated, referenceCode }
     */
    async processSePayWebhook(payload) {
        const {
            id: sepayId,
            gateway,
            transactionDate,
            accountNumber,
            content,
            transferType,
            transferAmount,
            referenceCode,
            description
        } = payload;

        console.log(`[SePay] Nhận webhook: id=${sepayId}, gateway=${gateway}, amount=${transferAmount}, content="${content}"`);

        // 1. Chỉ xử lý giao dịch tiền VÀO
        if (transferType !== 'in') {
            console.log(`[SePay] Bỏ qua giao dịch tiền ra (transferType=${transferType})`);
            return { message: 'Bỏ qua giao dịch tiền ra', skipped: true };
        }

        // 2. Trích xuất orderCode (N18-XXXXXX) từ nội dung chuyển khoản
        const orderCodeMatch = (content || '').match(/N18-[A-Z0-9]{4,10}/i);
        if (!orderCodeMatch) {
            console.log(`[SePay] Không tìm thấy mã đơn hàng N18-xxx trong nội dung: "${content}"`);
            return { message: 'Không tìm thấy mã đơn hàng trong nội dung chuyển khoản', skipped: true };
        }
        const orderCode = orderCodeMatch[0].toUpperCase();
        console.log(`[SePay] Tìm thấy orderCode: ${orderCode}`);

        // 3. Tìm payment khớp orderCode
        const payment = await Payment.findOne({ orderCode });
        if (!payment) {
            console.log(`[SePay] Không tìm thấy payment với orderCode=${orderCode}`);
            return { message: `Không tìm thấy giao dịch với mã ${orderCode}`, skipped: true };
        }

        // 4. Idempotency — chống trùng lặp bằng SePay id
        const sepayTxnId = `SEPAY_${sepayId}`;
        if (payment.status === 'success') {
            console.log(`[SePay] Payment ${payment._id} đã được xác nhận trước đó`);
            return { message: 'Payment đã xác nhận', payment };
        }
        if (payment.transactionId === sepayTxnId) {
            console.log(`[SePay] Webhook trùng lặp cho SePay id=${sepayId}`);
            return { message: 'Webhook đã xử lý trước đó', payment };
        }

        // 5. Lưu thông tin callback từ SePay
        payment.rawCallback = payload;
        payment.transactionId = sepayTxnId;
        payment.callbackReceived = true;

        // 6. Kiểm tra số tiền
        if (Number(transferAmount) < Number(payment.amount)) {
            payment.status = 'processing'; // Cần đối soát thủ công
            payment.bankTransferNote = (payment.bankTransferNote || '') +
                ` [SEPAY: Khách chuyển thiếu. Nhận ${transferAmount}, Yêu cầu ${payment.amount}]`;
            await payment.save();
            console.log(`[SePay] Số tiền không khớp: nhận ${transferAmount}, yêu cầu ${payment.amount}`);
            return { message: 'Cần đối soát thủ công do thiếu tiền', payment };
        }

        // 7. Xác nhận thành công
        payment.status = 'success';
        payment.paidAt = new Date(transactionDate || Date.now());
        await payment.save();
        console.log(`[SePay] ✅ Payment ${payment._id} xác nhận thành công!`);

        // 8. Chuyển trạng thái đơn hàng
        const order = await Order.findById(payment.orderId);
        if (order && (order.status === 'pending_payment' || order.status === 'pending')) {
            await OrderStatusService.transitionStatus(order._id, 'deposited', 'sepay_webhook', payment._id.toString());
            console.log(`[SePay] ✅ Order ${order._id} chuyển sang deposited`);
        }

        return { message: 'Xác nhận thanh toán thành công', payment };
    }
}

module.exports = new PaymentService();
