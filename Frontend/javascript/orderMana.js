/* ═══════════════════════════════════════
   ORDERMANA.JS — Quản lý Lịch đặt cọc
   N18-AUTO Admin | 5 trạng thái | SVG only
   ═══════════════════════════════════════ */

let orders = [];
let allCars = [];
let currentTab = 'all';
let pendingDepositOrderId = null; // Đơn đang chờ nhập ngày hết hạn cọc
let selectedOrderIds = new Set(); // Chứa _id các đơn được chọn

const STATUS_MAP = {
    'pending':         { label: 'Chờ xác nhận', color: '#C8102E' },
    'deposited':       { label: 'Đã đặt cọc',  color: '#F5A623' },
    'purchased':       { label: 'Đã mua',       color: '#27AE60' },
    'cancelled':       { label: 'Đã hủy',       color: '#DC3545' },
    'deposit_expired': { label: 'Hủy cọc',      color: '#A855F7' },
    // Backward compat
    'cho_xac_nhan': { label: 'Chờ xác nhận', color: '#C8102E' },
    'da_coc':       { label: 'Đã đặt cọc',  color: '#F5A623' },
    'da_mua':       { label: 'Đã mua',       color: '#27AE60' },
    'huy':          { label: 'Đã hủy',       color: '#DC3545' }
};

// Normalize old statuses to new
function normalizeStatus(s) {
    const map = { 'cho_xac_nhan':'pending', 'da_coc':'deposited', 'da_mua':'purchased', 'huy':'cancelled' };
    return map[s] || s || 'pending';
}

const SVG = {
    clock: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    creditCard: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
    checkCircle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    xCircle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    alertTriangle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`,
    warningSmall: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
};

const TABS = [
    { key: 'all',             label: 'Tất cả' },
    { key: 'pending',         label: 'Chờ xác nhận' },
    { key: 'deposited',       label: 'Đã đặt cọc' },
    { key: 'purchased',       label: 'Đã mua' },
    { key: 'cancelled',       label: 'Đã hủy' },
    { key: 'deposit_expired', label: 'Hủy cọc' }
];

const STATUS_OPTIONS = [
    { value: 'pending',         label: 'Chờ xác nhận', validTransitions: ['pending', 'pending_payment', 'deposited', 'cancelled'] },
    { value: 'pending_payment', label: 'Chờ thanh toán', validTransitions: ['pending_payment', 'deposited', 'cancelled', 'deposit_expired'] },
    { value: 'deposited',       label: 'Đã đặt cọc',  validTransitions: ['deposited', 'purchased', 'deposit_expired', 'cancelled'] },
    { value: 'purchased',       label: 'Đã mua',      validTransitions: ['purchased'] },
    { value: 'cancelled',       label: 'Đã hủy',      validTransitions: ['cancelled'] },
    { value: 'deposit_expired', label: 'Hủy cọc',     validTransitions: ['deposit_expired'] }
];

// ─── Fetch data ───
async function fetchOrdersFromServer() {
    try {
        const [ordersRes, carsRes] = await Promise.all([
            adminFetch('/order/list'),
            adminFetch('/api/cars')
        ]);
        orders = await ordersRes.json();
        // Normalize statuses
        orders = orders.map(o => ({ ...o, status: normalizeStatus(o.status) }));
        allCars = await carsRes.json();
        updateStats();
        renderTabs();
        filterOrders();
        initOrderSearchAutocomplete();
    } catch (e) {
        console.error('Error fetching orders:', e);
    }
}

// ─── Init autocomplete cho order search ───
function initOrderSearchAutocomplete() {
    const searchInput = document.getElementById('order-search');
    if (!searchInput || searchInput._acInitialized) return;
    searchInput._acInitialized = true;

    if (typeof initSearchAutocomplete === 'function') {
        initSearchAutocomplete({
            inputId: 'order-search',
            getItems: () => orders,
            getSuggestionText: (o) => o.name || '—',
            getSuggestionSub: (o) => o.phoneNumber || '',
            matchFn: (o, term) => {
                return (o.name || '').toLowerCase().includes(term) ||
                       (o.phoneNumber || '').includes(term);
            },
            onFilter: (term, selectedItem) => {
                selectedOrderFromAutocomplete = selectedItem;
                const input = document.getElementById('order-search');
                if (input) input.value = term;
                filterOrders();
            },
            placeholder: 'Tìm SĐT / tên khách...'
        });
    }
}

function getCarName(carId) {
    const car = allCars.find(c => String(c.id) === String(carId));
    return car ? car.name : `#${carId}`;
}
function formatDate(d) { return d ? new Date(d).toLocaleDateString('vi-VN') : '—'; }
function formatVND(a) { return a ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(a) : '—'; }

