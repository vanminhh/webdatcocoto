let inventoryDataCache = [];

// ─── Fetch and render inventory list ───
async function fetchInventory() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/inventory', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            console.error('Lỗi khi tải dữ liệu tồn kho:', await response.text());
            return;
        }

        const data = await response.json();
        inventoryDataCache = data;
        renderInventoryTable(data);
        initInventorySearchAutocomplete();
    } catch (error) {
        console.error('Error fetching inventory:', error);
    }
}

// ─── Init autocomplete cho inventory search ───
function initInventorySearchAutocomplete() {
    const searchInput = document.getElementById('search-inventory');
    if (!searchInput || searchInput._acInitialized) return;
    searchInput._acInitialized = true;

    if (typeof initSearchAutocomplete === 'function') {
        initSearchAutocomplete({
            inputId: 'search-inventory',
            getItems: () => inventoryDataCache,
            getSuggestionText: (inv) => {
                const carName = inv.carObjectId?.name || 'Không xác định';
                return `${inv.carCode} — ${carName}`;
            },
            getSuggestionSub: (inv) => `KD: ${inv.availableQuantity}`,
            matchFn: (inv, term) => {
                const carName = (inv.carObjectId?.name || '').toLowerCase();
                const carCode = (inv.carCode || '').toLowerCase();
                return carName.includes(term) || carCode.includes(term);
            },
            onFilter: (term, selectedItem) => {
                if (selectedItem) {
                    renderInventoryTable([selectedItem]);
                } else if (!term) {
                    renderInventoryTable(inventoryDataCache);
                } else {
                    const lowerTerm = term.toLowerCase().trim();
                    const filtered = inventoryDataCache.filter(inv => {
                        const carName = (inv.carObjectId?.name || '').toLowerCase();
                        const carCode = (inv.carCode || '').toLowerCase();
                        return carName.includes(lowerTerm) || carCode.includes(lowerTerm);
                    });
                    renderInventoryTable(filtered);
                }
            },
            placeholder: 'Tìm kiếm mã xe, tên xe...'
        });
    }
}

