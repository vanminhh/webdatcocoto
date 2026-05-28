// ⚠️ DEPRECATED: stockImport.html đã được gộp vào inventoryManager.html (C5).
// File này được giữ lại để rollback nếu cần. Logic nhập kho mới nằm ở inventoryMana.js.
// Các hàm getTypeLabel() và snapshotCell() đã được chuyển sang inventoryMana.js (C9).
let inventoryData = [];


async function initImportPage() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/inventory', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Lỗi tải danh sách xe');
        
        inventoryData = await response.json();
        
        const select = document.getElementById('import-car-select');
        select.innerHTML = '<option value="">-- Chọn xe --</option>';
        
        inventoryData.forEach(inv => {
            const carName = inv.carObjectId?.name || 'Không xác định';
            select.innerHTML += `<option value="${inv.carCode}">${inv.carCode} - ${carName}</option>`;
        });
    } catch (e) {
        console.error(e);
        showToast('Lỗi tải danh sách xe: ' + e.message, 'error');
    }
}

async function updateCurrentStock() {
    const carCode = document.getElementById('import-car-select').value;
    const display = document.getElementById('current-stock-display');
    const tableBody = document.getElementById('import-history-table');
    
    if (!carCode) {
        display.innerHTML = '';
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Vui lòng chọn xe để xem lịch sử</td></tr>';
        return;
    }
    
    const inv = inventoryData.find(i => i.carCode === carCode);
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

    // Tải lịch sử giao dịch
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/inventory/${carCode}/transactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Lỗi tải lịch sử');
        
        const trans = await res.json();
        renderTransactions(trans);
    } catch (e) {
        console.error(e);
    }
}

// C9: getTypeLabel() đã chuyển sang inventoryMana.js — dùng chung
// function getTypeLabel(type) { ... }

// C9: snapshotCell() đã chuyển sang inventoryMana.js — dùng chung
// function snapshotCell(before, after) { ... }


function renderTransactions(trans) {
    const tableBody = document.getElementById('import-history-table');
    tableBody.innerHTML = '';
    
    if (trans.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Chưa có giao dịch nào</td></tr>';
        return;
    }
    
    trans.forEach(t => {
        const time = new Date(t.createdAt).toLocaleString('vi-VN');
        const typeInfo = getTypeLabel(t.type);
        
        tableBody.innerHTML += `
            <tr>
                <td style="font-size:11px; color:#999; white-space:nowrap">${time}</td>
                <td style="color:${typeInfo.color}; font-weight:600; font-size:11px; white-space:nowrap">${typeInfo.label}</td>
                <td style="font-weight:700; color:#fff; text-align:center">${t.quantity}</td>
                <td style="font-size:11px; white-space:nowrap">${snapshotCell(t.beforeTotal, t.afterTotal)}</td>
                <td style="font-size:11px; white-space:nowrap">${snapshotCell(t.beforePhysical, t.afterPhysical)}</td>
                <td style="font-size:11px; white-space:nowrap">${snapshotCell(t.beforeReserved, t.afterReserved)}</td>
                <td style="font-size:11px; white-space:nowrap">${snapshotCell(t.beforeAvailable, t.afterAvailable)}</td>
                <td style="font-size:11px; color:#aaa; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${t.reason}">${t.reason || '—'}</td>
            </tr>
        `;
    });
}

async function submitImport() {
    const carCode = document.getElementById('import-car-select').value;
    const quantity = parseInt(document.getElementById('import-quantity').value);
    const reason = document.getElementById('import-reason').value.trim();
    const btn = document.getElementById('btn-submit-import');
    
    if (!carCode) {
        showToast('Vui lòng chọn xe!', 'error');
        return;
    }
    if (!quantity || quantity < 1) {
        showToast('Số lượng nhập phải >= 1', 'error');
        return;
    }
    
    // Disable form
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.textContent = 'ĐANG XỬ LÝ...';
    
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
        
        showToast('Nhập hàng thành công!', 'success');
        
        // Reset form except car
        document.getElementById('import-quantity').value = 1;
        document.getElementById('import-reason').value = '';
        
        // Cập nhật lại data cache và UI
        await initImportPage();
        document.getElementById('import-car-select').value = carCode;
        await updateCurrentStock();
        
    } catch (e) {
        console.error(e);
        showToast(e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.textContent = 'XÁC NHẬN NHẬP HÀNG';
    }
}

// initImportPage() được gọi bởi manager.js khi navigate tới trang Nhập Hàng
