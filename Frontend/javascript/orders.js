/* ════════════════════════════════════════
   ORDERS.JS — Trang lịch sử đặt xe
   ════════════════════════════════════════ */

// API_BASE được cung cấp từ config.js (window.API_BASE)
let allOrders = [];
let currentFilter = 'all';

// ── Khởi tạo ──
document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndLoad();
});

// F3: Tải lại khi tab focus lại
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        const email = localStorage.getItem('email');
        if (email) fetchMyOrders(email);
    }
});

// ── Kiểm tra đăng nhập ──
function checkAuthAndLoad() {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('email');

    if (!token || !email) {
        showAuthGuard();
        return;
    }

    // Hiển thị email user trên header
    const userEl = document.getElementById('header-user');
    const name = localStorage.getItem('name') || email;
    if (userEl) userEl.textContent = name;

    fetchMyOrders(email);
}

// ── Fetch đơn hàng ──
async function fetchMyOrders(email) {
    showSkeleton();

    try {
        const token = localStorage.getItem('token');
        // Ưu tiên tìm theo userId nếu có
        const userId = parseUserId(token);
        let url = `${API_BASE}/order/my-orders?email=${encodeURIComponent(email)}`;
        if (userId) url = `${API_BASE}/order/my-orders?userId=${encodeURIComponent(userId)}`;

        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) throw new Error('Không thể tải đơn hàng');

        allOrders = await res.json();
        renderSummary(allOrders);
        renderOrders(allOrders, currentFilter);
    } catch (err) {
        console.error('Lỗi tải đơn hàng:', err);
        document.getElementById('orders-list').innerHTML = `
            <div class="orders-empty">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Không thể tải dữ liệu</h3>
                <p>Vui lòng thử lại sau hoặc kiểm tra kết nối mạng.</p>
            </div>
        `;
    }
}

// ── Parse userId từ JWT token ──
function parseUserId(token) {
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload.id || payload._id || null;
    } catch { return null; }
}

// ── Hiển thị skeleton loading ──
function showSkeleton() {
    const list = document.getElementById('orders-list');
    list.innerHTML = Array.from({ length: 3 }, () => `
        <div class="orders-skeleton">
            <div class="skeleton-img"></div>
            <div class="skeleton-body">
                <div class="skeleton-line" style="width:40%;"></div>
                <div class="skeleton-line" style="width:70%;"></div>
                <div class="skeleton-line skeleton-line--sm"></div>
            </div>
        </div>
    `).join('');
}

// ── Hiển thị thống kê ──
function renderSummary(orders) {
    const total = orders.length;
    const deposited = orders.filter(o => ['deposited', 'pending_payment'].includes(o.status)).length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const purchased = orders.filter(o => o.status === 'purchased').length;
    const cancelled = orders.filter(o => ['cancelled', 'deposit_expired'].includes(o.status)).length;

    document.getElementById('sum-total').textContent = total;
    document.getElementById('sum-pending').textContent = pending;
    document.getElementById('sum-deposited').textContent = deposited;
    document.getElementById('sum-purchased').textContent = purchased;
    document.getElementById('sum-cancelled').textContent = cancelled;
}

// ── Lọc đơn hàng ──
function filterOrders(status) {
    currentFilter = status;
    document.querySelectorAll('.orders-filter__btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === status);
    });
    renderOrders(allOrders, status);
}

// ── Render danh sách đơn hàng ──
function renderOrders(orders, filter) {
    const list = document.getElementById('orders-list');

    let filtered = orders;
    if (filter !== 'all') {
        if (filter === 'active') {
            filtered = orders.filter(o => ['pending', 'pending_payment', 'deposited'].includes(o.status));
        } else if (filter === 'done') {
            filtered = orders.filter(o => o.status === 'purchased');
        } else if (filter === 'cancelled') {
            filtered = orders.filter(o => ['cancelled', 'deposit_expired'].includes(o.status));
        }
    }

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="orders-empty">
                <i class="fas fa-inbox"></i>
                <h3>${filter === 'all' ? 'Bạn chưa có đơn đặt xe nào' : 'Không có đơn nào trong mục này'}</h3>
                <p>${filter === 'all' ? 'Hãy khám phá và đặt xe ngay hôm nay!' : 'Thử chọn bộ lọc khác.'}</p>
                ${filter === 'all' ? '<a href="/index.html" class="orders-empty__link"><i class="fas fa-car"></i> Xem xe ngay</a>' : ''}
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(order => createOrderCardHTML(order)).join('');
}

