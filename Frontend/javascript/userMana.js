// Mảng lưu trữ users
let users = [];

// Hàm khởi tạo autocomplete cho tìm kiếm
function initUserSearchAutocomplete() {
    const searchInput = document.getElementById('search-user');
    if (!searchInput || searchInput._acInitialized) return;
    searchInput._acInitialized = true;

    if (typeof initSearchAutocomplete === 'function') {
        initSearchAutocomplete({
            inputId: 'search-user',
            getItems: () => users,
            getSuggestionText: (u) => u.name || u.username || '—',
            getSuggestionSub: (u) => u.email || u.role || '',
            matchFn: (u, term) => {
                return (u.name || '').toLowerCase().includes(term) ||
                       (u.username || '').toLowerCase().includes(term) ||
                       (u.email || '').toLowerCase().includes(term) ||
                       (u.role || '').toLowerCase().includes(term);
            },
            onFilter: (term, selectedItem) => updateUserTable(term, selectedItem),
            placeholder: 'Tìm kiếm tài khoản...'
        });
    } else {
        searchInput.addEventListener('input', (e) => {
            updateUserTable(e.target.value);
        });
    }
}

async function fetchUsersFromServer() {
    try {
        const response = await adminFetch("/user/list");
        if (!response.ok) throw new Error("Không thể lấy danh sách user.");
        const data = await response.json();
        users = data;
        updateUserTable();
        initUserSearchAutocomplete();
    } catch (error) {
        console.error("Lỗi:", error);
        safeToast("Đã xảy ra lỗi khi lấy danh sách user.", 'error');
    }
}

function updateUserTable(searchTerm = '', selectedItem = null) {
    const tableBody = document.getElementById('user-table');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const lowerTerm = searchTerm.toLowerCase().trim();

    let filteredUsers = users;
    if (selectedItem) {
        filteredUsers = [selectedItem];
    } else if (lowerTerm) {
        filteredUsers = users.filter(user => {
            const nameMatch = (user.name || '').toLowerCase().includes(lowerTerm);
            const usernameMatch = (user.username || '').toLowerCase().includes(lowerTerm);
            const emailMatch = (user.email || '').toLowerCase().includes(lowerTerm);
            const roleMatch = (user.role || '').toLowerCase().includes(lowerTerm);
            return nameMatch || usernameMatch || emailMatch || roleMatch;
        });
    }

    if (filteredUsers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;">Không tìm thấy tài khoản nào.</td></tr>';
        return;
    }

    filteredUsers.forEach((user) => {
        const index = users.indexOf(user);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="color:#555;">${index + 1}</td>
            <td style="color:#eee;font-weight:500;">${user.name || '—'}</td>
            <td style="color:#999;">${user.username || '—'}</td>
            <td style="color:#bbb;">${user.email || '—'}</td>
            <td><span class="om-role-badge ${user.role === 'admin' ? 'om-role-badge--admin' : 'om-role-badge--user'}">${user.role || 'user'}</span></td>
            <td><img src="${user.avatar || '/image/default-avatar.png'}" alt="avatar" class="om-avatar"></td>
            <td>
                <button class="om-btn-action edit" onclick="editUser(${index})" title="Sửa">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="om-btn-action delete" onclick="deleteUser(${index})" title="Xóa">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function openCreateUserPanel() {
    resetUserCreateForm();
    if (typeof openAdminPanel === 'function') openAdminPanel('user-create-panel');
}

function resetUserCreateForm() {
    document.getElementById('create-user-name').value = '';
    document.getElementById('create-user-username').value = '';
    document.getElementById('create-user-email').value = '';
    document.getElementById('create-user-password').value = '';
    document.getElementById('create-user-role').value = 'user';
}

async function submitCreateUser() {
    const name = document.getElementById('create-user-name').value.trim();
    const username = document.getElementById('create-user-username').value.trim();
    const email = document.getElementById('create-user-email').value.trim();
    const password = document.getElementById('create-user-password').value.trim();
    const role = document.getElementById('create-user-role').value;

    if (!name || !email) {
        safeToast('Vui lòng điền ít nhất Tên và Email!', 'error');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        safeToast('Email không đúng định dạng!', 'error');
        return;
    }

    if (typeof setPanelLoading === 'function') setPanelLoading('user-create-panel', true);

    try {
        let endpoint = '/user/create'; // default route which doesn't hash password
        let bodyData = { name, username, email, role };
        
        if (password) {
            if (role === 'admin') {
                endpoint = '/user/createAdmin';
                bodyData = { name, email, password }; // Note: createAdmin ignores username but it sets role to admin
            } else {
                endpoint = '/auth/register';
                bodyData = { name, email, password, username }; // /auth/register hashes password
            }
        }

        const response = await adminFetch(endpoint, {
            method: 'POST',
            body: JSON.stringify(bodyData)
        });
        
        const data = await response.json();
        
        if (response.ok || response.status === 201) {
            safeToast(data.message || 'Thêm user thành công!', 'success');
            
            await fetchUsersFromServer();
            
            if (typeof closeAdminPanel === 'function') closeAdminPanel('user-create-panel');
        } else {
            safeToast(data.message || 'Thêm user thất bại', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        safeToast('Lỗi khi thêm user!', 'error');
    } finally {
        if (typeof setPanelLoading === 'function') setPanelLoading('user-create-panel', false);
    }
}

// === MODAL EDIT ===
function editUser(index) {
    const user = users[index];
    const oldModal = document.getElementById('editModalOverlay');
    if (oldModal) oldModal.remove();

    const modalHtml = `
    <div class="edit-modal-overlay active" id="editModalOverlay">
        <div class="edit-modal">
            <h3>✏️ Sửa Tài Khoản</h3>
            <div class="form-group">
                <label>Tên</label>
                <input type="text" id="edit-user-name" value="${user.name || ''}">
            </div>
            <div class="form-group">
                <label>Username</label>
                <input type="text" id="edit-user-username" value="${user.username || ''}">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="edit-user-email" value="${user.email || ''}">
            </div>
            <div class="form-group">
                <label>Role</label>
                <select id="edit-user-role">
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            </div>
            <div class="modal-actions">
                <button class="btn-cancel" onclick="closeEditModal()">Hủy</button>
                <button class="btn-save" onclick="saveUser(${index})">Lưu thay đổi</button>
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

async function saveUser(index) {
    const name = document.getElementById('edit-user-name').value.trim();
    const username = document.getElementById('edit-user-username').value.trim();
    const email = document.getElementById('edit-user-email').value.trim();
    const role = document.getElementById('edit-user-role').value;

    if (!name || !email) {
        safeToast("Vui lòng điền ít nhất Tên và Email!", 'error');
        return;
    }

    const user = users[index];
    try {
        const response = await adminFetch(`/user/${user._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, username, email, role })
        });
        if (!response.ok) throw new Error("Cập nhật thất bại");

        users[index] = { ...user, name, username, email, role };
        safeToast("Cập nhật user thành công!", 'success');
        updateUserTable();
        closeEditModal();
    } catch (error) {
        safeToast("Đã xảy ra lỗi khi cập nhật user.", 'error');
    }
}

async function deleteUser(index) {
    if (confirm('Bạn có chắc chắn muốn xóa user này?')) {
        try {
            const response = await adminFetch(`/user/${users[index]._id}`, { method: "DELETE" });
            if (!response.ok) throw new Error("Xóa thất bại");
            safeToast("Xóa user thành công!", 'success');
            users.splice(index, 1);
            updateUserTable();
        } catch (error) {
            safeToast("Đã xảy ra lỗi khi xóa user.", 'error');
        }
    }
}
