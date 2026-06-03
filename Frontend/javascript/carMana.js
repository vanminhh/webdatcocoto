// ─── Helper functions ───

// ═══ IMAGE PREVIEW ═══
function updateImagePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;

    const url = input.value.trim();
    if (!url) {
        preview.classList.remove('has-image');
        preview.innerHTML = `
            <div class="preview-placeholder">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                <span>Xem trước ảnh sẽ hiển thị ở đây</span>
                <span style="font-size:11px;color:#444;">Nhập URL ảnh hoặc nhấn "Chọn ảnh từ máy tính"</span>
            </div>`;
        return;
    }

    const img = new Image();
    img.onload = function() {
        preview.classList.add('has-image');
        preview.innerHTML = `
            <img src="${url}" alt="Preview">
            <button type="button" class="preview-remove" onclick="clearImagePreview('${inputId}', '${previewId}')" title="Xóa ảnh">✕</button>`;
    };
    img.onerror = function() {
        preview.classList.remove('has-image');
        preview.innerHTML = `
            <div class="preview-placeholder" style="color:#e74c3c;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
                <span>Không thể tải ảnh — kiểm tra lại URL</span>
            </div>`;
    };
    img.src = url;
}

function clearImagePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    if (input) input.value = '';
    updateImagePreview(inputId, previewId);
}
function getFuelLabel(fuel) {
    const map = {
        'GAS': 'Xăng',
        'DIESEL': 'Dầu',
        'OIL': 'Dầu',
        'ELECTRIC': 'Điện',
        'HYBRID': 'Hybrid'
    };
    return map[fuel] || fuel || '—';
}

function formatPrice(price) {
    if (!price && price !== 0) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
}

// Mảng lưu trữ cars
let cars = [];

// Hàm khởi tạo tìm kiếm
function initCarSearchAutocomplete() {
    const searchInput = document.getElementById('search-car');
    if (!searchInput || searchInput._acInitialized) return;
    searchInput._acInitialized = true;

    if (typeof initSearchAutocomplete === 'function') {
        initSearchAutocomplete({
            inputId: 'search-car',
            getItems: () => cars,
            getSuggestionText: (car) => car.name || car.id || '—',
            getSuggestionSub: (car) => `Mã: ${car.id || '—'}`,
            matchFn: (car, term) => {
                return (car.name || '').toLowerCase().includes(term) ||
                       (car.id || '').toLowerCase().includes(term) ||
                       (car.Type || '').toLowerCase().includes(term) ||
                       getFuelLabel(car.Fuel).toLowerCase().includes(term);
            },
            onFilter: (term, selectedItem) => updateCarTable(term, selectedItem),
            placeholder: 'Tìm kiếm xe...'
        });
    } else {
        searchInput.addEventListener('input', (e) => {
            updateCarTable(e.target.value);
        });
    }
}

// Hàm lấy danh sách xe từ backend
async function fetchCarsFromServer() {
    try {
        const response = await adminFetch("/api/cars");
        if (!response.ok) throw new Error("Không thể lấy danh sách xe.");
        const data = await response.json();
        cars = data;
        updateCarTable();
        initCarSearchAutocomplete();
    } catch (error) {
        console.error("Lỗi:", error);
        safeToast("Đã xảy ra lỗi khi lấy danh sách xe.", 'error');
    }
}

