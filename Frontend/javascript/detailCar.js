/* ═══════════════════════════════════════
   DETAILCAR.JS — Chi tiết xe + Đặt cọc
   N18-AUTO E-Commerce
   ═══════════════════════════════════════ */

// ─── Lấy carId từ URL ───
function getUrlParameter(name) {
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    const results = regex.exec(window.location.href);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
const carId = getUrlParameter('id');
let currentCar = null;

// ─── Cập nhật nút Login/Avatar trên header ───
function updateDetailLoginBtn() {
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('name');
    const email = localStorage.getItem('email');
    const avatar = localStorage.getItem('avatar') || '/image/default-avatar.png';
    const loginBtn = document.getElementById('detail-login-btn');
    const loginText = document.getElementById('detail-login-text');

    if (token && loginBtn) {
        loginBtn.innerHTML = `<img src="${avatar}" alt="Avatar" style="width:28px; height:28px; border-radius:50%; object-fit:cover;"> <p>${name || email || 'User'}</p>`;
        loginBtn.href = '#';
        loginBtn.onclick = function (e) {
            e.preventDefault();
            if (confirm('Bạn muốn đăng xuất?')) {
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('email');
                localStorage.removeItem('name');
                localStorage.removeItem('avatar');
                localStorage.removeItem('role');
                location.reload();
            }
        };
    } else if (loginBtn) {
        loginBtn.innerHTML = `<i class="fa fa-user"></i> <p>Login</p>`;
        loginBtn.href = 'login.html';
    }
}
updateDetailLoginBtn();

// ─── Load chi tiết xe ───
async function loadCarDetails(carId) {
    try {
        const defaultBanner = `./image/img_banner/${carId}.png`;
        const defaultDetail = `./image/img_detail/${carId}.png`;

        const response = await fetch('/api/cars');
        const allCars = await response.json();
        const car = allCars.find(item => String(item.id) === String(carId));
        if (!car) return;

        currentCar = car;

        document.getElementById('carName').textContent = car.name;
        document.getElementById('carBanner').src = car.bannerURL || defaultBanner;
        document.getElementById('carMainImage').src = car.detailURL || defaultDetail;
        document.getElementById('carSeats').textContent = car.seats || '—';
        document.getElementById('carType').textContent = car.Type;
        document.getElementById('carFuel').textContent = car.Fuel;
        document.getElementById('carPrice').textContent = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(car.Price);
        document.getElementById('description').textContent = car.description || '';

        // Tồn kho
        const stockEl = document.getElementById('carStock');
        if (stockEl) {
            const stock = car.availableQuantity !== undefined ? car.availableQuantity : (car.stock !== undefined ? car.stock : 0);
            stockEl.textContent = stock > 0 ? `${stock} xe khả dụng` : 'Hết hàng';
            stockEl.style.color = stock > 0 ? '#4ade80' : '#ef4444';
        }

        // Cập nhật deposit info
        const depositCarName = document.getElementById('depositCarName');
        const depositCarPrice = document.getElementById('depositCarPrice');
        const depositAmountEl = document.getElementById('depositAmount');
        if (depositCarName) depositCarName.textContent = car.name;
        if (depositCarPrice) depositCarPrice.textContent = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(car.Price);
        if (depositAmountEl) {
            const deposit = Math.round(car.Price * 0.1);
            depositAmountEl.textContent = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(deposit);
        }

        // Gallery
        if (car.galleryURLs && car.galleryURLs.length > 0) {
            images.length = 0;
            car.galleryURLs.forEach(url => images.push(url));
            const mainImage = document.getElementById('mainImage');
            if (mainImage) mainImage.src = images[0];
            const thumbnailsContainer = document.querySelector('.thumbnails');
            if (thumbnailsContainer) {
                thumbnailsContainer.innerHTML = '';
                images.forEach((url, idx) => {
                    const img = document.createElement('img');
                    img.className = 'thumbnail' + (idx === 0 ? ' active' : '');
                    img.src = url;
                    img.onclick = () => selectImage(idx);
                    thumbnailsContainer.appendChild(img);
                });
            }
            currentIndex = 0;
        }
    } catch (error) {
        console.error('Error loading car details:', error);
    }
}
loadCarDetails(carId);

// ─── Gallery ───
const images = ["./image/img_library/img_library_vios/anh1.png", "./image/img_library/img_library_vios/anh2.png", "./image/img_library/img_library_vios/anh3.png", "./image/img_library/img_library_vios/anh4.png", "./image/img_library/img_library_vios/anh5.png", "./image/img_library/img_library_vios/anh6.png"];
let currentIndex = 0;
let prevIndex = 0;

function changeImage(step) {
    currentIndex += step;
    if (currentIndex < 0) currentIndex = images.length - 1;
    if (currentIndex >= images.length) currentIndex = 0;
    updateGallery();
}

function selectImage(index) {
    currentIndex = index;
    updateGallery();
}

function updateGallery() {
    let mainImage = document.getElementById("mainImage");
    let direction = currentIndex > prevIndex ? "left" : "right";
    prevIndex = currentIndex;
    mainImage.classList.add(direction === "left" ? "slide-left" : "slide-right");
    setTimeout(() => {
        mainImage.src = images[currentIndex];
        mainImage.classList.remove("slide-right", "slide-left");
    }, 500);
    let thumbnails = document.querySelectorAll(".thumbnail");
    thumbnails.forEach((thumb, index) => {
        thumb.classList.toggle("active", index === currentIndex);
    });
}

// ─── Form Đặt cọc ───
const formDangKy = document.querySelector('.form-dangkylaithu');
const mainContent = document.querySelector('.container-main');
const closeForm = document.getElementById('closeForm');
const submitButton = document.getElementById('submitButton');
const openFormDatLich = document.getElementById('openFormDatLich');

async function checkActiveDepositBeforeOpenForm(carId, token) {
    try {
        const response = await fetch(`${API_BASE}/order/check-active-deposit?carId=${carId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            showBookingToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
            setTimeout(() => {
                window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
            }, 1500);
            return 'unauthorized';
        }
        if (!response.ok) {
            console.error('Lỗi kiểm tra deposit:', await response.text());
            return { hasActiveDeposit: false };
        }
        return await response.json();
    } catch (error) {
        console.error('Lỗi kết nối kiểm tra deposit:', error);
        return { hasActiveDeposit: false };
    }
}

openFormDatLich.addEventListener('click', async () => {
    // ── Kiểm tra đăng nhập ──
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Vui lòng đăng nhập để đặt lịch & đặt cọc!');
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        return;
    }

    const checkResult = await checkActiveDepositBeforeOpenForm(carId, token);
    if (checkResult === 'unauthorized') return;

    if (checkResult && checkResult.hasActiveDeposit) {
        showBookingToast('Bạn đang có đơn hàng xử lý cho xe này! Vui lòng kiểm tra lại đơn của bạn.', 'error');
        return;
    }

    const currentStock = currentCar ? (currentCar.availableQuantity !== undefined ? currentCar.availableQuantity : currentCar.stock) : 0;
    if (currentCar && currentStock <= 0) {
        alert('Xe đã hết hàng! Vui lòng chọn xe khác.');
        return;
    }
    formDangKy.style.display = 'flex';
    mainContent.classList.add('blur-background');
    resetFormValidation();
});

closeForm.addEventListener('click', () => {
    formDangKy.style.display = 'none';
    mainContent.classList.remove('blur-background');
});

formDangKy.addEventListener('click', (event) => {
    if (event.target === formDangKy) {
        formDangKy.style.display = 'none';
        mainContent.classList.remove('blur-background');
    }
});

function resetFormValidation() {
    submitButton.style.opacity = '0.5';
    submitButton.style.pointerEvents = 'none';
    submitButton.classList.remove('enabled');
    const termsBox = document.getElementById('termsCheckbox');
    if (termsBox) termsBox.checked = false;

    // ── Auto-fill từ tài khoản ──
    const userEmail = localStorage.getItem('email') || '';
    const userName  = localStorage.getItem('name')  || '';
    const userPhone = localStorage.getItem('phone')  || '';

    document.getElementById('fullname').value = userName;

    document.getElementById('email').value    = userEmail;
    document.getElementById('email').readOnly = true;
    const changeBtn = document.getElementById('changeEmailBtn');
    if (changeBtn) {
        changeBtn.textContent = 'Thay đổi';
        changeBtn.style.background = '#EB0A1E';
    }

    // Auto-fill phone nếu có
    const phoneInput = document.getElementById('phone');
    if (userPhone) {
        phoneInput.value    = userPhone;
        phoneInput.readOnly = true;
        phoneInput.title    = 'Số điện thoại từ tài khoản của bạn';
    } else {
        phoneInput.value    = '';
        phoneInput.readOnly = false;
        phoneInput.title    = '';
        // Thử fetch từ API nếu chưa có trong localStorage
        const token = localStorage.getItem('token');
        if (token) {
            fetch(`${API_BASE}/auth/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.ok ? r.json() : null).then(data => {
                if (data && data.phone) {
                    phoneInput.value = data.phone;
                    phoneInput.readOnly = true;
                    localStorage.setItem('phone', data.phone);
                    validateForm();
                }
            }).catch(() => {});
        }
    }

    document.getElementById('city').value   = '';
    document.getElementById('dealer').value = '';
    
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.value = '';
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        dateInput.min = todayStr;
    }
    
    const qtyInput = document.getElementById('quantity');
    if (qtyInput) qtyInput.value = '1';
    updateDepositByQuantity();
}

