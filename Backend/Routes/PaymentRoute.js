const express = require('express');
const router = express.Router();
const PaymentController = require('../Controllers/PaymentController');

router.post('/create', PaymentController.createPayment);
router.get('/status/:id', PaymentController.checkStatus);
router.post('/webhook/momo', PaymentController.momoWebhook);
router.post('/webhook/zalopay', PaymentController.zalopayWebhook);
router.post('/webhook/bank-transfer', PaymentController.bankTransferWebhook);
router.post('/mock-webhook', PaymentController.mockBankWebhook);
router.post('/confirm-bank/:id', PaymentController.confirmBank);

module.exports = router;