// Render bảng
function updateCarTable(searchTerm = '', selectedItem = null) {
    const tableBody = document.getElementById('car-table');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const lowerTerm = searchTerm.toLowerCase().trim();

    let filteredCars = cars;
    if (selectedItem) {
        filteredCars = [selectedItem];
    } else if (lowerTerm) {
        filteredCars = cars.filter(car => {
            const nameMatch = (car.name || '').toLowerCase().includes(lowerTerm);
            const idMatch = (car.id || '').toLowerCase().includes(lowerTerm);
            const typeMatch = (car.Type || '').toLowerCase().includes(lowerTerm);
            const fuelMatch = getFuelLabel(car.Fuel).toLowerCase().includes(lowerTerm);
            return nameMatch || idMatch || typeMatch || fuelMatch;
        });
    }

    if (filteredCars.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#888;">Không tìm thấy xe nào.</td></tr>';
        return;
    }

    filteredCars.forEach((car) => {
        const index = cars.indexOf(car);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="color:#555;">${index + 1}</td>
            <td style="color:#ddd;font-weight:500;">${car.name || '—'}</td>
            <td style="color:#999;">${car.id || '—'}</td>
            <td><img src="${car.URL || ''}" alt="${car.name}" style="width:80px;height:50px;object-fit:cover;border-radius:4px;" onerror="this.src='/image/default-car.png'; this.onerror=null;"></td>
            <td style="color:#bbb;">${getFuelLabel(car.Fuel)}</td>
            <td style="color:#bbb;">${car.Type || '—'}</td>
            <td style="color:#bbb;">${car.seats || '—'}</td>
            <td style="color:#ddd;font-weight:600;">${formatPrice(car.Price)}</td>
            <td style="color:#bbb;">
                <span class="status-badge ${car.availableQuantity > 0 || car.stock > 0 ? 'status-badge--active' : 'status-badge--expired'}">
                    ${car.availableQuantity !== undefined ? car.availableQuantity : (car.stock || 0)}
                </span>
            </td>
            <td>
                <button class="om-btn-action edit" onclick="editCar(${index})" title="Sửa">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="om-btn-action delete" onclick="deleteCar(${index})" title="Xóa">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Thêm xe
function openCreateCarPanel() {
    resetCarCreateForm();
    if (typeof openAdminPanel === 'function') openAdminPanel('car-create-panel');
}

function resetCarCreateForm() {
    document.getElementById('create-car-name').value = '';
    document.getElementById('create-car-id').value = '';
    document.getElementById('create-car-url').value = '';
    document.getElementById('create-car-fuel').value = 'GAS';
    document.getElementById('create-car-type').value = 'SUV';
    document.getElementById('create-car-seats').value = '';
    document.getElementById('create-car-price').value = '';
    document.getElementById('car-initial-quantity').value = '10';
    // Reset specs
    const specIds = ['create-spec-engine','create-spec-displacement','create-spec-horsepower','create-spec-torque','create-spec-transmission','create-spec-dimensions','create-spec-wheelbase','create-spec-clearance','create-spec-weight','create-spec-fueltank','create-spec-airbags','create-spec-tires'];
    specIds.forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    const driveEl = document.getElementById('create-spec-drivetrain'); if(driveEl) driveEl.value = 'FWD';
    const camEl = document.getElementById('create-spec-camera360'); if(camEl) camEl.value = 'yes';
    // Reset image preview
    updateImagePreview('create-car-url', 'create-car-preview');
}

async function submitCreateCar() {
    const name = document.getElementById('create-car-name').value.trim();
    const id = document.getElementById('create-car-id').value.trim();
    const URL = document.getElementById('create-car-url').value.trim();
    const Fuel = document.getElementById('create-car-fuel').value;
    const Type = document.getElementById('create-car-type').value;
    const seats = document.getElementById('create-car-seats').value;
    const Price = document.getElementById('create-car-price').value;
    const initialQuantity = document.getElementById('car-initial-quantity').value;

    if (!name || !id || !Price) {
        safeToast('Vui lòng điền Tên xe, Mã xe và Giá!', 'error');
        return;
    }

    if (typeof setPanelLoading === 'function') setPanelLoading('car-create-panel', true);

    try {
        // Collect specs
        const specs = {
            engine: document.getElementById('create-spec-engine')?.value.trim() || '',
            displacement: document.getElementById('create-spec-displacement')?.value.trim() || '',
            horsepower: document.getElementById('create-spec-horsepower')?.value.trim() || '',
            torque: document.getElementById('create-spec-torque')?.value.trim() || '',
            transmissionDetail: document.getElementById('create-spec-transmission')?.value.trim() || '',
            drivetrain: document.getElementById('create-spec-drivetrain')?.value || 'FWD',
            dimensions: document.getElementById('create-spec-dimensions')?.value.trim() || '',
            wheelbase: document.getElementById('create-spec-wheelbase')?.value.trim() || '',
            clearance: document.getElementById('create-spec-clearance')?.value.trim() || '',
            weight: document.getElementById('create-spec-weight')?.value.trim() || '',
            fuelTank: document.getElementById('create-spec-fueltank')?.value.trim() || '',
            airbags: document.getElementById('create-spec-airbags')?.value || '',
            tires: document.getElementById('create-spec-tires')?.value.trim() || '',
            camera360: document.getElementById('create-spec-camera360')?.value || 'yes'
        };

        const bodyData = { 
            name, 
            id, 
            URL, 
            Fuel, 
            Type, 
            seats: seats ? Number(seats) : undefined, 
            Price: Number(Price), 
            initialQuantity: Number(initialQuantity) || 0,
            specs 
        };

        const response = await adminFetch('/api/cars', {
            method: 'POST',
            body: JSON.stringify(bodyData)
        });
        
        const data = await response.json();
        
        if (response.ok || response.status === 201) {
            safeToast(data.message || 'Thêm xe thành công!', 'success');
            
            await fetchCarsFromServer();
            
            if (typeof closeAdminPanel === 'function') closeAdminPanel('car-create-panel');
        } else {
            safeToast(data.message || 'Thêm xe thất bại', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        safeToast('Lỗi khi thêm xe!', 'error');
    } finally {
        if (typeof setPanelLoading === 'function') setPanelLoading('car-create-panel', false);
    }
}

// === MODAL EDIT ===
function editCar(index) {
    const car = cars[index];
    const oldModal = document.getElementById('editModalOverlay');
    if (oldModal) oldModal.remove();

    const fuelOptions = ['GAS', 'DIESEL', 'ELECTRIC', 'HYBRID'].map(f =>
        `<option value="${f}" ${car.Fuel === f ? 'selected' : ''}>${getFuelLabel(f)}</option>`
    ).join('');

    const typeOptions = ['SUV', 'SEDAN', 'TRUCK', 'COUPE', 'HATCHBACK'].map(t =>
        `<option value="${t}" ${car.Type === t ? 'selected' : ''}>${t}</option>`
    ).join('');

    // Ảnh thư viện
    const galleryURLs = car.galleryURLs || [];
    let galleryHtml = '';
    galleryURLs.forEach((url, i) => {
        galleryHtml += `
        <div class="gallery-item" style="display:flex;gap:6px;margin-bottom:6px;align-items:center;">
            <input type="text" class="gallery-url-input" id="gallery-input-${i}-${Date.now()}" value="${url}" style="flex:1;padding:8px 12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;font-size:14px;">
            <button type="button" onclick="triggerUpload(this.previousElementSibling.id)" style="background:#4a9eff;border:none;color:#fff;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:13px;" title="Tải ảnh lên"><i class="fa fa-upload"></i></button>
            <button type="button" onclick="this.parentElement.remove()" style="background:#e74c3c;border:none;color:#fff;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:13px;">✕</button>
        </div>`;
    });

    const sp = car.specs || {};
    const driveOptions = ['FWD','RWD','AWD','4WD'].map(d =>
        `<option value="${d}" ${sp.drivetrain === d ? 'selected' : ''}>${d}</option>`
    ).join('');

    const modalHtml = `
    <div class="edit-modal-overlay active" id="editModalOverlay">
        <div class="edit-modal" style="max-height:90vh;overflow-y:auto;max-width:750px;min-width:700px;">
            <h3>✏️ Sửa Xe</h3>

            <div class="form-row">
                <div class="form-group">
                    <label>Tên xe</label>
                    <input type="text" id="edit-car-name" value="${car.name || ''}">
                </div>
                <div class="form-group">
                    <label>Mã xe</label>
                    <input type="text" id="edit-car-id" value="${car.id || ''}">
                </div>
            </div>

            <div style="border-top:1px solid rgba(255,255,255,0.1);margin:20px 0;padding-top:15px;">
                <h4 style="color:#4a9eff;margin-bottom:15px;font-size:16px;">🖼️ Hình ảnh</h4>
                <div class="form-group">
                    <label>Ảnh thumbnail (danh sách) <span style="font-size: 11px; font-weight: normal; margin-left: 10px; cursor: pointer; color: #4a9eff; padding: 4px 8px; background: rgba(74,158,255,0.1); border-radius: 4px;" onclick="triggerUpload('edit-car-url')"><i class="fa fa-upload"></i> Tải ảnh lên</span></label>
                    <input type="text" id="edit-car-url" value="${car.URL || ''}" oninput="updateImagePreview('edit-car-url', 'edit-car-url-preview')">
                    <div class="img-preview-wrapper ${car.URL ? 'has-image' : ''}" id="edit-car-url-preview">
                        ${car.URL ? `<img src="${car.URL}" alt="Preview"><button type="button" class="preview-remove" onclick="clearImagePreview('edit-car-url', 'edit-car-url-preview')" title="Xóa ảnh">✕</button>` : `<div class="preview-placeholder"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg><span>Xem trước ảnh</span></div>`}
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Ảnh banner <span style="font-size: 11px; font-weight: normal; margin-left: 10px; cursor: pointer; color: #4a9eff; padding: 4px 8px; background: rgba(74,158,255,0.1); border-radius: 4px;" onclick="triggerUpload('edit-car-banner')"><i class="fa fa-upload"></i> Tải ảnh lên</span></label>
                        <input type="text" id="edit-car-banner" value="${car.bannerURL || ''}" oninput="updateImagePreview('edit-car-banner', 'edit-car-banner-preview')">
                        <div class="img-preview-wrapper ${car.bannerURL ? 'has-image' : ''}" id="edit-car-banner-preview">
                            ${car.bannerURL ? `<img src="${car.bannerURL}" alt="Preview"><button type="button" class="preview-remove" onclick="clearImagePreview('edit-car-banner', 'edit-car-banner-preview')" title="Xóa ảnh">✕</button>` : `<div class="preview-placeholder"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg><span>Xem trước ảnh</span></div>`}
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Ảnh chi tiết <span style="font-size: 11px; font-weight: normal; margin-left: 10px; cursor: pointer; color: #4a9eff; padding: 4px 8px; background: rgba(74,158,255,0.1); border-radius: 4px;" onclick="triggerUpload('edit-car-detail')"><i class="fa fa-upload"></i> Tải ảnh lên</span></label>
                        <input type="text" id="edit-car-detail" value="${car.detailURL || ''}" oninput="updateImagePreview('edit-car-detail', 'edit-car-detail-preview')">
                        <div class="img-preview-wrapper ${car.detailURL ? 'has-image' : ''}" id="edit-car-detail-preview">
                            ${car.detailURL ? `<img src="${car.detailURL}" alt="Preview"><button type="button" class="preview-remove" onclick="clearImagePreview('edit-car-detail', 'edit-car-detail-preview')" title="Xóa ảnh">✕</button>` : `<div class="preview-placeholder"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg><span>Xem trước ảnh</span></div>`}
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label>Ảnh thư viện</label>
                    <div id="gallery-container">
                        ${galleryHtml}
                    </div>
                    <button type="button" onclick="addGalleryInput()" style="margin-top:6px;background:rgba(74,158,255,0.2);border:1px solid rgba(74,158,255,0.4);color:#4a9eff;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:13px;">+ Thêm ảnh</button>
                </div>
            </div>

            <div style="border-top:1px solid rgba(255,255,255,0.1);margin:20px 0;padding-top:15px;">
                <h4 style="color:#4a9eff;margin-bottom:15px;font-size:16px;">⚙️ Thông số cơ bản</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Nhiên liệu</label>
                        <select id="edit-car-fuel">${fuelOptions}</select>
                    </div>
                    <div class="form-group">
                        <label>Loại xe</label>
                        <select id="edit-car-type">${typeOptions}</select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Số chỗ ngồi</label>
                        <input type="number" id="edit-car-seats" value="${car.seats || ''}">
                    </div>
                    <div class="form-group">
                        <label>Giá (VND)</label>
                        <input type="number" id="edit-car-price" value="${car.Price || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Mô tả</label>
                    <textarea id="edit-car-description" style="width:100%;padding:10px 14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;font-size:15px;min-height:80px;resize:vertical;">${car.description || ''}</textarea>
                </div>
            </div>

            <div style="border-top:1px solid rgba(255,255,255,0.1);margin:20px 0;padding-top:15px;">
                <h4 style="color:#C8102E;margin-bottom:15px;font-size:16px;">🔧 Thông số kỹ thuật</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Loại động cơ</label>
                        <input type="text" id="edit-spec-engine" value="${sp.engine || ''}" placeholder="VD: 2.0L Xăng DOHC 16 Van">
                    </div>
                    <div class="form-group">
                        <label>Dung tích (cc)</label>
                        <input type="text" id="edit-spec-displacement" value="${sp.displacement || ''}" placeholder="VD: 1,987 cc">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Công suất tối đa</label>
                        <input type="text" id="edit-spec-horsepower" value="${sp.horsepower || ''}" placeholder="VD: 170 hp / 6600 rpm">
                    </div>
                    <div class="form-group">
                        <label>Mô-men xoắn</label>
                        <input type="text" id="edit-spec-torque" value="${sp.torque || ''}" placeholder="VD: 205 Nm / 4400 rpm">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Hộp số</label>
                        <input type="text" id="edit-spec-transmission" value="${sp.transmissionDetail || ''}" placeholder="VD: Tự động 6 cấp">
                    </div>
                    <div class="form-group">
                        <label>Dẫn động</label>
                        <select id="edit-spec-drivetrain">${driveOptions}</select>
                    </div>
                </div>
            </div>

            <div style="border-top:1px solid rgba(255,255,255,0.1);margin:20px 0;padding-top:15px;">
                <h4 style="color:#C8102E;margin-bottom:15px;font-size:16px;">📐 Kích thước & Trọng lượng</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Dài x Rộng x Cao (mm)</label>
                        <input type="text" id="edit-spec-dimensions" value="${sp.dimensions || ''}" placeholder="VD: 4,890 x 1,920 x 1,695">
                    </div>
                    <div class="form-group">
                        <label>Chiều dài cơ sở (mm)</label>
                        <input type="text" id="edit-spec-wheelbase" value="${sp.wheelbase || ''}" placeholder="VD: 2,790">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Khoảng sáng gầm (mm)</label>
                        <input type="text" id="edit-spec-clearance" value="${sp.clearance || ''}" placeholder="VD: 210">
                    </div>
                    <div class="form-group">
                        <label>Trọng lượng (kg)</label>
                        <input type="text" id="edit-spec-weight" value="${sp.weight || ''}" placeholder="VD: 1,950">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Bình nhiên liệu (L)</label>
                        <input type="text" id="edit-spec-fueltank" value="${sp.fuelTank || ''}" placeholder="VD: 50">
                    </div>
                    <div class="form-group">
                        <label>Thông số lốp</label>
                        <input type="text" id="edit-spec-tires" value="${sp.tires || ''}" placeholder="VD: 235/50R20">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Số túi khí</label>
                        <input type="number" id="edit-spec-airbags" value="${sp.airbags || ''}" placeholder="7">
                    </div>
                    <div class="form-group">
                        <label>Camera 360</label>
                        <select id="edit-spec-camera360">
                            <option value="yes" ${sp.camera360 === 'yes' ? 'selected' : ''}>Có</option>
                            <option value="no" ${sp.camera360 === 'no' ? 'selected' : ''}>Không</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="modal-actions">
                <button class="btn-cancel" onclick="closeEditModal()">Hủy</button>
                <button class="btn-save" onclick="saveCar(${index})">Lưu thay đổi</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('editModalOverlay').addEventListener('click', function(e) {
        if (e.target === this) closeEditModal();
    });
}

function addGalleryInput() {
    const container = document.getElementById('gallery-container');
    const inputId = 'gallery-input-new-' + Date.now();
    const div = document.createElement('div');
    div.className = 'gallery-item';
    div.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;align-items:center;';
    div.innerHTML = `
        <input type="text" class="gallery-url-input" id="${inputId}" placeholder="URL ảnh thư viện" style="flex:1;padding:8px 12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;font-size:14px;">
        <button type="button" onclick="triggerUpload('${inputId}')" style="background:#4a9eff;border:none;color:#fff;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:13px;" title="Tải ảnh lên"><i class="fa fa-upload"></i></button>
        <button type="button" onclick="this.parentElement.remove()" style="background:#e74c3c;border:none;color:#fff;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:13px;">✕</button>
    `;
    container.appendChild(div);
}

function closeEditModal() {
    const modal = document.getElementById('editModalOverlay');
    if (modal) modal.remove();
}

async function saveCar(index) {
    const name = document.getElementById('edit-car-name').value.trim();
    const id = document.getElementById('edit-car-id').value.trim();
    const URL = document.getElementById('edit-car-url').value.trim();
    const bannerURL = document.getElementById('edit-car-banner').value.trim();
    const detailURL = document.getElementById('edit-car-detail').value.trim();
    const Fuel = document.getElementById('edit-car-fuel').value;
    const Type = document.getElementById('edit-car-type').value;
    const seats = document.getElementById('edit-car-seats').value;
    const Price = document.getElementById('edit-car-price').value;
    const description = document.getElementById('edit-car-description').value.trim();

    // Thu thập gallery URLs
    const galleryInputs = document.querySelectorAll('.gallery-url-input');
    const galleryURLs = [];
    galleryInputs.forEach(input => {
        const val = input.value.trim();
        if (val) galleryURLs.push(val);
    });

    if (!name || !id || !URL || !Fuel || !Type || !Price) {
        safeToast("Vui lòng điền đầy đủ thông tin bắt buộc!", 'error');
        return;
    }

    const car = cars[index];
    // Collect specs from edit form
    const editSpecs = {
        engine: document.getElementById('edit-spec-engine')?.value.trim() || '',
        displacement: document.getElementById('edit-spec-displacement')?.value.trim() || '',
        horsepower: document.getElementById('edit-spec-horsepower')?.value.trim() || '',
        torque: document.getElementById('edit-spec-torque')?.value.trim() || '',
        transmissionDetail: document.getElementById('edit-spec-transmission')?.value.trim() || '',
        drivetrain: document.getElementById('edit-spec-drivetrain')?.value || 'FWD',
        dimensions: document.getElementById('edit-spec-dimensions')?.value.trim() || '',
        wheelbase: document.getElementById('edit-spec-wheelbase')?.value.trim() || '',
        clearance: document.getElementById('edit-spec-clearance')?.value.trim() || '',
        weight: document.getElementById('edit-spec-weight')?.value.trim() || '',
        fuelTank: document.getElementById('edit-spec-fueltank')?.value.trim() || '',
        airbags: document.getElementById('edit-spec-airbags')?.value || '',
        tires: document.getElementById('edit-spec-tires')?.value.trim() || '',
        camera360: document.getElementById('edit-spec-camera360')?.value || 'yes'
    };

    const updateData = {
        name, id, URL, Fuel, Type,
        Price: Number(Price),
        bannerURL: bannerURL || undefined,
        detailURL: detailURL || undefined,
        galleryURLs: galleryURLs.length > 0 ? galleryURLs : [],
        seats: seats ? Number(seats) : undefined,
        description: description || undefined,
        specs: editSpecs
    };

    try {
        const response = await adminFetch(`/api/cars/${car._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        if (!response.ok) throw new Error("Cập nhật thất bại");

        cars[index] = { ...car, ...updateData };
        safeToast("Cập nhật xe thành công!", 'success');
        updateCarTable();
        closeEditModal();
    } catch (error) {
        safeToast("Đã xảy ra lỗi khi cập nhật xe.", 'error');
    }
}

// Xóa xe
async function deleteCar(index) {
    const car = cars[index];
    const ok = await showConfirm(
        'Xóa <span>xe</span>',
        `Bạn có chắc chắn muốn xóa xe <span class="om-confirm__highlight">"${car?.name || ''}"</span>?`
    );
    if (!ok) return;
    try {
        const response = await adminFetch(`/api/cars/${car._id}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Xóa thất bại");
        safeToast("Xóa xe thành công!", 'success');
        cars.splice(index, 1);
        updateCarTable();
    } catch (error) {
        safeToast("Đã xảy ra lỗi khi xóa xe.", 'error');
    }
}

// ═══════════════════════════════════════
// UPLOAD ẢNH TỪ MÁY TÍNH
// ═══════════════════════════════════════
let currentUploadTargetId = null;

function triggerUpload(inputId) {
    currentUploadTargetId = inputId;
    let fileInput = document.getElementById('hidden-file-input');
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'hidden-file-input';
        fileInput.style.display = 'none';
        fileInput.accept = 'image/*';
        document.body.appendChild(fileInput);
    }
    // Luôn đảm bảo event listener đã được attach (SPA reload tạo element mới)
    if (!fileInput._uploadListenerAttached) {
        _attachUploadEvent(fileInput);
        fileInput._uploadListenerAttached = true;
    }
    fileInput.value = ''; // clear previous
    fileInput.click();
}

function _attachUploadEvent(fileInput) {
    fileInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file || !currentUploadTargetId) return;

        const formData = new FormData();
        formData.append('image', file);

        const targetInput = document.getElementById(currentUploadTargetId);
        const originalPlaceholder = targetInput ? targetInput.placeholder : '';
        if (targetInput) {
            targetInput.disabled = true;
            targetInput.placeholder = 'Đang tải lên...';
        }
        
        safeToast('Đang tải ảnh lên...', 'info');

        try {
            // Because adminFetch intercepts and overrides headers for Content-Type
            // if we pass FormData, we shouldn't set Content-Type so the browser sets the boundary.
            // Wait, adminFetch in manager.js sets Content-Type to application/json by default if not present!
            // Let's check adminFetch in manager.js...
            const response = await adminFetch('/upload/image', {
                method: 'POST',
                body: formData,
                isFormData: true // We'll add this flag to adminFetch if needed, or bypass adminFetch
            });
            
            const data = await response.json();
            
            if (targetInput) {
                targetInput.disabled = false;
                targetInput.placeholder = originalPlaceholder;
            }

            if (response.ok) {
                if (targetInput) {
                    targetInput.value = data.url;
                    // Auto-trigger preview update
                    const previewMap = {
                        'create-car-url': 'create-car-preview',
                        'edit-car-url': 'edit-car-url-preview',
                        'edit-car-banner': 'edit-car-banner-preview',
                        'edit-car-detail': 'edit-car-detail-preview'
                    };
                    const previewId = previewMap[currentUploadTargetId];
                    if (previewId) {
                        updateImagePreview(currentUploadTargetId, previewId);
                    }
                    safeToast('Tải ảnh lên thành công!', 'success');
                }
            } else {
                safeToast(data.message || 'Lỗi tải ảnh lên', 'error');
            }
        } catch (err) {
            console.error(err);
            safeToast('Lỗi kết nối khi tải ảnh lên', 'error');
            if (targetInput) targetInput.disabled = false;
        }
    });
}

// Bind for the existing input if already in DOM
document.addEventListener('DOMContentLoaded', () => {
    const existingInput = document.getElementById('hidden-file-input');
    if (existingInput && !existingInput._uploadListenerAttached) {
        _attachUploadEvent(existingInput);
        existingInput._uploadListenerAttached = true;
    }
});