// ─── Cập nhật tiền cọc theo số lượng ───
function updateDepositByQuantity() {
    if (!currentCar) return;
    const qty = Math.max(1, Math.min(parseInt(document.getElementById('quantity')?.value) || 1, 5));
    const depositPerUnit = Math.round(currentCar.Price * 0.1);
    const totalDeposit = depositPerUnit * qty;
    const el = document.getElementById('depositAmount');
    if (el) el.textContent = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalDeposit);
    validateForm();
}

// ─── Toggle chỉnh sửa email ───
function toggleEmailEdit() {
    const emailInput = document.getElementById('email');
    const changeBtn = document.getElementById('changeEmailBtn');
    if (emailInput.readOnly) {
        emailInput.readOnly = false;
        emailInput.focus();
        changeBtn.textContent = 'Hoàn tác';
        changeBtn.style.background = '#666';
    } else {
        // Hoàn tác → trả về email gốc
        emailInput.value = localStorage.getItem('email') || '';
        emailInput.readOnly = true;
        changeBtn.textContent = 'Thay đổi';
        changeBtn.style.background = '#EB0A1E';
    }
    validateForm();
}

function validateForm() {
    const fullname = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const city = document.getElementById('city').value;
    const dealer = document.getElementById('dealer').value;
    const date = document.getElementById('date').value;
    const terms = document.getElementById('termsCheckbox').checked;
    const qty = parseInt(document.getElementById('quantity')?.value) || 0;

    const isValid = fullname && email && phone && city && dealer && date && terms && qty > 0;

    if (isValid) {
        submitButton.classList.add('enabled');
        submitButton.style.pointerEvents = 'auto';
        submitButton.style.opacity = '1';
    } else {
        submitButton.classList.remove('enabled');
        submitButton.style.pointerEvents = 'none';
        submitButton.style.opacity = '0.5';
    }
}