// ─── Stat Cards ───
function updateStats() {
    const el = document.getElementById('order-stats');
    if (!el) return;
    const c = { pending: 0, deposited: 0, purchased: 0, cancelled: 0, deposit_expired: 0 };
    orders.forEach(o => { if (c[o.status] !== undefined) c[o.status]++; });

    el.innerHTML = `
        <div class="om-stat om-stat--pending">
            <div class="om-stat__icon">${SVG.clock}</div>
            <div class="om-stat__number">${c.pending}</div>
            <div class="om-stat__label">Chờ xác nhận</div>
        </div>
        <div class="om-stat om-stat--deposited">
            <div class="om-stat__icon">${SVG.creditCard}</div>
            <div class="om-stat__number">${c.deposited}</div>
            <div class="om-stat__label">Đã đặt cọc</div>
        </div>
        <div class="om-stat om-stat--purchased">
            <div class="om-stat__icon">${SVG.checkCircle}</div>
            <div class="om-stat__number">${c.purchased}</div>
            <div class="om-stat__label">Đã mua</div>
        </div>
        <div class="om-stat om-stat--cancelled">
            <div class="om-stat__icon">${SVG.xCircle}</div>
            <div class="om-stat__number">${c.cancelled}</div>
            <div class="om-stat__label">Đã hủy</div>
        </div>
        <div class="om-stat om-stat--expired">
            <div class="om-stat__icon">${SVG.alertTriangle}</div>
            <div class="om-stat__number">${c.deposit_expired}</div>
            <div class="om-stat__label">Hủy cọc</div>
        </div>`;
}

// ─── Tab Bar ───
function renderTabs() {
    const el = document.getElementById('order-tabs');
    if (!el) return;
    const c = { all: orders.length, pending: 0, deposited: 0, purchased: 0, cancelled: 0, deposit_expired: 0 };
    orders.forEach(o => { if (c[o.status] !== undefined) c[o.status]++; });

    el.innerHTML = TABS.map(t => `
        <button class="om-tab ${currentTab === t.key ? 'active' : ''}" onclick="setTab('${t.key}')">
            ${t.label} <span class="om-tab__count">${c[t.key]}</span>
        </button>
    `).join('');
}

function setTab(key) {
    currentTab = key;
    renderTabs();
    filterOrders();
}

// ─── Filter & Render ───
let selectedOrderFromAutocomplete = null;

function filterOrders() {
    const search = (document.getElementById('order-search')?.value || '').toLowerCase().trim();
    let filtered = orders;

    if (selectedOrderFromAutocomplete) {
        filtered = [selectedOrderFromAutocomplete];
    } else {
        if (currentTab !== 'all') {
            filtered = filtered.filter(o => o.status === currentTab);
        }
        if (search) {
            filtered = filtered.filter(o =>
                (o.name || '').toLowerCase().includes(search) ||
                (o.phoneNumber || '').includes(search)
            );
        }
    }
    renderTable(filtered);
}

function getDepositBadge(order) {
    if (order.status !== 'deposited' || !order.deposit_expire_date) return '';
    const now = new Date();
    const expire = new Date(order.deposit_expire_date);
    const daysLeft = Math.ceil((expire - now) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
        return `<span class="om-badge om-badge--danger">${SVG.warningSmall} Quá hạn</span>`;
    }
    if (daysLeft <= 3) {
        return `<span class="om-badge om-badge--warning">${SVG.warningSmall} Còn ${daysLeft}d</span>`;
    }
    return '';
}

