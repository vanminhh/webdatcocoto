// ─── Helper functions ───
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
        const bodyData = { 
            name, 
            id, 
            URL, 
            Fuel, 
            Type, 
            seats: seats ? Number(seats) : undefined, 
            Price: Number(Price), 
            initialQuantity: Number(initialQuantity) || 0 
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
            <input type="text" class="gallery-url-input" value="${url}" style="flex:1;padding:8px 12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;font-size:14px;">
            <button type="button" onclick="this.parentElement.remove()" style="background:#e74c3c;border:none;color:#fff;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:13px;">✕</button>
        </div>`;
    });

    const modalHtml = `
    <div class="edit-modal-overlay active" id="editModalOverlay">
        <div class="edit-modal" style="max-height:90vh;overflow-y:auto;">
            <h3>✏️ Sửa Xe</h3>

            <div class="form-group">
                <label>Tên xe</label>
                <input type="text" id="edit-car-name" value="${car.name || ''}">
            </div>
            <div class="form-group">
                <label>Mã xe</label>
                <input type="text" id="edit-car-id" value="${car.id || ''}">
            </div>

            <div style="border-top:1px solid rgba(255,255,255,0.1);margin:20px 0;padding-top:15px;">
                <h4 style="color:#4a9eff;margin-bottom:15px;font-size:16px;">🖼️ Hình ảnh</h4>
                <div class="form-group">
                    <label>Ảnh thumbnail (danh sách)</label>
                    <input type="text" id="edit-car-url" value="${car.URL || ''}">
                </div>
                <div class="form-group">
                    <label>Ảnh banner</label>
                    <input type="text" id="edit-car-banner" value="${car.bannerURL || ''}">
                </div>
                <div class="form-group">
                    <label>Ảnh chi tiết</label>
                    <input type="text" id="edit-car-detail" value="${car.detailURL || ''}">
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
                <h4 style="color:#4a9eff;margin-bottom:15px;font-size:16px;">⚙️ Thông số</h4>
                <div class="form-group">
                    <label>Nhiên liệu</label>
                    <select id="edit-car-fuel">${fuelOptions}</select>
                </div>
                <div class="form-group">
                    <label>Loại xe</label>
                    <select id="edit-car-type">${typeOptions}</select>
                </div>
                <div class="form-group">
                    <label>Số chỗ ngồi</label>
                    <input type="number" id="edit-car-seats" value="${car.seats || ''}">
                </div>
                <div class="form-group">
                    <label>Giá (VND)</label>
                    <input type="number" id="edit-car-price" value="${car.Price || ''}">
                </div>
                <div class="form-group">
                    <label>Mô tả</label>
                    <textarea id="edit-car-description" style="width:100%;padding:10px 14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;font-size:15px;min-height:80px;resize:vertical;">${car.description || ''}</textarea>
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
    const div = document.createElement('div');
    div.className = 'gallery-item';
    div.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;align-items:center;';
    div.innerHTML = `
        <input type="text" class="gallery-url-input" placeholder="URL ảnh thư viện" style="flex:1;padding:8px 12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;font-size:14px;">
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
    const updateData = {
        name, id, URL, Fuel, Type,
        Price: Number(Price),
        bannerURL: bannerURL || undefined,
        detailURL: detailURL || undefined,
        galleryURLs: galleryURLs.length > 0 ? galleryURLs : [],
        seats: seats ? Number(seats) : undefined,
        description: description || undefined
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
    if (confirm('Bạn có chắc chắn muốn xóa xe này?')) {
        try {
            const response = await adminFetch(`/api/cars/${cars[index]._id}`, { method: "DELETE" });
            if (!response.ok) throw new Error("Xóa thất bại");
            safeToast("Xóa xe thành công!", 'success');
            cars.splice(index, 1);
            updateCarTable();
        } catch (error) {
            safeToast("Đã xảy ra lỗi khi xóa xe.", 'error');
        }
    }
}


