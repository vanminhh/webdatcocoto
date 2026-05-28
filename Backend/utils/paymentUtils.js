const crypto = require('crypto');

/**
 * Tạo URL VietQR chuẩn
 */
const generateVietQR = ({ bankId, accountNo, accountName, amount, memo }) => {
    const baseUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png`;
    const params = new URLSearchParams({
        amount: amount.toString(),
        addInfo: memo,
        accountName: accountName
    });
    
    return `${baseUrl}?${params.toString()}`;
};

/**
 * Verify MoMo Signature
 */
const verifyMoMoSignature = (data, secretKey, expectedSignature) => {
    const {
        partnerCode, orderId, requestId, amount, orderInfo, 
        orderType, transId, resultCode, message, payType, responseTime, extraData
    } = data;
    
    const rawSignature = `accessKey=${process.env.MOMO_ACCESS_KEY}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    
    const signature = crypto.createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');
        
    return signature === expectedSignature;
};

/**
 * Verify ZaloPay MAC
 */
const verifyZaloPayMAC = (dataBuffer, reqSignature, key2) => {
    const mac = crypto.createHmac('sha256', key2)
        .update(dataBuffer)
        .digest('hex');
    return mac === reqSignature;
};

/**
 * Tạo mã đơn hàng ngắn gọn VD: N18-XXXXXX
 */
const generateOrderCode = () => {
    const length = 6;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'N18-';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

module.exports = {
    generateVietQR,
    verifyMoMoSignature,
    verifyZaloPayMAC,
    generateOrderCode
};
