/* ═══════════════════════════════════════
   MANAGER.JS — Admin Panel Navigation
   ═══════════════════════════════════════ */

// ─── Sidebar Toggle ───
function toggleSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    const body = document.body;

    // Mobile: toggle class .open
    if (window.innerWidth <= 900) {
        sidebar.classList.toggle('open');
    } else {
        // Desktop: toggle class .collapsed
        sidebar.classList.toggle('collapsed');
        body.classList.toggle('sidebar-collapsed');
    }
}

// ─── Navigation (loadPage + active state) ───
function navigateTo(page, clickedItem) {
    // Update active state
    document.querySelectorAll('.sidebar__item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Nếu không truyền clickedItem, tự động tìm dựa trên trang (page)
    if (!clickedItem) {
        // Nếu trang là stockImport, fallback active về inventoryManager
        const targetPage = page === 'stockImport.html' ? 'inventoryManager.html' : page;
        clickedItem = document.querySelector(`.sidebar__item[onclick*="${targetPage}"]`);
    }

    if (clickedItem) {
        clickedItem.classList.add('active');
    }

    // Update page title
    const titleMap = {
        'dashboard.html': 'Dashboard',
        'usersManager.html': 'Users Manager',
        'customersManager.html': 'Customers Manager',
        'carsManager.html': 'Cars Manager',
        'order.html': 'Đặt lịch',
        'testdriveManager.html': 'Quản lý Lái thử',
        'saleManager.html': 'Quản lý Sale',
        'saleHistory.html': 'Lịch sử Sale',
        'inventoryManager.html': 'Quản lý Tồn kho',
        'stockImport.html': 'Nhập kho xe'
    };
    const titleEl = document.getElementById('page-title');
    if (titleEl) {
        titleEl.textContent = titleMap[page] || 'Admin Panel';
    }

    // Close mobile sidebar if open
    if (window.innerWidth <= 900) {
        document.getElementById('admin-sidebar').classList.remove('open');
    }

    // Load page content
    loadPage(page);
}

function loadPage(page) {
    fetch(page)
        .then(response => response.text())
        .then(data => {
            document.getElementById('admin-content').innerHTML = data;

            // Init JS tương ứng cho từng trang
            if (page === "dashboard.html") {
                loadDashboardChart();
            } else if (page === "carsManager.html") {
                fetchCarsFromServer();
            } else if (page === "order.html") {
                fetchOrdersFromServer();
            } else if (page === "testdriveManager.html") {
                fetchTestDrivesFromServer();
            } else if (page === "usersManager.html") {
                fetchUsersFromServer();
            } else if (page === "customersManager.html") {
                fetchCustomersFromServer();
            } else if (page === "saleManager.html") {
                if (typeof initSaleManager === 'function') initSaleManager();
            } else if (page === "saleHistory.html") {
                if (typeof initSaleHistory === 'function') initSaleHistory();
            } else if (page === "inventoryManager.html") {
                if (typeof fetchInventory === 'function') fetchInventory();
            } else if (page === "stockImport.html") {
                if (typeof initImportPage === 'function') initImportPage();
            }
        })
        .catch(error => console.error("Error loading page:", error));
}

// ─── Toast Notification ───
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
        <i class="fa ${iconMap[type] || iconMap.info} toast__icon"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove after 3.5s
    setTimeout(() => {
        toast.classList.add('toast--out');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ─── Confirm Dialog (Promise-based, tự tạo DOM) ───
function showConfirm(title, message, onConfirmCallback) {
    // Remove existing
    const existing = document.querySelector('.confirm-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay active';
    overlay.innerHTML = `
        <div class="confirm-dialog">
            <div class="confirm-dialog__icon"><i class="fa fa-exclamation-triangle"></i></div>
            <h3 class="confirm-dialog__title">${title}</h3>
            <p class="confirm-dialog__message">${message}</p>
            <div class="confirm-dialog__actions">
                <button class="btn-admin btn-admin--outline" id="confirm-no">
                    Hủy
                </button>
                <button class="btn-admin btn-admin--primary" id="confirm-yes">
                    <i class="fa fa-check"></i> Xác nhận
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Nếu truyền callback (dùng kiểu cũ) → gọi callback
    if (typeof onConfirmCallback === 'function') {
        document.getElementById('confirm-yes').addEventListener('click', () => {
            overlay.remove();
            onConfirmCallback();
        });
        document.getElementById('confirm-no').addEventListener('click', () => {
            overlay.remove();
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        return;
    }

    // Nếu không truyền callback → trả về Promise (dùng cho await)
    return new Promise((resolve) => {
        document.getElementById('confirm-yes').addEventListener('click', () => {
            overlay.remove();
            resolve(true);
        });
        document.getElementById('confirm-no').addEventListener('click', () => {
            overlay.remove();
            resolve(false);
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve(false);
            }
        });
    });
}

// ─── Safe Helpers ───
window.safeToast = function(message, type = 'success') {
    if (typeof showToast === 'function' && document.getElementById('toast-container')) {
        showToast(message, type);
    } else {
        alert(message);
    }
};

window.safeConfirm = function(title, message, onConfirm) {
    if (typeof showConfirm === 'function') {
        showConfirm(title, message, onConfirm);
    } else {
        if (confirm(`${title}\n\n${message}`)) {
            if (typeof onConfirm === 'function') onConfirm();
        }
    }
};

// ─── API Helper ───
async function adminFetch(url, options = {}) {
    const defaultHeaders = {};
    if (!options.isFormData) {
        defaultHeaders['Content-Type'] = 'application/json';
    }
    
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    options.headers = { ...defaultHeaders, ...(options.headers || {}) };

    try {
        const response = await fetch(url, options);
        return response;
    } catch (error) {
        console.error('adminFetch Error:', error);
        throw error;
    }
}

// ─── Admin Panel Helper ───
let previousFocusElement = null;

function openAdminPanel(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    
    // E4: Lưu lại element đang focus trước khi mở
    previousFocusElement = document.activeElement;

    panel.classList.add('active');
    
    // E3: Thêm aria-hidden cho nội dung bên dưới
    const mainContent = document.getElementById('admin-main');
    const sidebar = document.getElementById('admin-sidebar');
    if (mainContent) mainContent.setAttribute('aria-hidden', 'true');
    if (sidebar) sidebar.setAttribute('aria-hidden', 'true');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('role', 'dialog');
    
    const focusableElements = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // E4: Focus trap
    const trapFocus = (e) => {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    if (lastFocusable) lastFocusable.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    if (firstFocusable) firstFocusable.focus();
                    e.preventDefault();
                }
            }
        }
    };
    panel.addEventListener('keydown', trapFocus);
    // Lưu hàm lại để remove sau
    panel._trapFocusHandler = trapFocus;
    
    const firstInput = panel.querySelector('input:not([type="hidden"]), select, textarea');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 50); // wait for display
    } else if (firstFocusable) {
        setTimeout(() => firstFocusable.focus(), 50);
    }
    
    const escapeHandler = (e) => {
        if (e.key === 'Escape' && panel.classList.contains('active')) {
            closeAdminPanel(panelId);
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    panel.addEventListener('click', function onClickOutside(e) {
        if (e.target === panel) {
            closeAdminPanel(panelId);
            panel.removeEventListener('click', onClickOutside);
        }
    });
}

function closeAdminPanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.classList.remove('active');
        
        // E3: Gỡ bỏ aria-hidden
        const mainContent = document.getElementById('admin-main');
        const sidebar = document.getElementById('admin-sidebar');
        if (mainContent) mainContent.removeAttribute('aria-hidden');
        if (sidebar) sidebar.removeAttribute('aria-hidden');
        panel.removeAttribute('aria-modal');
        
        // Gỡ bỏ trap focus
        if (panel._trapFocusHandler) {
            panel.removeEventListener('keydown', panel._trapFocusHandler);
        }
        
        // E4: Trả lại focus cũ
        if (previousFocusElement) {
            previousFocusElement.focus();
            previousFocusElement = null;
        }
    }
}

function setPanelLoading(panelId, isLoading) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    
    const submitBtn = panel.querySelector('.btn-save') || panel.querySelector('.btn-admin--primary');
    if (submitBtn) {
        if (isLoading) {
            submitBtn.dataset.originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Đang xử lý...';
            submitBtn.disabled = true;
        } else {
            submitBtn.innerHTML = submitBtn.dataset.originalText || 'Xác nhận';
            submitBtn.disabled = false;
        }
    }
    
    const inputs = panel.querySelectorAll('input, select, textarea, button:not(.admin-panel__close)');
    inputs.forEach(input => {
        if (input !== submitBtn) {
            input.disabled = isLoading;
        }
    });
}

// ─── GLOBAL SEARCH LOGIC ───
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('global-search-input');
    const dropdown = document.getElementById('global-search-dropdown');
    if (!searchInput || !dropdown) return;

    // CSS styling
    const style = document.createElement('style');
    style.textContent = `
        .search-group-title { font-size: 11px; text-transform: uppercase; color: #888; padding: 10px 14px 4px; font-weight: 700; }
        .search-item { padding: 10px 14px; cursor: pointer; color: #ccc; font-size: 13px; display: flex; align-items: center; gap: 10px; transition: background 0.15s; }
        .search-item:hover, .search-item.active { background: rgba(255,255,255,0.05); color: #fff; }
        .search-item i { width: 16px; text-align: center; color: #888; }
        .search-item .badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: auto; }
        .search-item.history i { color: #A855F7; }
    `;
    document.head.appendChild(style);

    const PAGES = [
        { title: 'Dashboard', page: 'dashboard.html', icon: 'fa-chart-line' },
        { title: 'Tài khoản', page: 'usersManager.html', icon: 'fa-users' },
        { title: 'Khách hàng', page: 'customersManager.html', icon: 'fa-user-tie' },
        { title: 'Quản lý Xe', page: 'carsManager.html', icon: 'fa-car' },
        { title: 'Đơn hàng', page: 'order.html', icon: 'fa-shopping-cart' },
        { title: 'Tồn kho', page: 'inventoryManager.html', icon: 'fa-warehouse' },
        { title: 'Quản lý Sale', page: 'saleManager.html', icon: 'fa-tags' },
        { title: 'Lịch sử Sale', page: 'saleHistory.html', icon: 'fa-clock-rotate-left' }
    ];

    let searchResults = [];
    let activeIndex = -1;

    function renderDropdown(html) {
        if (!html) {
            dropdown.style.display = 'none';
        } else {
            dropdown.innerHTML = html;
            dropdown.style.display = 'block';
        }
    }

    async function performSearch(query) {
        if (!query) {
            showRecentSearches();
            return;
        }

        let html = '';
        searchResults = [];
        
        // 1. Search Pages
        const pageMatches = PAGES.filter(p => p.title.toLowerCase().includes(query.toLowerCase()));
        if (pageMatches.length > 0) {
            html += `<div class="search-group-title">Trang</div>`;
            pageMatches.forEach(p => {
                searchResults.push({ type: 'page', data: p });
                html += `<div class="search-item" data-index="${searchResults.length - 1}"><i class="fa ${p.icon}"></i> ${p.title}</div>`;
            });
        }

        // 2. Fetch API for Cars & Customers
        try {
            const [carsRes, custRes] = await Promise.all([
                adminFetch('/api/cars').then(r => r.json()),
                adminFetch('/customer/list').then(r => r.json())
            ]);

            // Cars
            const carMatches = (carsRes || []).filter(c => 
                (c.name || '').toLowerCase().includes(query.toLowerCase()) || 
                (c.id || '').toLowerCase().includes(query.toLowerCase())
            ).slice(0, 5); // top 5

            if (carMatches.length > 0) {
                html += `<div class="search-group-title">Xe ô tô</div>`;
                carMatches.forEach(c => {
                    searchResults.push({ type: 'car', data: c });
                    html += `<div class="search-item" data-index="${searchResults.length - 1}"><i class="fa fa-car"></i> ${c.name} <span class="badge" style="background:#333">${c.id}</span></div>`;
                });
            }

            // Customers
            const custMatches = (custRes || []).filter(c => 
                (c.name || '').toLowerCase().includes(query.toLowerCase()) || 
                (c.email || '').toLowerCase().includes(query.toLowerCase()) ||
                (c.phoneNumber || '').includes(query)
            ).slice(0, 5); // top 5

            if (custMatches.length > 0) {
                html += `<div class="search-group-title">Khách hàng</div>`;
                custMatches.forEach(c => {
                    searchResults.push({ type: 'customer', data: c });
                    html += `<div class="search-item" data-index="${searchResults.length - 1}"><i class="fa fa-user"></i> ${c.name} <span class="badge" style="background:#333">${c.phoneNumber}</span></div>`;
                });
            }

            if (searchResults.length === 0) {
                html = `<div class="search-item" style="color:#888;justify-content:center;">Không tìm thấy kết quả phù hợp.</div>`;
            }

            renderDropdown(html);
        } catch (e) {
            console.error(e);
        }
    }

    function showRecentSearches() {
        const recent = JSON.parse(localStorage.getItem('recentCarSearches') || '[]');
        if (recent.length === 0) {
            renderDropdown('');
            return;
        }

        searchResults = [];
        let html = `<div class="search-group-title">Tìm kiếm gần đây</div>`;
        recent.forEach(term => {
            searchResults.push({ type: 'history', data: term });
            html += `<div class="search-item history" data-index="${searchResults.length - 1}"><i class="fa fa-history"></i> ${term}</div>`;
        });
        renderDropdown(html);
    }

    function saveRecentSearch(term) {
        if (!term) return;
        let recent = JSON.parse(localStorage.getItem('recentCarSearches') || '[]');
        recent = recent.filter(t => t !== term);
        recent.unshift(term);
        if (recent.length > 10) recent.pop();
        localStorage.setItem('recentCarSearches', JSON.stringify(recent));
    }

    function executeSearchAction(index) {
        const item = searchResults[index];
        if (!item) return;

        dropdown.style.display = 'none';
        searchInput.blur();

        if (item.type === 'page') {
            navigateTo(item.data.page);
        } else if (item.type === 'car') {
            saveRecentSearch(item.data.name);
            navigateTo('carsManager.html');
            setTimeout(() => {
                const carInput = document.getElementById('search-car');
                if (carInput) {
                    carInput.value = item.data.name;
                    carInput.dispatchEvent(new Event('input'));
                }
            }, 500);
        } else if (item.type === 'customer') {
            saveRecentSearch(item.data.name);
            navigateTo('customersManager.html');
            setTimeout(() => {
                const cusInput = document.getElementById('search-customer');
                if (cusInput) {
                    cusInput.value = item.data.name;
                    cusInput.dispatchEvent(new Event('input'));
                }
            }, 500);
        } else if (item.type === 'history') {
            searchInput.value = item.data;
            performSearch(item.data);
        }
    }

    // Events
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        activeIndex = -1;
        debounceTimer = setTimeout(() => performSearch(e.target.value.trim()), 300);
    });

    searchInput.addEventListener('focus', () => {
        if (!searchInput.value.trim()) showRecentSearches();
        else performSearch(searchInput.value.trim());
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    dropdown.addEventListener('click', (e) => {
        const itemEl = e.target.closest('.search-item');
        if (itemEl && itemEl.dataset.index !== undefined) {
            executeSearchAction(parseInt(itemEl.dataset.index));
        }
    });

    searchInput.addEventListener('keydown', (e) => {
        if (dropdown.style.display === 'none') return;

        const items = dropdown.querySelectorAll('.search-item:not([style*="center"])');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = (activeIndex + 1) % items.length;
            items.forEach((item, i) => item.classList.toggle('active', i === activeIndex));
            items[activeIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = (activeIndex - 1 + items.length) % items.length;
            items.forEach((item, i) => item.classList.toggle('active', i === activeIndex));
            items[activeIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0) executeSearchAction(parseInt(items[activeIndex].dataset.index));
            else executeSearchAction(0); // select first by default
        } else if (e.key === 'Escape') {
            dropdown.style.display = 'none';
            searchInput.blur();
        }
    });
});