function renderTable(list) {
    const tbody = document.getElementById('order-table');
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="10" class="om-empty">Không có đơn hàng nào</td></tr>`;
        updateCheckAllState();
        return;
    }

    tbody.innerHTML = list.map((o, i) => {
        const status = o.status;
        const badge = getDepositBadge(o);
        const expireDisplay = o.deposit_expire_date ? formatDate(o.deposit_expire_date) : '—';
        const dateDisplay = o.date ? formatDate(o.date) : '—';
        const isExpiredRow = (status === 'deposit_expired') || 
            (status === 'deposited' && o.deposit_expire_date && new Date(o.deposit_expire_date) < new Date());
        const isChecked = selectedOrderIds.has(o._id);

        // Trạng thái cọc — hệ thống chỉ ghi nhận thanh toán tiền cọc, "Mừa xe" là nhân viên xác nhận thủ công
        let paymentBadge;
        if (status === 'purchased') {
            paymentBadge = '<span style="color:#27AE60;font-weight:700;">✅ Đã mua xe</span>';
        } else if (status === 'deposited') {
            paymentBadge = '<span style="color:#F5A623;font-weight:700;">💰 Đã cọc</span>';
        } else if (status === 'pending_payment') {
            paymentBadge = '<span style="color:#60a5fa;">⏳ Chờ TT cọc</span>';
        } else if (status === 'deposit_expired') {
            paymentBadge = '<span style="color:#A855F7;">❌ Hết hạn cọc</span>';
        } else {
            paymentBadge = '<span style="color:#555;">Chưa cọc</span>';
        }

        // F5/G5: Lọc trạng thái hợp lệ
        const currentOption = STATUS_OPTIONS.find(opt => opt.value === status) || { validTransitions: STATUS_OPTIONS.map(o => o.value) };
        const validOptions = STATUS_OPTIONS.filter(opt => currentOption.validTransitions.includes(opt.value) || opt.value === status);

        return `
        <tr class="${isExpiredRow ? 'om-table__expired' : ''}">
            <td>
                <input type="checkbox" class="om-checkbox row-check" data-id="${o._id}"
                    ${isChecked ? 'checked' : ''} onchange="onRowCheck(this)">
            </td>
            <td style="color:#555;">${i + 1}</td>
            <td style="color:#ddd;font-weight:500;">${o.name || '—'}</td>
            <td>${o.phoneNumber || '—'}</td>
            <td style="color:#ddd;">${getCarName(o.carId)}</td>
            <td>${formatDate(o.createdAt)}</td>
            <td>${dateDisplay}</td>
            <td>${expireDisplay} ${badge}</td>
            <td>${formatVND(o.depositAmount)}</td>
            <td>${paymentBadge}</td>
            <td>
                <select class="om-status-select" onchange="onStatusChange('${o._id}', this.value, '${status}')" ${validOptions.length <= 1 ? 'disabled' : ''}>
                    ${validOptions.map(s =>
                        `<option value="${s.value}" ${s.value === status ? 'selected' : ''}>${s.label}</option>`
                    ).join('')}
                </select>
            </td>
            <td>
                <button class="om-btn-delete" onclick="deleteOrder('${o._id}')" title="Xóa">${SVG.trash}</button>
            </td>
        </tr>`;
    }).join('');

    updateCheckAllState();
}

// ═══════════════════════
// CHECKBOX & BULK SELECT
// ═══════════════════════
function onRowCheck(checkbox) {
    const id = checkbox.dataset.id;
    if (checkbox.checked) {
        selectedOrderIds.add(id);
    } else {
        selectedOrderIds.delete(id);
    }
    updateBulkBar();
    updateCheckAllState();
}

function toggleCheckAll(masterCb) {
    const rowChecks = document.querySelectorAll('.row-check');
    rowChecks.forEach(cb => {
        cb.checked = masterCb.checked;
        if (masterCb.checked) selectedOrderIds.add(cb.dataset.id);
        else selectedOrderIds.delete(cb.dataset.id);
    });
    updateBulkBar();
}

function updateCheckAllState() {
    const masterCb = document.getElementById('check-all');
    if (!masterCb) return;
    const rowChecks = Array.from(document.querySelectorAll('.row-check'));
    if (!rowChecks.length) { masterCb.checked = false; masterCb.indeterminate = false; return; }
    const checkedCount = rowChecks.filter(cb => cb.checked).length;
    masterCb.checked = checkedCount === rowChecks.length;
    masterCb.indeterminate = checkedCount > 0 && checkedCount < rowChecks.length;
}

function updateBulkBar() {
    const bar = document.getElementById('bulk-action-bar');
    const countEl = document.getElementById('bulk-count');
    if (!bar || !countEl) return;
    const count = selectedOrderIds.size;
    bar.style.display = count > 0 ? 'flex' : 'none';
    countEl.textContent = count;
}

function clearSelection() {
    selectedOrderIds.clear();
    document.querySelectorAll('.row-check').forEach(cb => cb.checked = false);
    const masterCb = document.getElementById('check-all');
    if (masterCb) { masterCb.checked = false; masterCb.indeterminate = false; }
    updateBulkBar();
}

// ═══════════════════════════════════════
// CUSTOM CONFIRM MODAL — sử dụng showConfirm() từ manager.js
// (Hàm showConfirm đã được hợp nhất trong manager.js, hỗ trợ cả callback và Promise)
// ═══════════════════════════════════════

// ═══════════════════════════════════════
// STATUS CHANGE HANDLER
// ═══════════════════════════════════════
async function onStatusChange(orderId, newStatus, oldStatus) {
    if (newStatus === oldStatus) return;
    
    const order = orders.find(o => o._id === orderId);

    // Khi chuyển → deposited: tự lấy ngày hẹn (order.date) làm hạn cọc, chỉ hỏi tiền cọc nếu chưa có
    if (newStatus === 'deposited') {
        if (order && order.depositAmount > 0) {
            // Đã có tiền cọc → chỉ confirm, tự set hạn cọc = ngày hẹn
            const expireLabel = order.date
                ? `<strong>${new Date(order.date).toLocaleDateString('vi-VN')}</strong> (ngày hẹn xem xe)`
                : 'tự động tính';
            const confirmed = await showConfirm(
                `Xác nhận <span>Đã cọc</span>`,
                `Xác nhận khách đã chuyển cọc <span class="om-confirm__highlight">${formatVND(order.depositAmount)}</span>?<br><br><small style="color:#4ade80">📅 Hạn cọc = ${expireLabel}</small>`
            );
            if (!confirmed) { filterOrders(); return; }
            doChangeStatus(orderId, newStatus, {
                deposit_expire_date: order.date || undefined
            });
            return;
        }
        // Chưa có tiền cọc → mở modal chỉ nhập tiền
        pendingDepositOrderId = orderId;
        openDepositModal(orderId);
        return;
    }

    // G4: Cảnh báo khi purchased
    let extraMsg = '';
    if (newStatus === 'purchased') {
        extraMsg = '<br><br><small style="color:#F5A623">⚠️ Đơn sẽ hoàn tất. Khách hàng có thể đặt lại xe này sau khi thanh toán mua xe.</small>';
    }

    // Các trạng thái khác → custom confirm modal
    const label = STATUS_MAP[newStatus]?.label || newStatus;
    const confirmed = await showConfirm(
        `Đổi <span>trạng thái</span>`,
        `Bạn muốn chuyển đơn này sang trạng thái <span class="om-confirm__highlight">"${label}"</span>?${extraMsg}`
    );

    if (!confirmed) {
        filterOrders(); // revert dropdown
        return;
    }
    doChangeStatus(orderId, newStatus);
}

// Gọi API đổi trạng thái
async function doChangeStatus(orderId, newStatus, extraData = {}) {
    try {
        const body = { status: newStatus, ...extraData };
        const res = await adminFetch(`/order/${orderId}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message);
        }
        const updated = await res.json();
        updated.status = normalizeStatus(updated.status);
        const idx = orders.findIndex(o => o._id === orderId);
        if (idx >= 0) orders[idx] = updated;

        updateStats();
        renderTabs();
        filterOrders();
        return true;
    } catch (e) {
        await showConfirm('Lỗi', `<span style="color:#DC3545">${e.message}</span>`);
        filterOrders();
        return false;
    }
}

