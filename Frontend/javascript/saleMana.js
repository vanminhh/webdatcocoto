/* ═══════════════════════════════════════════════════════════
   SALEMANA.JS — Quản lý Khuyến mãi (CRUD + Charts)
   Nâng cấp: DateTime, Auto-calc, Promo Type Logic, Countdown
   ═══════════════════════════════════════════════════════════ */

// ─── State ───
let saleList = [];
let filteredSales = [];
let saleCurrentPage = 1;
const SALE_PER_PAGE = 8;
let saleStatusInterval = null;

// ─── Biến cache danh sách xe từ API ───
let cachedCars = [];


/* ═══════════════════════════════════════
   INIT
   ═══════════════════════════════════════ */
function initSaleManager() {
    // Clone promotions data hoặc load từ localStorage
    const saved = localStorage.getItem('adminSales');
    if (saved) {
        saleList = JSON.parse(saved);
    } else if (typeof promotions !== 'undefined') {
        // Migrate data cũ: thêm startTime/endTime nếu chưa có
        saleList = JSON.parse(JSON.stringify(promotions)).map(s => ({
            ...s,
            startTime: s.startTime || '00:00',
            endTime: s.endTime || '23:59',
            promoType: s.discountPercent > 0 ? 'percent' : (s.discountAmount > 0 ? 'cash' : 'gift'),
            cashAmount: s.discountAmount || 0,
            percentAmount: s.discountPercent || 0
        }));
    } else {
        saleList = [];
    }

    // Auto check trạng thái
    autoCheckExpiry();

    // Render tất cả
    updateSaleStats();
    filterSaleTable();
    populateCarDropdown();
    renderSaleCharts();
    handlePromoTypeChange(); // Set trạng thái ô tiền/% ban đầu

    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    setVal('sale-start-date', today);
    setVal('sale-end-date', nextMonth);
    setVal('sale-start-time', '00:00');
    setVal('sale-end-time', '23:59');

    // ── Auto check mỗi 60 giây ──
    if (saleStatusInterval) clearInterval(saleStatusInterval);
    saleStatusInterval = setInterval(() => {
        autoCheckExpiry();
        updateSaleStats();
        renderSaleTable();
    }, 60000);
}


/* ═══════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════ */
function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v; }
function getVal(id) { return (document.getElementById(id)?.value || '').trim(); }

// Lấy full datetime từ date + time inputs
function getFullDateTime(dateId, timeId) {
    const d = getVal(dateId);
    const t = getVal(timeId) || '00:00';
    if (!d) return null;
    return new Date(`${d}T${t}:00`);
}

// Format VND ngắn gọn
function fmtVND(amount) {
    if (!amount || amount <= 0) return '0 ₫';
    if (amount >= 1000000000) {
        const ty = amount / 1000000000;
        return (ty % 1 === 0 ? ty : ty.toFixed(1)) + ' tỷ';
    }
    if (amount >= 1000000) {
        const tr = amount / 1000000;
        return (tr % 1 === 0 ? tr : tr.toFixed(0)) + ' triệu';
    }
    return amount.toLocaleString('vi-VN') + ' ₫';
}

function fmtDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(dateStr, timeStr) {
    return fmtDate(dateStr) + (timeStr ? ' ' + timeStr : '');
}

// Countdown text: "Xn Yh Zm"
function fmtCountdown(endDate, endTime) {
    const end = new Date(`${endDate}T${endTime || '23:59'}:00`);
    const now = new Date();
    const diff = end - now;
    if (diff <= 0) return 'Đã hết hạn';

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);

    if (days > 0) return `${days}n ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}p`;
    return `${mins} phút`;
}


/* ═══════════════════════════════════════
   TRẠNG THÁI SALE (chính xác đến giờ)
   ═══════════════════════════════════════ */
function getSaleStatus(sale) {
    const now = new Date();
    const start = new Date(`${sale.startDate}T${sale.startTime || '00:00'}:00`);
    const end = new Date(`${sale.endDate}T${sale.endTime || '23:59'}:00`);
    const hoursLeft = (end - now) / 3600000;

    if (!sale.isActive && now < end && now >= start) return 'paused';
    if (now > end || (!sale.isActive && now >= end)) return 'expired';
    if (now < start) return 'upcoming';
    if (hoursLeft <= 72 && hoursLeft > 0) return 'expiring'; // < 3 ngày
    return 'active';
}

// Auto check và cập nhật trạng thái
function autoCheckExpiry() {
    const now = new Date();
    let changed = false;

    saleList.forEach(sale => {
        const end = new Date(`${sale.endDate}T${sale.endTime || '23:59'}:00`);
        const start = new Date(`${sale.startDate}T${sale.startTime || '00:00'}:00`);
        const hoursLeft = (end - now) / 3600000;

        // Hết hạn → tự tắt
        if (now > end && sale.isActive) {
            sale.isActive = false;
            changed = true;
        }

        // Sắp hết (< 3 ngày) → gán badge SẮP HẾT
        if (hoursLeft > 0 && hoursLeft <= 72 && sale.isActive) {
            sale.badge = 'SẮP HẾT';
            changed = true;
        }
    });

    if (changed) saveSalesToStorage();
}

