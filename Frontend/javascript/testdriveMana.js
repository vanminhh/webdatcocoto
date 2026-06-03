// Mảng lưu trữ test drives
let testdrives = [];

async function fetchTestDrivesFromServer() {
    try {
        const response = await fetch(`${API_BASE}/order/list/dangky`);
        if (!response.ok) throw new Error("Không thể lấy danh sách đăng ký lái thử.");
        const data = await response.json();
        testdrives = data;
        updateTestDriveTable();
    } catch (error) {
        console.error("Lỗi:", error);
        alert("Đã xảy ra lỗi khi lấy danh sách đăng ký lái thử.");
    }
}

function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function updateTestDriveTable() {
    const tableBody = document.getElementById('testdrive-table');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    testdrives.forEach((td, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${td.name || '—'}</td>
            <td>${td.phoneNumber || '—'}</td>
            <td>${td.carId || '—'}</td>
            <td>${formatDate(td.date)}</td>
            <td>${td.city || '—'}</td>
            <td>${td.dealer || '—'}</td>
            <td>
                <button class="btn btn-warning btn-sm" onclick="editTestDrive(${index})">Sửa</button>
                <button class="btn btn-danger btn-sm" onclick="deleteTestDrive(${index})">Xóa</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// === MODAL EDIT ===
function editTestDrive(index) {
    const td = testdrives[index];
    const oldModal = document.getElementById('editModalOverlay');
    if (oldModal) oldModal.remove();

    const dateVal = td.date ? new Date(td.date).toISOString().split('T')[0] : '';

    const modalHtml = `
    <div class="edit-modal-overlay active" id="editModalOverlay">
        <div class="edit-modal">
            <h3>✏️ Sửa Đăng ký Lái thử</h3>
            <div class="form-group">
                <label>Số điện thoại</label>
                <input type="text" id="edit-td-phone" value="${td.phoneNumber || ''}">
            </div>
            <div class="form-group">
                <label>Mã xe</label>
                <input type="text" id="edit-td-carId" value="${td.carId || ''}">
            </div>
            <div class="form-group">
                <label>Ngày</label>
                <input type="date" id="edit-td-date" value="${dateVal}">
            </div>
            <div class="form-group">
                <label>Thành phố</label>
                <input type="text" id="edit-td-city" value="${td.city || ''}">
            </div>
            <div class="form-group">
                <label>Đại lý</label>
                <input type="text" id="edit-td-dealer" value="${td.dealer || ''}">
            </div>
            <div class="modal-actions">
                <button class="btn-cancel" onclick="closeEditModal()">Hủy</button>
                <button class="btn-save" onclick="saveTestDrive(${index})">Lưu thay đổi</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('editModalOverlay').addEventListener('click', function(e) {
        if (e.target === this) closeEditModal();
    });
}

function closeEditModal() {
    const modal = document.getElementById('editModalOverlay');
    if (modal) modal.remove();
}

async function saveTestDrive(index) {
    const phoneNumber = document.getElementById('edit-td-phone').value.trim();
    const carId = document.getElementById('edit-td-carId').value.trim();
    const date = document.getElementById('edit-td-date').value;
    const city = document.getElementById('edit-td-city').value.trim();
    const dealer = document.getElementById('edit-td-dealer').value.trim();

    if (!phoneNumber || !carId || !date || !city || !dealer) {
        alert("Vui lòng điền đầy đủ thông tin!");
        return;
    }

    const td = testdrives[index];
    try {
        const response = await fetch(`${API_BASE}/order/${td._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber, carId, date, city, dealer, type: 'dangky' })
        });
        if (!response.ok) throw new Error("Cập nhật thất bại");

        testdrives[index] = { ...td, phoneNumber, carId, date, city, dealer };
        alert("Cập nhật thành công!");
        updateTestDriveTable();
        closeEditModal();
    } catch (error) {
        alert("Đã xảy ra lỗi khi cập nhật.");
    }
}

async function deleteTestDrive(index) {
    const ok = await showConfirm(
        'Xóa <span>đăng ký lái thử</span>',
        'Bạn có chắc chắn muốn xóa đăng ký lái thử này?'
    );
    if (!ok) return;
    try {
        const response = await fetch(`${API_BASE}/order/${testdrives[index]._id}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Xóa thất bại");
        safeToast("Xóa thành công!", 'success');
        testdrives.splice(index, 1);
        updateTestDriveTable();
    } catch (error) {
        safeToast("Đã xảy ra lỗi khi xóa.", 'error');
    }
}
