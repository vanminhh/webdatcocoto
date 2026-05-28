// Mảng lưu trữ khách hàng
let customers = [];

// Hàm khởi tạo autocomplete cho tìm kiếm
function initCustomerSearchAutocomplete() {
    const searchInput = document.getElementById('search-customer');
    if (!searchInput || searchInput._acInitialized) return;
    searchInput._acInitialized = true;

    if (typeof initSearchAutocomplete === 'function') {
        initSearchAutocomplete({
            inputId: 'search-customer',
            getItems: () => customers,
            getSuggestionText: (c) => c.name || '—',
            getSuggestionSub: (c) => c.email || c.phoneNumber || '',
            matchFn: (c, term) => {
                return (c.name || '').toLowerCase().includes(term) ||
                       (c.email || '').toLowerCase().includes(term) ||
                       (c.phoneNumber || '').toLowerCase().includes(term);
            },
            onFilter: (term, selectedItem) => updateTable(term, selectedItem),
            placeholder: 'Tìm kiếm khách hàng...'
        });
    } else {
        searchInput.addEventListener('input', (e) => {
            updateTable(e.target.value);
        });
    }
}

// Hàm lấy danh sách khách hàng từ backend
async function fetchCustomersFromServer() {
    try {
        const response = await adminFetch("/customer/list");
        if (!response.ok) {
            throw new Error("Không thể lấy danh sách khách hàng từ server.");
        }
        const data = await response.json();
        customers = data;
        updateTable();
        initCustomerSearchAutocomplete();
    } catch (error) {
        safeToast("Đã xảy ra lỗi khi lấy danh sách khách hàng. Vui lòng thử lại.", 'error');
    }
}

// Hàm cập nhật bảng
function updateTable(searchTerm = '', selectedItem = null) {
    const tableBody = document.getElementById('customer-table');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const lowerTerm = searchTerm.toLowerCase().trim();

    let filteredCustomers = customers;
    if (selectedItem) {
        filteredCustomers = [selectedItem];
    } else if (lowerTerm) {
        filteredCustomers = customers.filter(c => {
            const nameMatch = (c.name || '').toLowerCase().includes(lowerTerm);
            const emailMatch = (c.email || '').toLowerCase().includes(lowerTerm);
            const phoneMatch = (c.phoneNumber || '').toLowerCase().includes(lowerTerm);
            return nameMatch || emailMatch || phoneMatch;
        });
    }

    if (filteredCustomers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">Không tìm thấy khách hàng nào.</td></tr>';
        return;
    }

    filteredCustomers.forEach((customer) => {
        const index = customers.indexOf(customer);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="color:#555;">${index + 1}</td>
            <td style="color:#eee;font-weight:500;">${customer.name || '—'}</td>
            <td style="color:#bbb;">${customer.email || '—'}</td>
            <td style="color:#bbb;">${customer.phoneNumber || '—'}</td>
            <td>
                <button class="om-btn-action edit" onclick="editCustomer(${index})" title="Sửa">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="om-btn-action delete" onclick="deleteCustomer(${index})" title="Xóa">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"/></svg>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// === MODAL EDIT ===
function editCustomer(index) {
    const customer = customers[index];

    // Xóa modal cũ nếu có
    const oldModal = document.getElementById('editModalOverlay');
    if (oldModal) oldModal.remove();

    const modalHtml = `
    <div class="edit-modal-overlay active" id="editModalOverlay">
        <div class="edit-modal">
            <h3>✏️ Sửa Khách Hàng</h3>
            <div class="form-group">
                <label>Tên khách hàng</label>
                <input type="text" id="edit-name" value="${customer.name || ''}">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="edit-email" value="${customer.email || ''}">
            </div>
            <div class="form-group">
                <label>Số điện thoại</label>
                <input type="text" id="edit-phone" value="${customer.phoneNumber || ''}">
            </div>
            <div class="modal-actions">
                <button class="btn-cancel" onclick="closeEditModal()">Hủy</button>
                <button class="btn-save" onclick="saveCustomer(${index})">Lưu thay đổi</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Bấm ngoài modal để đóng
    document.getElementById('editModalOverlay').addEventListener('click', function (e) {
        if (e.target === this) closeEditModal();
    });
}

function closeEditModal() {
    const modal = document.getElementById('editModalOverlay');
    if (modal) modal.remove();
}

async function saveCustomer(index) {
    const name = document.getElementById('edit-name').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    const phoneNumber = document.getElementById('edit-phone').value.trim();

    if (!name || !email || !phoneNumber) {
        safeToast("Vui lòng điền đầy đủ thông tin!", 'error');
        return;
    }

    const customer = customers[index];

    try {
        const response = await adminFetch(`/customer/${customer._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phoneNumber })
        });

        if (!response.ok) throw new Error("Cập nhật thất bại");

        customers[index] = { ...customer, name, email, phoneNumber };
        safeToast("Cập nhật thành công!", 'success');
        updateTable();
        closeEditModal();
    } catch (error) {
        safeToast("Đã xảy ra lỗi khi cập nhật khách hàng.", 'error');
    }
}