// ═══════════════════════════════════════
// DEPOSIT MODAL — Tiền cọc + Calendar Picker
// ═══════════════════════════════════════

let calendarState = {
    viewMonth: null, // Date object for displayed month
    selectedDate: null, // Date object for selected date
    minDate: null,
    maxDate: null
};

function getCarPrice(carId) {
    const car = allCars.find(c => String(c.id) === String(carId));
    return car ? (car.Price || 0) : 0;
}

const MONTH_NAMES_VI = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];
const DOW_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function isSameDay(a, b) {
    return a && b && a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function renderCalendar() {
    const container = document.getElementById('deposit-calendar');
    if (!container) return;

    const { viewMonth, selectedDate, minDate, maxDate } = calendarState;
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const today = new Date();

    // First day of month and how many days
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    let html = `
        <div class="om-calendar__header">
            <button class="om-calendar__nav" onclick="calendarNav(-1)" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="om-calendar__month">${MONTH_NAMES_VI[month]} ${year}</span>
            <button class="om-calendar__nav" onclick="calendarNav(1)" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
        </div>
        <div class="om-calendar__grid">
    `;

    // Day of week headers
    DOW_VI.forEach(d => { html += `<div class="om-calendar__dow">${d}</div>`; });

    // Previous month filler days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        html += `<div class="om-calendar__day other-month disabled">${day}</div>`;
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const classes = ['om-calendar__day'];

        const isDisabled = (minDate && date < minDate) || (maxDate && date > maxDate);
        if (isDisabled) classes.push('disabled');
        if (isSameDay(date, today)) classes.push('today');
        if (isSameDay(date, selectedDate)) classes.push('selected');

        const onclick = isDisabled ? '' : `onclick="calendarSelectDay(${d})"`;
        html += `<div class="${classes.join(' ')}" ${onclick}>${d}</div>`;
    }

    // Next month filler days
    const totalCells = firstDay + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
        html += `<div class="om-calendar__day other-month disabled">${i}</div>`;
    }

    html += `</div>`;

    // Footer: Clear + Hôm nay
    html += `
        <div class="om-calendar__footer">
            <button class="om-calendar__footer-btn" onclick="calendarClear()" type="button">Xóa</button>
            <button class="om-calendar__footer-btn" onclick="calendarToday()" type="button">Hôm nay</button>
        </div>
    `;

    container.innerHTML = html;
}