function renderInventoryTable(inventoryList) {
    const tableBody = document.getElementById('inventory-table');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';

    inventoryList.forEach((inv, index) => {
        const car = inv.carObjectId || {};
        const carName = car.name || 'Không xác định';
        const carURL = car.URL || './image/default-car.png';
        
        // Trạng thái còn hàng / sắp hết / hết hàng
        let statusBadge = '';
        if (inv.availableQuantity >= 3) {
            statusBadge = '<span class="badge green">Còn hàng</span>';
        } else if (inv.availableQuantity > 0) {
            statusBadge = '<span class="badge yellow">Sắp hết</span>';
        } else {
            statusBadge = '<span class="badge red">Hết hàng</span>';
        }
        
        const lastImport = inv.lastImportAt ? new Date(inv.lastImportAt).toLocaleDateString('vi-VN') : '—';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="color:#555">${index + 1}</td>
            <td style="font-weight:600; color:#fff">${inv.carCode}</td>
            <td>${carName}</td>
            <td><img src="${carURL}" alt="Car" width="50" height="35" style="object-fit:cover"></td>
            <td>${statusBadge}</td>
            <td style="color:#c084fc; font-weight:600">${inv.totalQuantity ?? '—'}</td>
            <td style="color:#60a5fa; font-weight:600">${inv.physicalQuantity ?? '—'}</td>
            <td style="color:#facc15">${inv.reservedQuantity}</td>
            <td style="color:#4ade80; font-weight:700; font-size:14px">${inv.availableQuantity}</td>
            <td style="color:#3B82F6; font-weight:600">${inv.soldQuantity ?? 0}</td>
            <td style="font-size:12px; color:#999">${lastImport}</td>
            <td>
                <button class="om-btn-action edit" onclick="openImportPanel('${inv.carCode}')" title="Nhập hàng" style="font-size:11px; padding:4px 10px; margin-right:4px; border-color: rgba(74, 222, 128, 0.4); color: #4ade80;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <button class="om-btn-action edit" onclick="viewTransactions('${inv.carCode}')" title="Xem lịch sử giao dịch" style="font-size:11px; padding:4px 10px;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// ─── Transaction History Panel ───
let allTransactions = []; // cache để filter không cần refetch

async function viewTransactions(carCode) {
    const panel = document.getElementById('inv-history-panel');
    const label = document.getElementById('inv-history-car-code');
    const carName = document.getElementById('inv-history-car-name');
    const tbody = document.getElementById('inv-tx-body');
    
    // Tìm tên xe từ cache
    const inv = inventoryDataCache.find(i => i.carCode === carCode);
    const name = inv?.carObjectId?.name || '';
    
    panel.style.display = 'block';
    label.textContent = carCode;
    if (carName) carName.textContent = name ? ` — ${name}` : '';
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#555;">Đang tải...</td></tr>`;
    
    // Reset filter
    const filterType = document.getElementById('tx-filter-type');
    const filterFrom = document.getElementById('tx-filter-from');
    const filterTo   = document.getElementById('tx-filter-to');
    if (filterType) filterType.value = '';
    if (filterFrom) filterFrom.value = '';
    if (filterTo)   filterTo.value   = '';

    // Scroll xuống panel
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/inventory/${carCode}/transactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Lỗi tải lịch sử giao dịch');
        
        allTransactions = await res.json();
        renderHistoryRows(allTransactions, tbody);
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#ef4444;">Lỗi: ${e.message}</td></tr>`;
    }
}

// C8: Enum đồng bộ với backend — KHÔNG có SELL trong enum
function getTypeLabel(type) {
    const map = {
        'IMPORT':          { label: 'Nhập kho',       color: '#4ade80' },
        'RESERVE':         { label: 'Giữ chỗ',         color: '#facc15' },
        'RELEASE':         { label: 'Nhả hàng',        color: '#60a5fa' },
        'CONFIRM_DEPOSIT': { label: 'Xác nhận cọc',    color: '#f97316' },
        'DELIVER':         { label: 'Giao xe',          color: '#c084fc' },
        'SELL':            { label: 'Bán thẳng',       color: '#ec4899' },
        'ADJUSTMENT':      { label: 'Điều chỉnh',      color: '#94a3b8' },
        'MIGRATION':       { label: 'Di chuyển DL',    color: '#64748b' }
    };
    return map[type] || { label: type, color: '#aaa' };
}

function getCreatedByLabel(createdBy) {
    if (!createdBy) return '';
    if (typeof createdBy === 'string') return createdBy;
    return createdBy.username || createdBy.name || createdBy.email || '';
}

function snapshotCell(before, after) {
    if (before === undefined && after === undefined) return '—';
    const b = before ?? '?';
    const a = after ?? '?';
    const diff = (after ?? 0) - (before ?? 0);
    let diffColor = '#888';
    let diffSign = '';
    if (diff > 0) { diffColor = '#4ade80'; diffSign = '+'; }
    else if (diff < 0) { diffColor = '#ef4444'; diffSign = ''; }
    
    return `<span style="color:#888">${b}</span> → <span style="color:#fff">${a}</span> <span style="color:${diffColor}; font-size:10px">(${diffSign}${diff})</span>`;
}

// C7: Hàm áp dụng filter
function applyHistoryFilter() {
    const type     = document.getElementById('tx-filter-type')?.value || '';
    const fromVal  = document.getElementById('tx-filter-from')?.value;
    const toVal    = document.getElementById('tx-filter-to')?.value;
    const tbody    = document.getElementById('inv-tx-body');

    let filtered = allTransactions;
    if (type)    filtered = filtered.filter(t => t.type === type);
    if (fromVal) filtered = filtered.filter(t => new Date(t.createdAt) >= new Date(fromVal));
    if (toVal)   filtered = filtered.filter(t => new Date(t.createdAt) <= new Date(toVal + 'T23:59:59'));

    renderHistoryRows(filtered, tbody);
}

// C6: Render bảng chuẩn hóa — thêm cột Người tạo và Order
function renderHistoryRows(trans, tbody) {
    tbody.innerHTML = '';
    
    if (!trans || trans.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#555;">Chưa có giao dịch nào</td></tr>`;
        return;
    }
    
    trans.forEach(t => {
        const time = new Date(t.createdAt).toLocaleString('vi-VN');
        const typeInfo = getTypeLabel(t.type);
        const createdByLabel = getCreatedByLabel(t.createdBy);
        const orderId = t.orderId ? `<a href="#" style="color:#60a5fa; font-size:10px;" title="${t.orderId}">#${String(t.orderId).slice(-6)}</a>` : '—';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-size:11px; color:#999; white-space:nowrap">${time}</td>
            <td><span style="color:${typeInfo.color}; font-weight:600; font-size:11px; white-space:nowrap; background:${typeInfo.color}18; padding:2px 7px; border-radius:4px;">${typeInfo.label}</span></td>
            <td style="font-weight:700; color:#fff; text-align:center">${t.quantity}</td>
            <td style="font-size:11px; white-space:nowrap">${snapshotCell(t.beforeTotal, t.afterTotal)}</td>
            <td style="font-size:11px; white-space:nowrap">${snapshotCell(t.beforePhysical, t.afterPhysical)}</td>
            <td style="font-size:11px; white-space:nowrap">${snapshotCell(t.beforeReserved, t.afterReserved)}</td>
            <td style="font-size:11px; white-space:nowrap">${snapshotCell(t.beforeAvailable, t.afterAvailable)}</td>
            <td style="font-size:11px; color:#888">${createdByLabel || '—'}</td>
            <td style="font-size:11px">${orderId}</td>
            <td style="font-size:11px; color:#aaa; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${t.reason || ''}">${t.reason || '—'}</td>
        `;
        tbody.appendChild(row);
    });
}

function closeHistoryPanel() {
    const panel = document.getElementById('inv-history-panel');
    if (panel) panel.style.display = 'none';
    allTransactions = [];
}


// --- Import Panel Logic ---
function openImportPanel(prefilledCarCode = '') {
    const select = document.getElementById('import-car-select');
    select.innerHTML = '<option value="">-- Chọn xe --</option>';
    
    inventoryDataCache.forEach(inv => {
        const carName = inv.carObjectId?.name || 'Không xác định';
        select.innerHTML += `<option value="${inv.carCode}">${inv.carCode} - ${carName}</option>`;
    });

    if (prefilledCarCode) {
        select.value = prefilledCarCode;
    } else {
        select.value = '';
    }

    document.getElementById('import-quantity').value = 1;
    document.getElementById('import-reason').value = '';
    
    updateImportSnapshot();

    if (typeof openAdminPanel === 'function') openAdminPanel('inventory-import-panel');
}

function updateImportSnapshot() {
    const carCode = document.getElementById('import-car-select').value;
    const display = document.getElementById('import-current-stock-display');
    
    if (!carCode) {
        display.innerHTML = '';
        return;
    }
    
    const inv = inventoryDataCache.find(i => i.carCode === carCode);
    if (inv) {
        display.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px 12px; padding:10px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                <div style="font-size:12px;">
                    <span style="color:#888;">Tổng:</span> 
                    <span style="color:#c084fc; font-weight:600;">${inv.totalQuantity ?? '—'}</span>
                </div>
                <div style="font-size:12px;">
                    <span style="color:#888;">Vật lý:</span> 
                    <span style="color:#60a5fa; font-weight:600;">${inv.physicalQuantity ?? '—'}</span>
                </div>
                <div style="font-size:12px;">
                    <span style="color:#888;">Giữ chỗ:</span> 
                    <span style="color:#facc15; font-weight:600;">${inv.reservedQuantity}</span>
                </div>
                <div style="font-size:12px;">
                    <span style="color:#888;">Khả dụng:</span> 
                    <span style="color:#4ade80; font-weight:700;">${inv.availableQuantity}</span>
                </div>
            </div>
        `;
    }
}

async function submitImportFromPanel() {
    const carCode = document.getElementById('import-car-select').value;
    const quantity = parseInt(document.getElementById('import-quantity').value);
    const reason = document.getElementById('import-reason').value.trim();
    
    if (!carCode) {
        safeToast('Vui lòng chọn xe!', 'error');
        return;
    }
    if (!quantity || quantity < 1) {
        safeToast('Số lượng nhập phải >= 1', 'error');
        return;
    }
    
    if (typeof setPanelLoading === 'function') setPanelLoading('inventory-import-panel', true);
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/inventory/import', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ carCode, quantity, reason })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Lỗi nhập hàng');
        
        safeToast('Nhập hàng thành công!', 'success');
        
        // Cập nhật lại dữ liệu và giao diện
        await fetchInventory();
        
        // Nếu panel lịch sử đang mở cho xe này thì refetch
        const currentHistoryCarCode = document.getElementById('inv-history-car-code')?.textContent;
        if (currentHistoryCarCode === carCode && document.getElementById('inv-history-panel').style.display !== 'none') {
            viewTransactions(carCode);
        }

        if (typeof closeAdminPanel === 'function') closeAdminPanel('inventory-import-panel');
    } catch (e) {
        console.error(e);
        safeToast(e.message, 'error');
    } finally {
        if (typeof setPanelLoading === 'function') setPanelLoading('inventory-import-panel', false);
    }
}

// fetchInventory() được gọi bởi manager.js khi navigate tới trang Tồn Kho

