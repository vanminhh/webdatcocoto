/* ════════════════════════════════════════
   PROFILE.JS — Trang hồ sơ cá nhân
   ════════════════════════════════════════ */

// API_BASE được cung cấp từ config.js (window.API_BASE)

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndLoad();
});

// ── Kiểm tra auth ──
function checkAuthAndLoad() {
    const token = localStorage.getItem('token');
    if (!token) {
        showAuthGuard();
        return;
    }
    loadProfile();
}

// ── Load profile từ API ──
async function loadProfile() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                showAuthGuard();
                return;
            }
            throw new Error('Không thể tải thông tin');
        }

        const user = await res.json();
        renderProfile(user);
        fillEditForm(user);
    } catch (err) {
        console.error('Lỗi load profile:', err);
        document.getElementById('profile-content').innerHTML = `
            <div class="profile-auth-guard">
                <i class="fas fa-exclamation-circle"></i>
                <h2>Không thể tải dữ liệu</h2>
                <p>Vui lòng thử lại sau.</p>
            </div>`;
    }
}

// ── Render thông tin hiển thị ──
function renderProfile(user) {
    // Avatar + tên
    const avatar = user.avatar || '/image/default-avatar.png';
    document.getElementById('profile-avatar-img').src = avatar;
    document.getElementById('profile-display-name').textContent = user.name || 'Người dùng';
    document.getElementById('profile-display-email').textContent = user.email;
    document.getElementById('profile-role-badge').textContent =
        user.role === 'admin' ? '⚙ Admin' : '👤 Thành viên';

    // Thông tin chi tiết
    document.getElementById('info-name').textContent    = user.name    || '—';
    document.getElementById('info-email').textContent   = user.email   || '—';
    document.getElementById('info-phone').textContent   = user.phone   || '';
    document.getElementById('info-address').textContent = user.address || '';

    // Style trường trống
    ['info-phone', 'info-address'].forEach(id => {
        const el = document.getElementById(id);
        if (!el.textContent.trim()) {
            el.textContent = 'Chưa cập nhật';
            el.classList.add('profile-info-card__value--empty');
        }
    });

    // Ngày tham gia
    if (user.createdAt) {
        const d = new Date(user.createdAt);
        document.getElementById('info-joined').textContent =
            d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
}

// ── Điền dữ liệu vào form edit ──
function fillEditForm(user) {
    document.getElementById('edit-name').value    = user.name    || '';
    document.getElementById('edit-email').value   = user.email   || '';
    document.getElementById('edit-phone').value   = user.phone   || '';
    document.getElementById('edit-address').value = user.address || '';
}

// ── Submit form cập nhật ──
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('profile-edit-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

        const name    = document.getElementById('edit-name').value.trim();
        const phone   = document.getElementById('edit-phone').value.trim();
        const address = document.getElementById('edit-address').value.trim();

        // Validate phone
        if (phone && !/^[0-9]{9,11}$/.test(phone)) {
            showToast('❌ Số điện thoại không hợp lệ! (9-11 chữ số)', true);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Lưu thay đổi';
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showToast('❌ Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!', true, 4000);
                setTimeout(() => window.location.href = '/login.html', 2000);
                return;
            }

            const res = await fetch(`${API_BASE}/auth/update-profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, phone, address })
            });

            // Kiểm tra Content-Type trước khi parse JSON
            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                // Server trả HTML — thường xảy ra khi route không tồn tại hoặc token hết hạn
                if (res.status === 401 || res.status === 403) {
                    showToast('❌ Phiên đăng nhập đã hết hạn. Đang chuyển về đăng nhập...', true, 4000);
                    setTimeout(() => window.location.href = '/login.html', 2000);
                } else {
                    showToast('❌ Lỗi kết nối server. Vui lòng thử restart server rồi thử lại.', true);
                }
                return;
            }

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Cập nhật thất bại');

            // Lưu vào localStorage để các trang khác dùng ngay
            localStorage.setItem('name', name);
            localStorage.setItem('phone', phone);
            localStorage.setItem('address', address);

            showToast('✅ Cập nhật thông tin thành công!');
            loadProfile(); // reload để hiển thị mới
        } catch (err) {
            showToast('❌ Lỗi: ' + err.message, true);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Lưu thay đổi';
        }
    });
});

// ── Đăng xuất ──
function logoutUser() {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('name');
    localStorage.removeItem('avatar');
    window.location.href = '/login.html';
}

// ── Toast ──
function showToast(message, isError = false) {
    const existing = document.getElementById('profile-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'profile-toast';
    toast.style.cssText = `
        position:fixed; bottom:28px; left:50%; transform:translateX(-50%);
        background:${isError ? '#c62828' : '#1b3a1b'};
        border:1px solid ${isError ? '#e53935' : '#388e3c'};
        color:#fff; padding:13px 24px; border-radius:8px;
        font-size:0.9rem; z-index:9999; max-width:420px;
        text-align:center; box-shadow:0 4px 20px rgba(0,0,0,0.5);
        font-family:'Poppins',sans-serif; animation:slideUp 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ── Auth guard ──
function showAuthGuard() {
    document.getElementById('profile-content').innerHTML = `
        <div class="profile-auth-guard">
            <i class="fas fa-lock"></i>
            <h2>Đăng nhập để xem hồ sơ</h2>
            <p>Bạn cần đăng nhập để xem và chỉnh sửa thông tin cá nhân.</p>
            <a href="/login.html" class="profile-auth-guard__link">Đăng nhập ngay</a>
        </div>`;
}