// ── Tạo HTML card đơn hàng ──
function createOrderCardHTML(order) {
    const { label: statusLabel, icon: statusIcon } = getStatusInfo(order.status);
    const typeLabel = order.type === 'datlich' ? 'Đặt lịch xem xe' : 'Đặt mua xe';
    const createdAt = formatDate(order.createdAt);
    const shortId = (order._id || '').slice(-8).toUpperCase();

    const imageHTML = order.carImage
        ? `<img src="${order.carImage}" alt="${order.carName}" onerror="this.parentElement.innerHTML='<div class=\\'order-card__image-placeholder\\'><i class=\\'fas fa-car\\'></i></div>'">`
        : `<div class="order-card__image-placeholder"><i class="fas fa-car"></i></div>`;

    const depositHTML = order.depositAmount > 0
        ? `<div class="order-card__deposit-label">Tiền cọc</div>
           <div class="order-card__deposit">${formatPrice(order.depositAmount)}</div>`
        : `<div class="order-card__deposit" style="color:#666; font-size:0.82rem;">Chưa cọc</div>`;

    const canCancelDirectly = order.status === 'pending';
    const canContactCancel = ['deposited', 'pending_payment'].includes(order.status);
    const isFinished = ['cancelled', 'deposit_expired', 'purchased'].includes(order.status);

    let cancelBtnHTML = '';
    if (canCancelDirectly) {
        cancelBtnHTML = `
            <button class="order-cancel-btn" onclick="confirmCancel('${order._id}', '${order.carName}')">
                <i class="fas fa-times"></i> Hủy đơn
            </button>`;
    } else if (canContactCancel) {
        cancelBtnHTML = `
            <button class="order-cancel-btn order-cancel-btn--contact" onclick="contactStaff()">
                <i class="fas fa-phone"></i> Liên hệ để hủy cọc
            </button>`;
    } else if (isFinished) {
        // F5: Cho phép đặt lại xe nếu đơn đã hoàn tất (Hủy, Hết hạn cọc, Đã mua)
        cancelBtnHTML = `
            <a href="/detailCar.html?id=${order.carId}" class="order-cancel-btn" style="background:#1e1e1e; border: 1px solid #555; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:8px; color:#fff;">
                <i class="fas fa-redo"></i> Đặt cọc tiếp
            </a>`;
    }

    return `
        <div class="order-card">
            <div class="order-card__image-wrap">${imageHTML}</div>
            <div class="order-card__body">
                <div class="order-card__meta">
                    <span class="order-card__code">#${shortId}</span>
                    <span class="order-card__type-badge">${typeLabel}</span>
                </div>
                <div class="order-card__car-name">${order.carName || 'Xe không xác định'}</div>
                <div class="order-card__details">
                    <div class="order-card__detail">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${createdAt}</span>
                    </div>
                    <div class="order-card__detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${order.city || '—'}</span>
                    </div>
                    ${order.date ? `
                    <div class="order-card__detail">
                        <i class="fas fa-clock"></i>
                        <span>Hẹn: ${formatDate(order.date)}</span>
                    </div>` : ''}
                </div>
                ${cancelBtnHTML}
            </div>
            <div class="order-card__right">
                <div>
                    <span class="status-badge ${order.status}">
                        <i class="${statusIcon}"></i> ${statusLabel}
                    </span>
                </div>
                ${depositHTML}
            </div>
        </div>
    `;
}

// ── Helper: thông tin trạng thái ──
function getStatusInfo(status) {
    const map = {
        pending:         { label: 'Chờ xác nhận',  icon: 'fas fa-hourglass-half' },
        pending_payment: { label: 'Chờ thanh toán', icon: 'fas fa-credit-card' },
        deposited:       { label: 'Đã cọc',          icon: 'fas fa-check-circle' },
        purchased:       { label: 'Đã mua',          icon: 'fas fa-star' },
        cancelled:       { label: 'Đã hủy',          icon: 'fas fa-times-circle' },
        deposit_expired: { label: 'Hết hạn cọc',    icon: 'fas fa-ban' },
    };
    return map[status] || { label: status, icon: 'fas fa-question-circle' };
}

// ── Helper: format tiền ──
function formatPrice(price) {
    if (!price || price === 0) return '0 ₫';
    return Number(price).toLocaleString('vi-VN') + ' ₫';
}

// ── Helper: format ngày ──
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Xác nhận hủy đơn ──
function confirmCancel(orderId, carName) {
    const modal = document.getElementById('cancel-modal');
    document.getElementById('cancel-modal-car').textContent = carName || 'xe này';
    modal.style.display = 'flex';
    modal.dataset.orderId = orderId;
}

function closeCancelModal() {
    document.getElementById('cancel-modal').style.display = 'none';
}

// ── Gọi API hủy đơn ──
async function cancelOrder() {
    const modal = document.getElementById('cancel-modal');
    const orderId = modal.dataset.orderId;
    if (!orderId) return;

    const btn = document.getElementById('confirm-cancel-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang hủy...';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/order/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                status: 'cancelled',
                cancelled_reason: 'user_request'
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Không thể hủy đơn');
        }

        closeCancelModal();
        showToast('✅ Đơn hàng đã được hủy thành công!');

        // Reload lại danh sách
        const email = localStorage.getItem('email');
        await fetchMyOrders(email);
    } catch (err) {
        showToast('❌ Có lỗi xảy ra: ' + err.message, true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-times"></i> Xác nhận hủy';
    }
}

// ── Thông báo liên hệ nhân viên ──
function contactStaff() {
    showToast('📞 Đơn đã đặt cọc — Vui lòng gọi hotline 0909 123 456 hoặc đến showroom để được hỗ trợ hủy cọc.', false, 5000);
}

// ── Toast notification ──
function showToast(message, isError = false, duration = 3000) {
    const existing = document.getElementById('orders-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'orders-toast';
    toast.style.cssText = `
        position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
        background: ${isError ? '#c62828' : '#1e1e1e'};
        border: 1px solid ${isError ? '#e53935' : '#4CAF50'};
        color: #fff; padding: 14px 24px; border-radius: 8px;
        font-size: 0.9rem; z-index: 9999; max-width: 480px;
        text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        font-family: 'Poppins', sans-serif;
        animation: slideUp 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

// ── Auth guard ──
function showAuthGuard() {
    document.getElementById('orders-content').innerHTML = `
        <div class="auth-guard">
            <i class="fas fa-lock"></i>
            <h2>Đăng nhập để xem đơn hàng</h2>
            <p>Bạn cần đăng nhập để xem lịch sử đặt xe của mình.</p>
            <a href="/login.html" class="auth-guard__link">Đăng nhập ngay</a>
        </div>
    `;
}