function saveSalesToStorage() {
    localStorage.setItem('adminSales', JSON.stringify(saleList));
}


/* ═══════════════════════════════════════
   STATS CARDS
   ═══════════════════════════════════════ */
function updateSaleStats() {
    let active = 0, expiring = 0, expired = 0, usedSlots = 0;

    saleList.forEach(sale => {
        const status = getSaleStatus(sale);
        if (status === 'active') active++;
        if (status === 'expiring') { expiring++; active++; }
        if (status === 'expired') expired++;
        usedSlots += (sale.totalSlots || 0) - (sale.remainingSlots || 0);
    });

    const el = (id) => document.getElementById(id);
    if (el('sale-stat-active')) el('sale-stat-active').textContent = active;
    if (el('sale-stat-expiring')) el('sale-stat-expiring').textContent = expiring;
    if (el('sale-stat-expired')) el('sale-stat-expired').textContent = expired;
    if (el('sale-stat-used')) el('sale-stat-used').textContent = usedSlots;

    // Sidebar badge
    const badge = document.getElementById('active-sale-count');
    if (badge) badge.textContent = active;
}


/* ═══════════════════════════════════════
   FILTER & SEARCH
   ═══════════════════════════════════════ */
function filterSaleTable() {
    const searchTerm = (getVal('sale-search') || '').toLowerCase();
    const statusFilter = getVal('sale-filter-status') || 'all';

    filteredSales = saleList.filter(sale => {
        const matchSearch = !searchTerm ||
            (sale.promoTitle || '').toLowerCase().includes(searchTerm) ||
            (sale.carName || '').toLowerCase().includes(searchTerm) ||
            (sale.promoDescription || '').toLowerCase().includes(searchTerm);

        const status = getSaleStatus(sale);
        const matchStatus = statusFilter === 'all' || status === statusFilter;

        return matchSearch && matchStatus;
    });

    saleCurrentPage = 1;
    renderSaleTable();
}


/* ═══════════════════════════════════════
   RENDER TABLE (với countdown khi < 24h)
   ═══════════════════════════════════════ */