function calendarNav(dir) {
    calendarState.viewMonth.setMonth(calendarState.viewMonth.getMonth() + dir);
    renderCalendar();
}

function calendarSelectDay(day) {
    const { viewMonth, minDate, maxDate } = calendarState;
    const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);

    if ((minDate && date < minDate) || (maxDate && date > maxDate)) return;

    calendarState.selectedDate = date;
    syncCalendarToInput();
    renderCalendar();
    clearFieldError('deposit-expire');
}

function calendarClear() {
    calendarState.selectedDate = null;
    document.getElementById('deposit-expire-input').value = '';
    document.getElementById('deposit-expire-value').value = '';
    renderCalendar();
}

function calendarToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { minDate, maxDate } = calendarState;
    if ((minDate && today < minDate) || (maxDate && today > maxDate)) return;

    calendarState.selectedDate = today;
    calendarState.viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    syncCalendarToInput();
    renderCalendar();
    clearFieldError('deposit-expire');
}

function syncCalendarToInput() {
    const { selectedDate } = calendarState;
    const textInput = document.getElementById('deposit-expire-input');
    const hiddenInput = document.getElementById('deposit-expire-value');

    const expireHint = document.getElementById('deposit-expire-hint');

    if (selectedDate) {
        const dd = String(selectedDate.getDate()).padStart(2, '0');
        const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const yyyy = selectedDate.getFullYear();
        textInput.value = `${dd}/${mm}/${yyyy}`;
        hiddenInput.value = `${yyyy}-${mm}-${dd}`;
        
        if (expireHint) {
            expireHint.innerHTML = `Đơn sẽ hết hạn lúc <strong>00:00 ngày ${dd}/${mm}/${yyyy}</strong>`;
            expireHint.style.color = '#4ade80';
        }
    } else {
        textInput.value = '';
        hiddenInput.value = '';
    }
}