// ─── Modal điều khoản ───
function showTermsModal() {
    document.getElementById('termsModal').style.display = 'flex';
}
// ─── Toast notification (thay alert bị browser chặn) ───
function showBookingToast(msg, type = 'error') {
    let toast = document.getElementById('bookingToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'bookingToast';
        toast.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%);z-index:99999;padding:16px 28px;border-radius:12px;font-size:15px;font-weight:600;max-width:500px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.4);transition:opacity 0.3s,transform 0.3s;';
        document.body.appendChild(toast);
    }
    toast.style.background = type === 'error' ? '#dc2626' : '#16a34a';
    toast.style.color = '#fff';
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
    }, 4000);
}

// ─── Submit đặt cọc ───
submitButton.addEventListener('click', async function () {
    console.log('=== SUBMIT CLICKED ===');
    const token = localStorage.getItem('token');
    console.log('Token:', token ? token.substring(0, 20) + '...' : 'NULL');
    if (!token) {
        showBookingToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
        setTimeout(() => {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        }, 1500);
        return;
    }

    const name = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const phoneNumber = document.getElementById('phone').value.trim();
    const city = document.getElementById('city').value;
    const dealer = document.getElementById('dealer').value;
    const date = document.getElementById('date').value;

    const quantity = Math.max(1, Math.min(parseInt(document.getElementById('quantity')?.value) || 1, 5));
    const cleanPhone = phoneNumber.replace(/[\s.\-]/g, '');

    console.log('Form data:', { name, email, cleanPhone, city, dealer, date, quantity, carId });

    if (!isValidFullName(name)) {
        showBookingToast('Tên không hợp lệ! Vui lòng nhập ít nhất 2 ký tự.');
        return;
    }
    if (!email) { showBookingToast('Vui lòng nhập email!'); return; }
    if (!isValidPhoneNumber(cleanPhone)) { showBookingToast('Số điện thoại không hợp lệ! VD: 0369017983'); return; }

    const depositPerUnit = currentCar ? Math.round(currentCar.Price * 0.1) : 0;
    console.log('depositPerUnit:', depositPerUnit, 'currentCar:', currentCar?.name);

    // Disable nút trong lúc gửi
    submitButton.style.pointerEvents = 'none';
    submitButton.style.opacity = '0.5';
    submitButton.querySelector('span').textContent = 'ĐANG XỬ LÝ...';

    const customerData = { name, email, phoneNumber: cleanPhone };

    try {
        // Tạo customer
        await fetch('/customer/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customerData)
        });

        // Tạo order (có token auth)
        const orderData = {
            name, email, phoneNumber: cleanPhone, city, dealer, date, carId,
            type: 'datlich',
            quantity,
            depositAmount: depositPerUnit,
            status: 'cho_xac_nhan'
        };

        console.log('Sending order:', orderData);

        const orderResponse = await fetch(`${API_BASE}/order/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });

        console.log('Response status:', orderResponse.status);

        if (!orderResponse.ok) {
            let errorData = {};
            try { errorData = await orderResponse.json(); } catch(e) {}
            console.log('Error data:', errorData);
            
            if (orderResponse.status === 401 || orderResponse.status === 403) {
                showBookingToast('Phiên đăng nhập đã hết hạn. Đang chuyển sang trang đăng nhập...');
                localStorage.removeItem('token');
                setTimeout(() => {
                    window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
                }, 1500);
                return;
            }
            showBookingToast(errorData.message || 'Đặt cọc thất bại! Vui lòng thử lại.');
            return;
        }

        const savedOrder = await orderResponse.json();
        console.log('Order created:', savedOrder._id);

        // Đóng form + hiện modal thanh toán
        formDangKy.style.display = 'none';
        mainContent.classList.remove('blur-background');

        // Cập nhật stock trên UI
        if (currentCar) {
            const currentStock = currentCar.availableQuantity !== undefined ? currentCar.availableQuantity : (currentCar.stock !== undefined ? currentCar.stock : 0);
            const newStock = Math.max(0, currentStock - quantity);
            
            currentCar.availableQuantity = newStock;
            currentCar.stock = newStock;
            
            const stockEl = document.getElementById('carStock');
            if (stockEl) {
                stockEl.textContent = newStock > 0 ? `${newStock} xe khả dụng` : 'Hết hàng';
                stockEl.style.color = newStock > 0 ? '#4ade80' : '#ef4444';
            }
        }

        // ── Trừ suất khuyến mãi (remainingSlots) ──
        updatePromoSlots();

        // ── Redirect sang trang thanh toán ──
        showBookingToast('Khởi tạo đơn hàng thành công! Đang chuyển hướng...', 'success');
        setTimeout(() => {
            window.location.href = `payment.html?orderId=${savedOrder._id}`;
        }, 1500);

    } catch (error) {
        console.error('Lỗi:', error);
        showBookingToast('Lỗi: ' + error.message);
    } finally {
        // Bật lại nút
        submitButton.style.pointerEvents = 'auto';
        submitButton.style.opacity = '1';
        submitButton.querySelector('span').textContent = 'XÁC NHẬN ĐẶT CỌC';
    }
});

// ─── Trừ suất KM khi đặt cọc thành công ───
function updatePromoSlots() {
    if (!currentCar) return;

    let promoSource = [];
    const adminData = localStorage.getItem('adminSales');
    if (adminData) {
        try {
            promoSource = JSON.parse(adminData);
        } catch (e) { return; }
    } else if (typeof promotions !== 'undefined') {
        promoSource = JSON.parse(JSON.stringify(promotions));
    } else {
        return;
    }

    // Tìm promo active cho xe hiện tại
    const today = new Date();
    let changed = false;
    promoSource.forEach(promo => {
        if (!promo.isActive) return;
        const start = new Date(promo.startDate);
        const end = new Date(promo.endDate + 'T23:59:59');
        if (today < start || today > end) return;

        // So sánh tên xe
        const carName = (currentCar.name || '').toLowerCase();
        const promoCarName = (promo.carName || '').toLowerCase();
        if (carName.includes(promoCarName.split(' ').pop()) || promoCarName.includes(carName.split(' ').pop())) {
            if (promo.remainingSlots > 0) {
                promo.remainingSlots -= 1;
                changed = true;
            }
        }
    });

    if (changed) {
        localStorage.setItem('adminSales', JSON.stringify(promoSource));
    }
}

// ─── Copy text helper ───
function copyText(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = el.textContent.trim();
    navigator.clipboard.writeText(text).then(() => {
        const btn = el.nextElementSibling;
        if (btn) {
            const original = btn.textContent;
            btn.textContent = '✓';
            btn.style.color = '#4ade80';
            setTimeout(() => { btn.textContent = original; btn.style.color = ''; }, 1500);
        }
    }).catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    });
}

// ─── Validation helpers ───
function isValidFullName(name) {
    // Chấp nhận tên từ 2 ký tự, cho phép 1 từ (VD: "Admin")
    const regex = /^[a-zA-ZÀ-ỹ\s'-]{2,50}$/;
    return regex.test(name);
}

function isValidPhoneNumber(phone) {
    // Chấp nhận 10 số bắt đầu bằng 0 hoặc +84 rồi 9 số
    return /^0\d{9}$/.test(phone) || /^\+84\d{9}$/.test(phone);
}

// ─── Event listeners form ───
document.getElementById('fullname').addEventListener('input', validateForm);
document.getElementById('email').addEventListener('input', validateForm);
document.getElementById('phone').addEventListener('input', validateForm);
document.getElementById('quantity').addEventListener('input', validateForm);
document.getElementById('city').addEventListener('change', validateForm);
document.getElementById('dealer').addEventListener('change', validateForm);
document.getElementById('date').addEventListener('change', validateForm);
document.getElementById('date').addEventListener('change', validateForm);
document.getElementById('termsCheckbox').addEventListener('change', validateForm);

// ─── Thông số kỹ thuật (Dùng specs từ DB, fallback fake) ───
function generateFakeSpecs(car) {
    if (!car) return null;
    
    const sp = car.specs || {};
    const isSUV = car.Type === 'SUV';
    const isElectric = car.Fuel === 'ELECTRIC';
    const isHybrid = car.Fuel === 'HYBRID';
    
    return [
        {
            title: 'Động cơ & Vận hành',
            icon: 'fa-cogs',
            items: [
                { label: 'Loại động cơ', value: sp.engine || (isElectric ? 'Mô-tơ điện đồng bộ từ thiên' : (isHybrid ? '2.5L Hybrid (Xăng + Điện)' : '2.0L Xăng DOHC 16 Van')) },
                { label: 'Dung tích công tác', value: sp.displacement || (isElectric ? 'Không' : (isHybrid ? '2,487 cc' : '1,987 cc')) },
                { label: 'Công suất tối đa', value: sp.horsepower || (isElectric ? '150 kW (201 hp) / 3400 rpm' : '170 hp / 6600 rpm') },
                { label: 'Mô-men xoắn', value: sp.torque || (isElectric ? '266 Nm' : '205 Nm / 4400 rpm') },
                { label: 'Hộp số', value: sp.transmissionDetail || car.transmission || (isHybrid ? 'E-CVT' : 'Tự động 6 cấp') },
                { label: 'Dẫn động', value: sp.drivetrain ? (sp.drivetrain + (sp.drivetrain === 'AWD' ? ' (4 bánh toàn thời gian)' : sp.drivetrain === 'FWD' ? ' (Cầu trước)' : '')) : (isSUV ? 'AWD (4 bánh toàn thời gian)' : 'FWD (Cầu trước)') }
            ]
        },
        {
            title: 'Kích thước & Trọng lượng',
            icon: 'fa-ruler-combined',
            items: [
                { label: 'Dài x Rộng x Cao', value: (sp.dimensions ? sp.dimensions + ' mm' : (isSUV ? '4,890 x 1,920 x 1,695 mm' : '4,885 x 1,840 x 1,445 mm')) },
                { label: 'Chiều dài cơ sở', value: (sp.wheelbase ? sp.wheelbase + ' mm' : (isSUV ? '2,790 mm' : '2,825 mm')) },
                { label: 'Khoảng sáng gầm xe', value: (sp.clearance ? sp.clearance + ' mm' : (isSUV ? '210 mm' : '140 mm')) },
                { label: 'Trọng lượng không tải', value: (sp.weight ? sp.weight + ' kg' : (isSUV ? '1,950 kg' : '1,550 kg')) },
                { label: 'Dung tích bình nhiên liệu', value: sp.fuelTank ? sp.fuelTank + ' L' : (isElectric ? 'Pin 71.4 kWh' : '50 L') }
            ]
        },
        {
            title: 'Khung gầm',
            icon: 'fa-car-side',
            items: [
                { label: 'Hệ thống treo trước', value: 'MacPherson với thanh cân bằng' },
                { label: 'Hệ thống treo sau', value: 'Tay đòn kép' },
                { label: 'Phanh trước / sau', value: 'Đĩa tản nhiệt / Đĩa đặc' },
                { label: 'Trợ lực lái', value: 'Điện (EPS)' },
                { label: 'Thông số lốp', value: sp.tires || (isSUV ? '235/50R20' : '235/45R18') }
            ]
        },
        {
            title: 'An toàn & Công nghệ',
            icon: 'fa-shield-alt',
            items: [
                { label: 'Toyota Safety Sense', value: 'Phiên bản 3.0 mới nhất' },
                { label: 'Số túi khí', value: sp.airbags ? sp.airbags + ' túi khí' : '7 túi khí' },
                { label: 'Camera 360', value: sp.camera360 === 'no' ? 'Không' : 'Có, độ nét cao' },
                { label: 'Cảnh báo điểm mù', value: 'Có (BSM)' },
                { label: 'Cảnh báo phương tiện cắt ngang', value: 'Có (RCTA)' },
                { label: 'Cảm biến áp suất lốp', value: 'Có (TPWS)' }
            ]
        }
    ];
}

function openSpecsPanel() {
    if (!currentCar) {
        showBookingToast('Không tìm thấy dữ liệu xe!', 'error');
        return;
    }

    const modal = document.getElementById('specsModal');
    const nameEl = document.getElementById('specsCarName');
    const bodyEl = document.getElementById('specsBody');

    if (nameEl) nameEl.textContent = `THÔNG SỐ: ${currentCar.name}`;
    
    const specsData = generateFakeSpecs(currentCar);
    let html = '';

    specsData.forEach(section => {
        html += `
            <div class="specs-section">
                <h3><i class="fa ${section.icon}"></i> ${section.title}</h3>
                <table class="specs-table">
                    <tbody>
        `;
        section.items.forEach(item => {
            html += `
                        <tr>
                            <td>${item.label}</td>
                            <td>${item.value}</td>
                        </tr>
            `;
        });
        html += `
                    </tbody>
                </table>
            </div>
        `;
    });

    if (bodyEl) bodyEl.innerHTML = html;
    if (modal) {
        modal.style.display = 'flex';
        document.querySelector('.container-main').classList.add('blur-background');
    }
}

function closeSpecsPanel() {
    const modal = document.getElementById('specsModal');
    if (modal) {
        modal.style.display = 'none';
        document.querySelector('.container-main').classList.remove('blur-background');
    }
}

// Close specs panel when clicking outside
document.getElementById('specsModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeSpecsPanel();
    }
});
