document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');

    if (!orderId) {
        alert("Không tìm thấy mã đơn hàng");
        window.location.href = '/';
        return;
    }

    const orderDetailsEl = document.getElementById('orderDetails');
    const btnCreatePayment = document.getElementById('btnCreatePayment');
    const paymentAction = document.getElementById('paymentAction');
    const paymentStatusBox = document.getElementById('paymentStatusBox');
    const qrContainer = document.getElementById('qrContainer');
    const qrImage = document.getElementById('qrImage');
    const transferAmount = document.getElementById('transferAmount');
    const transferNote = document.getElementById('transferNote');
    const paymentMethodsSection = document.getElementById('paymentMethodsSection');

    let currentPaymentId = null;
    let pollingInterval = null;

    const formatCurrency = (number) => {
        return new Intl.NumberFormat('vi-VN').format(number);
    };

    // ── Fetch thông tin đơn hàng từ API ──
    async function loadOrderDetails() {
        try {
            const token = localStorage.getItem('token') || '';
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`/order/${orderId}`, { headers });
            if (!res.ok) throw new Error('Không tìm thấy đơn');

            const order = await res.json();
            renderOrderDetails(order);
        } catch (err) {
            console.error('Lỗi load order:', err);
            // Fallback: chỉ hiện mã đơn
            orderDetailsEl.innerHTML = `
                <div class="order-row"><span>Mã đặt cọc:</span> <span>${orderId.slice(-8).toUpperCase()}</span></div>
                <div class="order-row"><span>Loại:</span> <span>Đặt cọc xe</span></div>
            `;
        }
    }

    function renderOrderDetails(order) {
        const shortId = (order._id || orderId).slice(-8).toUpperCase();
        const typeLabel = order.type === 'datlich' ? 'Đặt lịch xem xe' : 'Đặt mua xe';
        const dateStr = order.date
            ? new Date(order.date).toLocaleDateString('vi-VN')
            : '—';
        const createdStr = order.createdAt
            ? new Date(order.createdAt).toLocaleDateString('vi-VN')
            : '—';
        const deposit = order.depositAmount || 0;
        const qty = order.quantity || 1;

        // Ảnh xe nếu có
        const carImgHTML = order.carImage
            ? `<img src="${order.carImage}" alt="${order.carName || 'Xe'}"
                style="width:100%;height:140px;object-fit:cover;border-radius:8px;margin-bottom:16px;"
                onerror="this.style.display='none'">`
            : '';

        orderDetailsEl.innerHTML = `
            ${carImgHTML}
            <div class="order-row">
                <span>Mã đặt cọc:</span>
                <span style="font-family:monospace;letter-spacing:1px;">${shortId}</span>
            </div>
            <div class="order-row">
                <span>Loại:</span>
                <span style="color:#e02424;font-weight:600;">${typeLabel}</span>
            </div>
            <div class="order-row">
                <span>Xe:</span>
                <span style="font-weight:600;">${order.carName || '—'}</span>
            </div>
            <div class="order-row">
                <span>Khách hàng:</span>
                <span>${order.name || '—'}</span>
            </div>
            <div class="order-row">
                <span>Email:</span>
                <span>${order.email || '—'}</span>
            </div>
            <div class="order-row">
                <span>SĐT:</span>
                <span>${order.phoneNumber || '—'}</span>
            </div>
            ${order.city ? `<div class="order-row"><span>Tỉnh/Thành:</span><span>${order.city}</span></div>` : ''}
            ${order.date ? `<div class="order-row"><span>Ngày hẹn:</span><span>${dateStr}</span></div>` : ''}
            <div class="order-row">
                <span>Ngày tạo đơn:</span>
                <span>${createdStr}</span>
            </div>
            ${qty > 1 ? `<div class="order-row"><span>Số lượng:</span><span>${qty} xe</span></div>` : ''}
            <div class="order-row" style="border-top:2px solid #333;margin-top:8px;padding-top:16px;font-size:1.15em;font-weight:700;color:#e02424;">
                <span>Tổng tiền cọc:</span>
                <span>${formatCurrency(deposit * qty)} VND</span>
            </div>
        `;
    }

    // Gọi ngay khi trang load
    loadOrderDetails();



    // Copy to clipboard
    transferNote.addEventListener('click', () => {
        navigator.clipboard.writeText(transferNote.innerText);
        alert("Đã copy nội dung chuyển khoản!");
    });

    btnCreatePayment.addEventListener('click', async () => {
        const selectedMethodElement = document.querySelector('input[name="paymentMethod"]:checked');
        if(!selectedMethodElement) {
            alert('Vui lòng chọn cổng thanh toán');
            return;
        }
        const selectedMethod = selectedMethodElement.value;
        
        btnCreatePayment.disabled = true;
        btnCreatePayment.innerText = "Đang xử lý...";

        try {
            const token = localStorage.getItem('token') || '';
            const headers = { 'Content-Type': 'application/json' };
            if(token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch('/payment/create', {
                method: 'POST',
                headers,
                body: JSON.stringify({ orderId, method: selectedMethod })
            });

            const result = await response.json();
            
            if (!result.success) {
                alert(result.message || "Lỗi tạo thanh toán");
                btnCreatePayment.disabled = false;
                btnCreatePayment.innerText = "Tiến hành thanh toán";
                return;
            }

            const payment = result.data;
            currentPaymentId = payment._id;

            paymentMethodsSection.classList.add('hidden');
            paymentAction.classList.remove('hidden');

            orderDetailsEl.innerHTML += `
                <div class="order-row"><span>Tổng tiền cọc:</span> <span>${formatCurrency(payment.amount)} VND</span></div>
            `;

            if (selectedMethod === 'bank_transfer') {
                paymentStatusBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang chờ xác nhận thanh toán...';
                qrContainer.classList.remove('hidden');
                qrImage.src = payment.qrData;
                transferAmount.innerText = formatCurrency(payment.amount);
                transferNote.innerText = payment.bankTransferNote;
                
                startPollingStatus();

            } else {
                paymentStatusBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang chuyển hướng qua cổng thanh toán...';
                setTimeout(() => {
                    window.location.href = payment.paymentUrl;
                }, 1000);
            }

        } catch (error) {
            console.error("Error:", error);
            alert("Lỗi kết nối máy chủ");
            btnCreatePayment.disabled = false;
            btnCreatePayment.innerText = "Tiến hành thanh toán";
        }
    });

    function startPollingStatus() {
        if (pollingInterval) clearInterval(pollingInterval);
        
        pollingInterval = setInterval(async () => {
            if (!currentPaymentId) return;

            try {
                const res = await fetch(`/payment/status/${currentPaymentId}`);
                if (!res.ok) return;
                
                const data = await res.json();
                if (data.success) {
                    const status = data.data.status;
                    if (status === 'success') {
                        clearInterval(pollingInterval);
                        paymentStatusBox.className = 'status-box success';
                        paymentStatusBox.innerHTML = '<i class="fas fa-check-circle"></i> Thanh toán thành công!';
                        qrContainer.classList.add('hidden');
                        setTimeout(() => {
                            alert("Cảm ơn bạn đã đặt cọc thành công!");
                            window.location.href = '/'; 
                        }, 2500);
                    } else if (status === 'expired' || status === 'failed') {
                        clearInterval(pollingInterval);
                        paymentStatusBox.className = 'status-box expired';
                        paymentStatusBox.innerHTML = '<i class="fas fa-times-circle"></i> Thanh toán đã hết hạn hoặc thất bại. Vui lòng thử lại sau.';
                        qrContainer.classList.add('hidden');
                    }
                }
            } catch (err) {
                console.error("Polling error", err);
            }
        }, 3000); // Poll every 3 seconds
    }
});