function handleCalendarTextInput(e) {
    let v = e.target.value.replace(/[^0-9/]/g, '');

    // Auto-insert / after dd and mm
    if (v.length === 2 && !v.includes('/')) v += '/';
    if (v.length === 5 && v.split('/').length === 2) v += '/';
    e.target.value = v;
}

// ─── Open / Close Deposit Modal ───

function openDepositModal(orderId) {
    const order = orders.find(o => o._id === orderId);
    if (!order) return;

    const carPrice = getCarPrice(order.carId);
    const suggestedDeposit = order.depositAmount > 0 ? order.depositAmount : Math.round(carPrice * 0.1);
    const carName = getCarName(order.carId);

    // Thông tin xe
    const carInfoEl = document.getElementById('deposit-car-info');
    carInfoEl.innerHTML = `
        <strong>${carName}</strong> — 
        Giá xe: <span class="om-modal__car-price">${carPrice ? formatVND(carPrice) : 'Chưa có giá'}</span>
    `;

    // Tiền cọc (gợi ý 10%)
    const amountInput = document.getElementById('deposit-amount-input');
    const amountHint = document.getElementById('deposit-amount-hint');
    amountInput.value = suggestedDeposit > 0 ? suggestedDeposit : '';
    amountHint.textContent = suggestedDeposit > 0
        ? `Gợi ý: 10% giá xe = ${formatVND(suggestedDeposit)}`
        : 'Nhập số tiền cọc theo thỏa thuận';

    // Hạn cọc = ngày hẹn (tự động, không cần chọn)
    const expireHint = document.getElementById('deposit-expire-hint');
    if (expireHint) {
        if (order.date) {
            expireHint.innerHTML = `📅 Hạn cọc = <strong>${new Date(order.date).toLocaleDateString('vi-VN')}</strong> (ngày hẹn xem xe)`;
            expireHint.style.color = '#4ade80';
        } else {
            expireHint.innerHTML = 'Hạn cọc sẽ được hệ thống tự tính';
            expireHint.style.color = '#888';
        }
    }

    clearFieldError('deposit-amount');
    document.getElementById('depositModal').classList.add('active');
}

function closeDepositModal() {
    document.getElementById('depositModal').classList.remove('active');
    pendingDepositOrderId = null;
    filterOrders();
}

// ── Validation helpers ──
function showFieldError(prefix, message) {
    const errEl = document.getElementById(prefix + '-error');
    const inputEl = document.getElementById(prefix + '-input');
    if (errEl) {
        errEl.querySelector('span').textContent = message;
        errEl.classList.add('show');
    }
    if (inputEl) inputEl.classList.add('om-modal__input--error');
}

function clearFieldError(prefix) {
    const errEl = document.getElementById(prefix + '-error');
    const inputEl = document.getElementById(prefix + '-input');
    if (errEl) errEl.classList.remove('show');
    if (inputEl) inputEl.classList.remove('om-modal__input--error');
}

async function confirmDeposit() {
    clearFieldError('deposit-amount');

    // Validate tiền cọc
    const amountInput = document.getElementById('deposit-amount-input');
    const amount = Number(amountInput.value);
    if (!amountInput.value || isNaN(amount) || amount <= 0) {
        showFieldError('deposit-amount', 'Vui lòng nhập số tiền cọc hợp lệ (> 0)');
        return;
    }

    const orderId = pendingDepositOrderId;
    const order = orders.find(o => o._id === orderId);
    document.getElementById('depositModal').classList.remove('active');
    pendingDepositOrderId = null;

    // Tự lấy ngày hẹn làm hạn cọc, không cần admin chọn
    const depositExpireDate = order?.date || undefined;

    const success = await doChangeStatus(orderId, 'deposited', {
        depositAmount: amount,
        deposit_expire_date: depositExpireDate
    });
    if (!success) filterOrders();
}