function renderSaleTable() {
    const tbody = document.getElementById('sale-table-body');
    if (!tbody) return;

    const startIdx = (saleCurrentPage - 1) * SALE_PER_PAGE;
    const pageSales = filteredSales.slice(startIdx, startIdx + SALE_PER_PAGE);

    if (pageSales.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="10" style="text-align:center; padding:40px; color:#666;">
                <i class="fa fa-tags" style="font-size:32px; opacity:0.3; display:block; margin-bottom:12px;"></i>
                Chưa có chương trình khuyến mãi nào
            </td></tr>`;
        updatePagination();
        return;
    }

    const typeLabels = { cash: 'Tiền mặt', percent: '% Giảm giá', gift: 'Quà tặng', combo: 'Kết hợp' };

    tbody.innerHTML = pageSales.map((sale, idx) => {
        const status = getSaleStatus(sale);

        // Status badge (với countdown khi expiring)
        let statusHTML = '';
        const end = new Date(`${sale.endDate}T${sale.endTime || '23:59'}:00`);
        const hoursLeft = (end - new Date()) / 3600000;

        if (status === 'active') {
            statusHTML = '<span class="status-badge status-badge--active">🟢 Đang chạy</span>';
        } else if (status === 'expiring') {
            const cd = fmtCountdown(sale.endDate, sale.endTime);
            statusHTML = `<span class="status-badge status-badge--expiring">🔴 Còn ${cd}</span>`;
        } else if (status === 'upcoming') {
            statusHTML = '<span class="status-badge status-badge--upcoming">🟡 Sắp diễn ra</span>';
        } else if (status === 'paused') {
            statusHTML = '<span class="status-badge status-badge--upcoming">⏸️ Tạm dừng</span>';
        } else {
            statusHTML = '<span class="status-badge status-badge--expired">⚫ Đã kết thúc</span>';
        }

        // Progress
        const used = (sale.totalSlots || 0) - (sale.remainingSlots || 0);
        const total = sale.totalSlots || 0;
        const progress = total > 0 ? Math.round((used / total) * 100) : 0;

        // Discount display
        let discountText = '';
        if (sale.cashAmount > 0) discountText = fmtVND(sale.cashAmount);
        else if (sale.percentAmount > 0) discountText = sale.percentAmount + '%';
        else if (sale.discountAmount > 0) discountText = fmtVND(sale.discountAmount);
        else discountText = 'Quà tặng';

        // Promo type
        const promoType = sale.promoType || (sale.discountPercent > 0 ? 'percent' : 'cash');

        return `
            <tr>
                <td>${startIdx + idx + 1}</td>
                <td>
                    <strong style="color:#fff;">${sale.promoTitle || 'KM'}</strong>
                    <br><small style="color:#888;">${sale.badge || ''}</small>
                </td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <img src="${sale.carImage}" alt="" style="width:50px; height:32px; object-fit:contain; border-radius:4px;" onerror="this.style.display='none'">
                        <span>${sale.carName || ''}</span>
                    </div>
                </td>
                <td><small style="color:#aaa;">${typeLabels[promoType] || promoType}</small></td>
                <td style="color:#EB0A1E; font-weight:700;">${discountText}</td>
                <td>
                    <small>${fmtDateTime(sale.startDate, sale.startTime)}</small><br>
                    <small>→ ${fmtDateTime(sale.endDate, sale.endTime)}</small>
                </td>
                <td style="text-align:center;">${used}/${total}</td>
                <td>
                    <div class="table-progress">
                        <div class="table-progress__bar">
                            <div class="table-progress__fill" style="width:${progress}%"></div>
                        </div>
                        <span class="table-progress__label">${progress}%</span>
                    </div>
                </td>
                <td>${statusHTML}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-edit" title="Sửa" onclick="editSale('${sale.id}')"><i class="fa fa-pen"></i></button>
                        <button class="btn-toggle" title="${sale.isActive ? 'Tạm dừng' : 'Kích hoạt'}" onclick="toggleSaleActive('${sale.id}')">
                            <i class="fa fa-${sale.isActive ? 'pause' : 'play'}"></i>
                        </button>
                        <button class="btn-delete" title="Xóa" onclick="deleteSale('${sale.id}')"><i class="fa fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');

    updatePagination();
}


/* ═══════════════════════════════════════
   PAGINATION
   ═══════════════════════════════════════ */
function updatePagination() {
    const totalPages = Math.ceil(filteredSales.length / SALE_PER_PAGE);
    const info = document.getElementById('sale-pagination-info');
    const btns = document.getElementById('sale-pagination-buttons');

    if (info) {
        const s = (saleCurrentPage - 1) * SALE_PER_PAGE + 1;
        const e = Math.min(saleCurrentPage * SALE_PER_PAGE, filteredSales.length);
        info.textContent = filteredSales.length > 0 ? `Hiển thị ${s}-${e} / ${filteredSales.length}` : 'Không có dữ liệu';
    }

    if (btns) {
        let html = '';
        if (totalPages > 1) {
            html += `<button class="table-pagination__btn" onclick="goToSalePage(${saleCurrentPage - 1})" ${saleCurrentPage <= 1 ? 'disabled' : ''}><i class="fa fa-chevron-left"></i></button>`;
            for (let i = 1; i <= totalPages; i++) {
                html += `<button class="table-pagination__btn ${i === saleCurrentPage ? 'active' : ''}" onclick="goToSalePage(${i})">${i}</button>`;
            }
            html += `<button class="table-pagination__btn" onclick="goToSalePage(${saleCurrentPage + 1})" ${saleCurrentPage >= totalPages ? 'disabled' : ''}><i class="fa fa-chevron-right"></i></button>`;
        }
        btns.innerHTML = html;
    }
}

function goToSalePage(page) {
    const totalPages = Math.ceil(filteredSales.length / SALE_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    saleCurrentPage = page;
    renderSaleTable();
}


/* ═══════════════════════════════════════
   PROMO TYPE LOGIC (enable/disable ô tiền/%)
   ═══════════════════════════════════════ */
function handlePromoTypeChange() {
    const type = document.querySelector('input[name="sale-type"]:checked')?.value || 'cash';
    const cashInput = document.getElementById('sale-cash');
    const pctInput = document.getElementById('sale-percent');
    const cashGroup = document.getElementById('cash-group');
    const pctGroup = document.getElementById('percent-group');
    const cashHint = document.getElementById('cash-calc-hint');
    const pctHint = document.getElementById('percent-calc-hint');

    if (!cashInput || !pctInput) return;

    // Reset
    cashInput.readOnly = false;
    pctInput.readOnly = false;
    cashInput.style.opacity = '1';
    pctInput.style.opacity = '1';
    cashInput.style.cursor = 'text';
    pctInput.style.cursor = 'text';
    if (cashHint) cashHint.textContent = '';
    if (pctHint) pctHint.textContent = '';

    switch (type) {
        case 'cash':
            // Chỉ điền tiền → tự tính %
            pctInput.readOnly = true;
            pctInput.style.opacity = '0.4';
            pctInput.style.cursor = 'not-allowed';
            pctInput.placeholder = '— Tự tính —';
            cashInput.placeholder = 'VD: 200000000';
            break;

        case 'percent':
            // Chỉ điền % → tự tính tiền
            cashInput.readOnly = true;
            cashInput.style.opacity = '0.4';
            cashInput.style.cursor = 'not-allowed';
            cashInput.placeholder = '— Tự tính —';
            pctInput.placeholder = 'VD: 15';
            break;

        case 'gift':
            // Cả 2 đều disable
            cashInput.readOnly = true;
            pctInput.readOnly = true;
            cashInput.style.opacity = '0.3';
            pctInput.style.opacity = '0.3';
            cashInput.style.cursor = 'not-allowed';
            pctInput.style.cursor = 'not-allowed';
            cashInput.placeholder = 'Không áp dụng';
            pctInput.placeholder = 'Không áp dụng';
            cashInput.value = '';
            pctInput.value = '';
            break;

        case 'combo':
            // Cả 2 đều điền được
            cashInput.placeholder = 'Tiền giảm thêm';
            pctInput.placeholder = '% giảm thêm';
            break;
    }
}

// ── Khi điền tiền → tự tính % ──
function onCashInput() {
    const type = document.querySelector('input[name="sale-type"]:checked')?.value;
    if (type !== 'cash') return;

    const cash = parseFloat(getVal('sale-cash')) || 0;
    const carPrice = getSelectedCarPrice();
    const pctInput = document.getElementById('sale-percent');
    const pctHint = document.getElementById('percent-calc-hint');

    if (carPrice > 0 && cash > 0) {
        const pct = (cash / carPrice * 100).toFixed(1);
        pctInput.value = pct;
        if (pctHint) pctHint.textContent = `= ${pct}% giá niêm yết`;
    } else {
        pctInput.value = '';
        if (pctHint) pctHint.textContent = '';
    }
}

// ── Khi điền % → tự tính tiền ──
function onPercentInput() {
    const type = document.querySelector('input[name="sale-type"]:checked')?.value;
    if (type !== 'percent') return;

    const pct = parseFloat(getVal('sale-percent')) || 0;
    const carPrice = getSelectedCarPrice();
    const cashInput = document.getElementById('sale-cash');
    const cashHint = document.getElementById('cash-calc-hint');

    if (carPrice > 0 && pct > 0) {
        const cash = Math.round(carPrice * pct / 100);
        cashInput.value = cash;
        if (cashHint) cashHint.textContent = `= ${fmtVND(cash)}`;
    } else {
        cashInput.value = '';
        if (cashHint) cashHint.textContent = '';
    }
}

// Lấy giá xe đang chọn  
function getSelectedCarPrice() {
    const sel = document.getElementById('sale-car');
    if (!sel || !sel.selectedOptions[0]) return 0;
    return parseFloat(sel.selectedOptions[0].dataset.price) || 0;
}

// Khi chọn xe → hiện giá + tính lại
function onCarSelectChange() {
    const price = getSelectedCarPrice();
    const hint = document.getElementById('car-price-hint');
    if (hint) {
        hint.textContent = price > 0 ? `Giá niêm yết: ${fmtVND(price)}` : '';
    }
    // Tính lại nếu đã điền
    onCashInput();
    onPercentInput();
}


/* ═══════════════════════════════════════
   POPULATE CAR DROPDOWN (từ API hoặc fallback)
   ═══════════════════════════════════════ */
function populateCarDropdown() {
    const select = document.getElementById('sale-car');
    if (!select) return;

    fetch('/api/cars')
        .then(r => r.json())
        .then(cars => {
            cachedCars = cars;
            select.innerHTML = '<option value="">-- Chọn xe --</option>';
            cars.forEach(car => {
                const price = car.Price || 0;
                select.innerHTML += `<option value="${car.name}" data-image="${car.URL || ''}" data-price="${price}" data-id="${car.id || car._id || ''}">${car.name} — ${price.toLocaleString('vi-VN')} ₫</option>`;
            });
        })
        .catch(() => {
            const fallback = [
                { name: 'Toyota Alphard', price: 4510000000 },
                { name: 'Toyota Camry HEV', price: 1460000000 },
                { name: 'Toyota Fortuner Legender', price: 1395000000 },
                { name: 'Toyota Land Cruiser 300', price: 4580000000 },
                { name: 'Toyota Vios 1.5E-MT', price: 458000000 },
                { name: 'Toyota Innova Cross', price: 825000000 },
                { name: 'Toyota Corolla Cross', price: 828000000 },
                { name: 'Toyota Raize', price: 498000000 }
            ];
            select.innerHTML = '<option value="">-- Chọn xe --</option>';
            fallback.forEach(c => {
                select.innerHTML += `<option value="${c.name}" data-price="${c.price}">${c.name} — ${c.price.toLocaleString('vi-VN')} ₫</option>`;
            });
        });
}


/* ═══════════════════════════════════════
   MODAL: Mở / Đóng / Load
   ═══════════════════════════════════════ */
function openSaleModal() {
    document.getElementById('sale-modal-overlay').classList.add('active');
    document.getElementById('sale-modal-title').textContent = 'Tạo chương trình khuyến mãi';
    document.getElementById('sale-edit-id').value = '';

    // Reset form
    setVal('sale-name', '');
    setVal('sale-car', '');
    setVal('sale-cash', '');
    setVal('sale-percent', '');
    setVal('sale-slots', '10');
    setVal('sale-description', '');
    setVal('sale-image', '');
    setVal('sale-status', 'true');
    setVal('sale-badge', 'HOT');

    document.querySelector('input[name="sale-type"][value="cash"]').checked = true;

    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    setVal('sale-start-date', today);
    setVal('sale-start-time', '00:00');
    setVal('sale-end-date', nextMonth);
    setVal('sale-end-time', '23:59');

    handlePromoTypeChange();
    document.getElementById('car-price-hint').textContent = '';
    document.getElementById('cash-calc-hint').textContent = '';
    document.getElementById('percent-calc-hint').textContent = '';
}

function closeSaleModal() {
    document.getElementById('sale-modal-overlay').classList.remove('active');
}


/* ═══════════════════════════════════════
   EDIT SALE
   ═══════════════════════════════════════ */
function editSale(saleId) {
    const sale = saleList.find(s => s.id === saleId);
    if (!sale) return;

    document.getElementById('sale-modal-overlay').classList.add('active');
    document.getElementById('sale-modal-title').textContent = 'Sửa chương trình khuyến mãi';
    document.getElementById('sale-edit-id').value = saleId;

    setVal('sale-name', sale.promoTitle || sale.promoDescription || '');
    setVal('sale-car', sale.carName || '');
    setVal('sale-badge', sale.badge || 'HOT');
    setVal('sale-cash', sale.cashAmount || sale.discountAmount || '');
    setVal('sale-percent', sale.percentAmount || sale.discountPercent || '');
    setVal('sale-slots', sale.totalSlots || 0);
    setVal('sale-description', sale.promoDescription || '');
    setVal('sale-start-date', sale.startDate || '');
    setVal('sale-start-time', sale.startTime || '00:00');
    setVal('sale-end-date', sale.endDate || '');
    setVal('sale-end-time', sale.endTime || '23:59');
    setVal('sale-image', sale.carImage || '');
    setVal('sale-status', sale.isActive ? 'true' : 'false');

    const typeRadio = sale.promoType || (sale.discountPercent > 0 ? 'percent' : 'cash');
    const radio = document.querySelector(`input[name="sale-type"][value="${typeRadio}"]`);
    if (radio) radio.checked = true;

    handlePromoTypeChange();
    onCarSelectChange();
}


/* ═══════════════════════════════════════
   SAVE SALE (Create / Update)
   ═══════════════════════════════════════ */
function saveSale() {
    const name = getVal('sale-name');
    const carName = getVal('sale-car');
    const badge = getVal('sale-badge');
    const cashAmount = parseFloat(getVal('sale-cash')) || 0;
    const percentAmount = parseFloat(getVal('sale-percent')) || 0;
    const slots = parseInt(getVal('sale-slots')) || 0;
    const description = getVal('sale-description');
    const startDate = getVal('sale-start-date');
    const startTime = getVal('sale-start-time') || '00:00';
    const endDate = getVal('sale-end-date');
    const endTime = getVal('sale-end-time') || '23:59';
    const image = getVal('sale-image');
    const isActive = getVal('sale-status') === 'true';
    const promoType = document.querySelector('input[name="sale-type"]:checked')?.value || 'cash';
    const editId = getVal('sale-edit-id');

    // ── Validation ──
    if (!name) return showToast('Vui lòng nhập tên chương trình!', 'error');
    if (!carName) return showToast('Vui lòng chọn xe áp dụng!', 'error');
    if (!startDate || !endDate) return showToast('Vui lòng chọn thời gian!', 'error');

    // Validate datetime
    const startDT = new Date(`${startDate}T${startTime}:00`);
    const endDT = new Date(`${endDate}T${endTime}:00`);
    if (endDT <= startDT) return showToast('Ngày/giờ kết thúc phải sau ngày/giờ bắt đầu!', 'error');

    if (promoType !== 'gift' && cashAmount <= 0 && percentAmount <= 0) {
        return showToast('Vui lòng nhập số tiền hoặc % giảm!', 'error');
    }

    // Get car info
    const carOption = document.getElementById('sale-car')?.selectedOptions[0];
    const carPrice = parseFloat(carOption?.dataset?.price) || 0;

    const saleData = {
        carName,
        carImage: image || carOption?.dataset?.image || '/image/img_banner/1.png',
        originalPrice: carPrice,
        salePrice: carPrice - cashAmount,
        discountAmount: cashAmount,
        discountPercent: percentAmount,
        cashAmount,
        percentAmount,
        promoType,
        promoTitle: name,
        promoDescription: description || name,
        badge,
        startDate,
        startTime,
        endDate,
        endTime,
        isActive,
        totalSlots: slots,
        remainingSlots: slots,
        createdAt: new Date().toISOString(),
        createdBy: localStorage.getItem('email') || 'admin'
    };

    if (editId) {
        // ── Update ──
        const idx = saleList.findIndex(s => s.id === editId);
        if (idx !== -1) {
            saleData.id = editId;
            saleData.remainingSlots = saleList[idx].remainingSlots;
            saleList[idx] = { ...saleList[idx], ...saleData };
        }
        showToast('✅ Đã cập nhật khuyến mãi!', 'success');
    } else {
        // ── Create ──
        saleData.id = 'promo_' + Date.now();
        saleList.push(saleData);
        showToast('✅ Đã tạo khuyến mãi mới!', 'success');
    }

    saveSalesToStorage();
    closeSaleModal();
    updateSaleStats();
    filterSaleTable();
    renderSaleCharts();
}


/* ═══════════════════════════════════════
   TOGGLE / DELETE
   ═══════════════════════════════════════ */
function toggleSaleActive(saleId) {
    const sale = saleList.find(s => s.id === saleId);
    if (!sale) return;
    sale.isActive = !sale.isActive;
    saveSalesToStorage();
    updateSaleStats();
    renderSaleTable();
    showToast(sale.isActive ? '🟢 Đã kích hoạt KM' : '⏸️ Đã tạm dừng KM', 'info');
}

function deleteSale(saleId) {
    const sale = saleList.find(s => s.id === saleId);
    if (!sale) return;
    showConfirm('Xóa khuyến mãi?', `Xóa "${sale.promoTitle || sale.carName}"? Không thể hoàn tác.`, () => {
        saleList = saleList.filter(s => s.id !== saleId);
        saveSalesToStorage();
        updateSaleStats();
        filterSaleTable();
        renderSaleCharts();
        showToast('🗑️ Đã xóa khuyến mãi', 'warning');
    });
}


/* ═══════════════════════════════════════
   EXPORT CSV
   ═══════════════════════════════════════ */
function exportSalesCSV(filterStatus) {
    const data = filterStatus ? saleList.filter(s => getSaleStatus(s) === filterStatus) : filteredSales;
    if (data.length === 0) return showToast('Không có dữ liệu để xuất!', 'warning');

    const typeLabels = { cash: 'Tiền mặt', percent: '% Giảm', gift: 'Quà tặng', combo: 'Kết hợp' };
    const headers = ['STT', 'Tên CT', 'Xe', 'Loại KM', 'Giảm tiền', 'Giảm %', 'Bắt đầu', 'Kết thúc', 'Tổng suất', 'Còn lại', 'Hiệu quả', 'Trạng thái'];
    const rows = data.map((s, i) => {
        const used = (s.totalSlots || 0) - (s.remainingSlots || 0);
        const eff = s.totalSlots > 0 ? Math.round(used / s.totalSlots * 100) : 0;
        return [
            i + 1,
            `"${s.promoTitle || ''}"`,
            `"${s.carName}"`,
            typeLabels[s.promoType] || '',
            s.cashAmount || s.discountAmount || 0,
            s.percentAmount || s.discountPercent || 0,
            `${s.startDate} ${s.startTime || ''}`,
            `${s.endDate} ${s.endTime || ''}`,
            s.totalSlots || 0,
            s.remainingSlots || 0,
            eff + '%',
            getSaleStatus(s)
        ];
    });

    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `khuyen-mai-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📥 Đã xuất file CSV!', 'success');
}


/* ═══════════════════════════════════════
   CHARTS
   ═══════════════════════════════════════ */
let saleTypeChartInstance = null;
let saleCarChartInstance = null;

function renderSaleCharts() {
    // ── Pie: Loại KM ──
    const typeCtx = document.getElementById('sale-type-chart');
    if (typeCtx) {
        let cash = 0, pct = 0, gift = 0, combo = 0;
        saleList.forEach(s => {
            const t = s.promoType || 'cash';
            if (t === 'cash') cash++; else if (t === 'percent') pct++;
            else if (t === 'gift') gift++; else combo++;
        });
        if (saleTypeChartInstance) saleTypeChartInstance.destroy();
        saleTypeChartInstance = new Chart(typeCtx, {
            type: 'doughnut',
            data: {
                labels: ['Tiền mặt', 'Phần trăm', 'Quà tặng', 'Kết hợp'],
                datasets: [{ data: [cash, pct, gift, combo], backgroundColor: ['#EB0A1E', '#F59E0B', '#22C55E', '#3B82F6'], borderColor: '#222', borderWidth: 3 }]
            },
            options: { responsive: true, cutout: '55%', plugins: { legend: { position: 'bottom', labels: { color: '#aaa', padding: 14, font: { family: "'Be Vietnam Pro'", size: 11 } } } } }
        });
    }

    // ── Bar: Xe KM nhiều nhất ──
    const carCtx = document.getElementById('sale-car-chart');
    if (carCtx) {
        const count = {};
        saleList.forEach(s => { count[s.carName] = (count[s.carName] || 0) + 1; });
        if (saleCarChartInstance) saleCarChartInstance.destroy();
        saleCarChartInstance = new Chart(carCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(count),
                datasets: [{ label: 'Số CT', data: Object.values(count), backgroundColor: 'rgba(235,10,30,0.6)', borderRadius: 6, borderSkipped: false }]
            },
            options: {
                responsive: true, indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, ticks: { color: '#aaa', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#aaa', font: { size: 11 } }, grid: { display: false } }
                }
            }
        });
    }
}


/* ═══════════════════════════════════════════════════════════════
   ╔═══════════════════════════════════════════════════════════╗
   ║         TRANG LỊCH SỬ SALE (saleHistory.html)            ║
   ╚═══════════════════════════════════════════════════════════╝
   ═══════════════════════════════════════════════════════════════ */

let historyFiltered = [];
let historyCountdownInterval = null;

// ─── Init History Page ───
function initSaleHistory() {
    // Load data (dùng chung saleList)
    const saved = localStorage.getItem('adminSales');
    if (saved) {
        saleList = JSON.parse(saved);
    } else if (typeof promotions !== 'undefined') {
        saleList = JSON.parse(JSON.stringify(promotions)).map(s => ({
            ...s,
            startTime: s.startTime || '00:00',
            endTime: s.endTime || '23:59',
            promoType: s.discountPercent > 0 ? 'percent' : (s.discountAmount > 0 ? 'cash' : 'gift'),
            cashAmount: s.discountAmount || 0,
            percentAmount: s.discountPercent || 0
        }));
    }

    autoCheckExpiry();
    populateHistoryCarFilter();
    filterHistory();

    // Countdown timer cập nhật mỗi giây
    if (historyCountdownInterval) clearInterval(historyCountdownInterval);
    historyCountdownInterval = setInterval(() => {
        updateHistoryCountdowns();
    }, 1000);
}

// ─── Populate car filter dropdown ───
function populateHistoryCarFilter() {
    const sel = document.getElementById('hist-filter-car');
    if (!sel) return;

    const cars = [...new Set(saleList.map(s => s.carName).filter(Boolean))];
    sel.innerHTML = '<option value="all">Tất cả xe</option>';
    cars.forEach(c => {
        sel.innerHTML += `<option value="${c}">${c}</option>`;
    });
}

// ─── Filter History ───
function filterHistory() {
    const search = (document.getElementById('hist-search')?.value || '').toLowerCase();
    const statusF = document.getElementById('hist-filter-status')?.value || 'all';
    const carF = document.getElementById('hist-filter-car')?.value || 'all';

    historyFiltered = saleList.filter(s => {
        const matchSearch = !search ||
            (s.promoTitle || '').toLowerCase().includes(search) ||
            (s.carName || '').toLowerCase().includes(search);
        const status = getSaleStatus(s);
        const matchStatus = statusF === 'all' || status === statusF ||
            (statusF === 'active' && (status === 'active' || status === 'expiring'));
        const matchCar = carF === 'all' || s.carName === carF;
        return matchSearch && matchStatus && matchCar;
    });

    renderHistoryStats();
    renderHistoryCards();
    renderHistoryExpiredTable();
}

// ─── Stats ───
function renderHistoryStats() {
    let active = 0, upcoming = 0, expired = 0;
    saleList.forEach(s => {
        const st = getSaleStatus(s);
        if (st === 'active' || st === 'expiring') active++;
        else if (st === 'upcoming') upcoming++;
        else if (st === 'expired') expired++;
    });
    const el = id => document.getElementById(id);
    if (el('hist-active')) el('hist-active').textContent = active;
    if (el('hist-upcoming')) el('hist-upcoming').textContent = upcoming;
    if (el('hist-expired')) el('hist-expired').textContent = expired;
    if (el('hist-total')) el('hist-total').textContent = saleList.length;
}

// ─── Render Active Cards (đang chạy + expiring) ───
function renderHistoryCards() {
    const container = document.getElementById('hist-active-cards');
    const countEl = document.getElementById('hist-active-count');
    const section = document.getElementById('hist-active-section');
    if (!container) return;

    const activeSales = historyFiltered.filter(s => {
        const st = getSaleStatus(s);
        return st === 'active' || st === 'expiring';
    });

    if (countEl) countEl.textContent = activeSales.length;

    if (activeSales.length === 0) {
        if (section) section.style.display = 'none';
        return;
    }
    if (section) section.style.display = 'block';

    container.innerHTML = activeSales.map(sale => {
        const used = (sale.totalSlots || 0) - (sale.remainingSlots || 0);
        const total = sale.totalSlots || 0;
        const progress = total > 0 ? Math.round((used / total) * 100) : 0;
        const end = new Date(`${sale.endDate}T${sale.endTime || '23:59'}:00`);
        const hoursLeft = (end - new Date()) / 3600000;
        const isUrgent = hoursLeft <= 24;

        let discountText = '';
        if (sale.cashAmount > 0) discountText = `Giảm ${fmtVND(sale.cashAmount)}`;
        else if (sale.percentAmount > 0) discountText = `Giảm ${sale.percentAmount}%`;
        else discountText = 'Quà tặng';

        return `
            <div class="hist-card">
                <span class="hist-card__badge">${sale.badge || 'HOT'}</span>
                <div class="hist-card__header">
                    <img src="${sale.carImage}" class="hist-card__img" alt="" onerror="this.style.display='none'">
                    <div>
                        <div class="hist-card__title">${sale.promoTitle || 'KM'}</div>
                        <div class="hist-card__car">${sale.carName}</div>
                    </div>
                </div>

                <div class="hist-card__price">
                    ${sale.originalPrice ? `<span class="hist-card__original">${fmtVND(sale.originalPrice)}</span>` : ''}
                    <span class="hist-card__sale">${discountText}</span>
                </div>

                <div class="hist-card__progress">
                    <div class="hist-card__progress-bar">
                        <div class="hist-card__progress-fill" style="width:${progress}%"></div>
                    </div>
                    <div class="hist-card__progress-label">
                        <span>${used} / ${total} suất</span>
                        <span>${progress}%</span>
                    </div>
                </div>

                <div class="hist-card__countdown ${isUrgent ? 'urgent' : ''}" data-end="${sale.endDate}T${sale.endTime || '23:59'}:00">
                    <i class="fa fa-clock"></i>
                    <span class="countdown-text">Còn ${fmtCountdown(sale.endDate, sale.endTime)}</span>
                </div>

                <div class="hist-card__actions">
                    <button class="hist-btn-edit" onclick="navigateTo('saleManager.html', document.querySelector('[data-page=sales]')); setTimeout(() => editSale('${sale.id}'), 500)">
                        <i class="fa fa-pen"></i> Sửa
                    </button>
                    <button class="hist-btn-pause" onclick="histTogglePause('${sale.id}')">
                        <i class="fa fa-${sale.isActive ? 'pause' : 'play'}"></i> ${sale.isActive ? 'Tạm dừng' : 'Kích hoạt'}
                    </button>
                    <button class="hist-btn-delete" onclick="histDeleteSale('${sale.id}')">
                        <i class="fa fa-trash"></i> Xóa
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ─── Render Expired Table ───
function renderHistoryExpiredTable() {
    const tbody = document.getElementById('hist-expired-tbody');
    const countEl = document.getElementById('hist-expired-count');
    if (!tbody) return;

    const expired = historyFiltered.filter(s => {
        const st = getSaleStatus(s);
        return st === 'expired' || st === 'paused' || st === 'upcoming';
    });

    if (countEl) countEl.textContent = expired.length;

    if (expired.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:#666;">Chưa có dữ liệu</td></tr>`;
        return;
    }

    const typeLabels = { cash: 'Tiền mặt', percent: '% Giảm', gift: 'Quà tặng', combo: 'Kết hợp' };

    tbody.innerHTML = expired.map(sale => {
        const used = (sale.totalSlots || 0) - (sale.remainingSlots || 0);
        const total = sale.totalSlots || 0;
        const eff = total > 0 ? Math.round((used / total) * 100) : 0;

        let effHTML = '';
        if (eff >= 70) effHTML = `<span class="eff-good">✅ Tốt (${eff}%)</span>`;
        else if (eff >= 30) effHTML = `<span class="eff-avg">⚠️ TB (${eff}%)</span>`;
        else effHTML = `<span class="eff-low">❌ Thấp (${eff}%)</span>`;

        let discountText = '';
        if (sale.cashAmount > 0) discountText = fmtVND(sale.cashAmount);
        else if (sale.percentAmount > 0) discountText = sale.percentAmount + '%';
        else discountText = 'Quà tặng';

        const promoType = sale.promoType || 'cash';
        const status = getSaleStatus(sale);
        const statusMap = {
            expired: '<span class="status-badge status-badge--expired">⚫ Kết thúc</span>',
            paused: '<span class="status-badge status-badge--upcoming">⏸️ Tạm dừng</span>',
            upcoming: '<span class="status-badge status-badge--upcoming">🟡 Sắp chạy</span>'
        };

        return `
            <tr>
                <td><strong style="color:#fff;">${sale.promoTitle || 'KM'}</strong></td>
                <td>${sale.carName}</td>
                <td><small style="color:#aaa;">${typeLabels[promoType] || promoType}</small></td>
                <td style="color:#EB0A1E; font-weight:700;">${discountText}</td>
                <td><small>${fmtDateTime(sale.startDate, sale.startTime)}</small></td>
                <td><small>${fmtDateTime(sale.endDate, sale.endTime)}</small></td>
                <td style="text-align:center;">${used}/${total}</td>
                <td>${effHTML}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-delete" title="Xóa" onclick="histDeleteSale('${sale.id}')"><i class="fa fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ─── History Page Actions ───
function histTogglePause(saleId) {
    const sale = saleList.find(s => s.id === saleId);
    if (!sale) return;
    sale.isActive = !sale.isActive;
    saveSalesToStorage();
    filterHistory();
    showToast(sale.isActive ? '🟢 Đã kích hoạt' : '⏸️ Đã tạm dừng', 'info');
}

function histDeleteSale(saleId) {
    const sale = saleList.find(s => s.id === saleId);
    if (!sale) return;
    showConfirm('Xóa khuyến mãi?', `Xóa "${sale.promoTitle || sale.carName}"?`, () => {
        saleList = saleList.filter(s => s.id !== saleId);
        saveSalesToStorage();
        filterHistory();
        showToast('🗑️ Đã xóa', 'warning');
    });
}

// ─── Real-time Countdown Update ───
function updateHistoryCountdowns() {
    const els = document.querySelectorAll('.hist-card__countdown');
    els.forEach(el => {
        const endStr = el.dataset.end;
        if (!endStr) return;
        const end = new Date(endStr);
        const now = new Date();
        const diff = end - now;

        if (diff <= 0) {
            el.querySelector('.countdown-text').textContent = 'Đã hết hạn';
            el.classList.add('urgent');
            return;
        }

        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);

        let text = '';
        if (days > 0) text = `Còn ${days}n ${hours}h ${mins}p`;
        else if (hours > 0) text = `Còn ${hours}h ${mins}p ${secs}s`;
        else text = `Còn ${mins}p ${secs}s`;

        el.querySelector('.countdown-text').textContent = text;

        const hoursLeft = diff / 3600000;
        if (hoursLeft <= 24) el.classList.add('urgent');
        else el.classList.remove('urgent');
    });
}

// ─── Export History CSV ───
function exportHistoryCSV() {
    const statusF = document.getElementById('hist-filter-status')?.value || 'all';
    exportSalesCSV(statusF === 'all' ? null : statusF);
}

