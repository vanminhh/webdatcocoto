const PaymentService = require('../services/PaymentService');
const { verifyMoMoSignature, verifyZaloPayMAC } = require('../utils/paymentUtils');

class PaymentController {
    // [POST] /payment/create
    async createPayment(req, res) {
        try {
            const { orderId, method } = req.body;
            if (!orderId || !method) {
                return res.status(400).json({ success: false, message: 'Thiếu orderId hoặc method' });
            }
            
            const payment = await PaymentService.createPayment(orderId, method);
            return res.status(200).json({ success: true, data: payment });
        } catch (error) {
            console.error('Error creating payment:', error);
            return res.status(500).json({ success: false, message: error.message || 'Lỗi tạo thanh toán' });
        }
    }

    // [GET] /payment/status/:id
    async checkStatus(req, res) {
        try {
            const payment = await PaymentService.checkPaymentStatus(req.params.id);
            return res.status(200).json({ success: true, data: payment });
        } catch (error) {
            return res.status(404).json({ success: false, message: error.message });
        }
    }

    // [POST] /payment/webhook/momo
    async momoWebhook(req, res) {
        try {
            const data = req.body;
            console.log('MoMo Webhook received:', data);
            
            // Verify signature in real implementation here
            
            return res.status(204).send();
        } catch (error) {
            console.error('MoMo Webhook error:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    // [POST] /payment/webhook/zalopay
    async zalopayWebhook(req, res) {
        try {
            const data = req.body;
            console.log('ZaloPay Webhook received:', data);
            
            // Verify MAC in real implementation here
            
            return res.json({ return_code: 1, return_message: "success" });
        } catch (error) {
            console.error('ZaloPay Webhook error:', error);
            return res.status(500).json({ return_code: 0, return_message: error.message });
        }
    }

    // [POST] /payment/webhook/bank-transfer
    async bankTransferWebhook(req, res) {
        try {
            const data = req.body;
            console.log('Bank Webhook received:', data);

            // Xác thực chữ ký webhook (giả lập secret 'TEST_SECRET')
            const apiKey = req.headers['x-api-key'] || req.query.apiKey;
            if (apiKey !== process.env.BANK_WEBHOOK_SECRET && apiKey !== 'TEST_SECRET') {
                return res.status(401).json({ success: false, message: 'Invalid signature/API Key' });
            }

            const result = await PaymentService.processBankWebhook(data);
            return res.status(200).json({ success: true, message: 'Webhook processed', data: result });
        } catch (error) {
            console.error('Bank Webhook error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // [POST] /payment/mock-webhook
    async mockBankWebhook(req, res) {
        try {
            // Giả lập webhook call với TEST_SECRET
            const { orderCode, amount, transactionId } = req.body;
            
            const payload = {
                orderCode,
                amount,
                transactionId: transactionId || 'MOCK_TXN_' + Date.now(),
                transactionTime: new Date()
            };

            const result = await PaymentService.processBankWebhook(payload);
            return res.status(200).json({ success: true, message: 'Mock Webhook processed', data: result });
        } catch (error) {
            console.error('Mock Webhook error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // [POST] /api/sepay-webhook — Webhook từ SePay (tự động xác nhận thanh toán ngân hàng)
    async sePayWebhook(req, res) {
        try {
            const data = req.body;
            console.log('[SePay Webhook] Received:', JSON.stringify(data).substring(0, 500));

            // Xác thực API Key từ header Authorization: Apikey YOUR_KEY
            const authHeader = req.headers['authorization'] || '';
            const apiKey = authHeader.replace(/^Apikey\s+/i, '').trim();
            const expectedKey = process.env.SEPAY_WEBHOOK_APIKEY;

            if (expectedKey && expectedKey !== 'your_sepay_apikey_here' && apiKey !== expectedKey) {
                console.log(`[SePay Webhook] API Key không hợp lệ: "${apiKey}"`);
                return res.status(401).json({ success: false, message: 'Invalid API Key' });
            }

            const result = await PaymentService.processSePayWebhook(data);

            // SePay yêu cầu trả về { "success": true } với HTTP 200
            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('[SePay Webhook] Error:', error);
            // Vẫn trả 200 để SePay không retry liên tục khi lỗi logic
            return res.status(200).json({ success: true, message: error.message });
        }
    }

    // [POST] /payment/confirm-bank/:id
    async confirmBank(req, res) {
        try {
            const paymentId = req.params.id;
            const payment = await PaymentService.confirmBankTransfer(paymentId);
            return res.status(200).json({ success: true, message: "Xác nhận thành công", data: payment });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new PaymentController();