// ═══════════════════════════════════════
// AUTO EXPIRE & CLEANUP
// ═══════════════════════════════════════
async function autoExpireAll() {
    try {
        const res = await adminFetch('/order/auto-expire-all');
        const data = await res.json();
        await showConfirm('Kết quả', data.message);
        fetchOrdersFromServer();
    } catch (e) {
        await showConfirm('Lỗi', 'Không thể kiểm tra hết hạn');
    }
}

async function cleanupCancelled() {
    const ok = await showConfirm(
        'Dọn dẹp <span>đơn hủy</span>',
        'Dọn dẹp tất cả đơn <span class="om-confirm__highlight">"Đã hủy"</span> cũ hơn 6 tháng?<br>Đơn "Hủy cọc" sẽ <strong>KHÔNG</strong> bị xóa.'
    );
    if (!ok) return;
    try {
        const res = await adminFetch('/order/cleanup-cancelled', { method: 'DELETE' });
        const data = await res.json();
        await showConfirm('Kết quả', data.message);
        fetchOrdersFromServer();
    } catch (e) {
        await showConfirm('Lỗi', 'Không thể dọn dẹp');
    }
}

async function deleteOrder(orderId) {
    const ok = await showConfirm(
        'Xóa <span>đơn hàng</span>',
        'Bạn có chắc muốn xóa đơn hàng này?<br>Stock sẽ được hoàn lại nếu đơn chưa hủy.'
    );
    if (!ok) return;
    try {
        const res = await adminFetch(`/order/${orderId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Xóa thất bại');
        orders = orders.filter(o => o._id !== orderId);
        selectedOrderIds.delete(orderId);
        updateStats();
        renderTabs();
        filterOrders();
        updateBulkBar();
    } catch (e) {
        await showConfirm('Lỗi', e.message);
    }
}

// ═══════════════════════
// BULK DELETE (Xóa đã chọn + Xóa tất cả)
// ═══════════════════════
async function deleteSelectedOrders() {
    const ids = Array.from(selectedOrderIds);
    if (!ids.length) return;

    const ok = await showConfirm(
        'Xóa <span>đơn đã chọn</span>',
        `Xóa <strong>${ids.length} đơn hàng</strong> đã chọn?<br><small style="color:#888">Hành động này không thể hoàn tác.</small>`
    );
    if (!ok) return;

    let successCount = 0;
    let failCount = 0;
    for (const id of ids) {
        try {
            const res = await adminFetch(`/order/${id}`, { method: 'DELETE' });
            if (res.ok) {
                orders = orders.filter(o => o._id !== id);
                selectedOrderIds.delete(id);
                successCount++;
            } else {
                failCount++;
            }
        } catch {
            failCount++;
        }
    }

    updateStats();
    renderTabs();
    filterOrders();
    updateBulkBar();

    const msg = failCount > 0
        ? `Đã xóa <strong>${successCount}</strong> đơn. <span style="color:#DC3545">${failCount} đơn thất bại.</span>`
        : `Đã xóa thành công <strong>${successCount}</strong> đơn hàng!`;
    await showConfirm('Kết quả', msg);
}

async function deleteAllOrders() {
    if (!orders.length) {
        await showConfirm('Thông báo', 'Không có đơn hàng nào để xóa.');
        return;
    }
    const ok = await showConfirm(
        'Xóa <span>tất cả đơn hàng</span>',
        `Xóa toàn bộ <strong>${orders.length} đơn hàng</strong>?<br><span style="color:#DC3545;font-weight:700">⚠️ Hành động này sẽ xóa tất cả và không thể hoàn tác!</span>`
    );
    if (!ok) return;

    const allIds = orders.map(o => o._id);
    let successCount = 0;
    for (const id of allIds) {
        try {
            const res = await adminFetch(`/order/${id}`, { method: 'DELETE' });
            if (res.ok) {
                successCount++;
            }
        } catch { /* bỏ qua */ }
    }

    orders = [];
    selectedOrderIds.clear();
    updateStats();
    renderTabs();
    filterOrders();
    updateBulkBar();
    await showConfirm('Kết quả', `Đã xóa thành công <strong>${successCount}/${allIds.length}</strong> đơn hàng.`);
}