// Hàm xóa khách hàng
async function deleteCustomer(index) {
    if (confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
        try {
            const customerId = customers[index]._id;
            const response = await adminFetch(`/customer/${customerId}`, {
                method: "DELETE"
            });

            if (!response.ok) throw new Error("Xoá thất bại");

            safeToast("Xoá thành công!", 'success');
            customers.splice(index, 1);
            updateTable();
        } catch (error) {
            safeToast("Đã xảy ra lỗi khi xoá khách hàng.", 'error');
        }
    }
}

// ═══════════════════════════════════════
// Xóa tất cả khách hàng — double-confirm
// ═══════════════════════════════════════
async function deleteAllCustomers() {
    const count = customers.length;

    // Hàm thực thi gọi API
    const _doDeleteAll = async () => {
        try {
            const response = await adminFetch('/customer/delete-all', {
                method: 'DELETE'
            });
            const data = await response.json();

            if (response.ok) {
                customers = [];
                updateTable();
                // Ưu tiên showToast của manager.js, fallback alert
                if (typeof showToast === 'function') {
                    showToast(`Đã xóa ${data.deletedCount} khách hàng.`, 'success');
                } else {
                    safeToast(data.message, 'info');
                }
            } else {
                if (typeof showToast === 'function') {
                    showToast(data.message || 'Xóa thất bại!', 'error');
                } else {
                    alert('Xóa thất bại: ' + (data.message || 'Lỗi server'));
                }
            }
        } catch (error) {
            if (typeof showToast === 'function') {
                showToast('Lỗi kết nối server!', 'error');
            } else {
                safeToast('Đã xảy ra lỗi khi xóa tất cả khách hàng.', 'error');
            }
        }
    };

    // Confirm lần 2 — đếm số lượng thực tế
    const _confirmStep2 = () => {
        if (typeof showConfirm === 'function') {
            showConfirm(
                `⚠️ Xác nhận xóa ${count} khách hàng?`,
                'Hành động này KHÔNG THỂ hoàn tác. Toàn bộ dữ liệu khách hàng sẽ bị xóa vĩnh viễn.',
                _doDeleteAll
            );
        } else {
            if (confirm(`Xác nhận xóa ${count} khách hàng? Hành động không thể hoàn tác!`)) {
                _doDeleteAll();
            }
        }
    };

    // Confirm lần 1 — cảnh báo ban đầu
    if (typeof showConfirm === 'function') {
        showConfirm(
            'Xóa tất cả Khách hàng?',
            `Bạn sắp xóa toàn bộ ${count} khách hàng. Tiếp tục?`,
            _confirmStep2
        );
    } else {
        if (confirm(`Bạn có chắc muốn xóa tất cả ${count} khách hàng không?`)) {
            _confirmStep2();
        }
    }
}