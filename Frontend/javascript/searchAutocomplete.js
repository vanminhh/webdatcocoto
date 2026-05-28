/* ═══════════════════════════════════════
   SEARCH AUTOCOMPLETE — N18-AUTO Admin
   Reusable module: gợi ý khi gõ + filter bảng
   ═══════════════════════════════════════ */

/**
 * Khởi tạo autocomplete cho một input tìm kiếm
 * @param {Object} config
 * @param {string} config.inputId         — ID của input search
 * @param {Function} config.getItems      — Hàm trả về mảng dữ liệu hiện tại
 * @param {Function} config.getSuggestionText — Hàm nhận item, trả về text gợi ý chính
 * @param {Function} config.getSuggestionSub  — Hàm nhận item, trả về text phụ (badge)
 * @param {Function} config.matchFn       — Hàm (item, searchTerm) => boolean
 * @param {Function} config.onFilter      — Hàm (searchTerm) để filter bảng
 * @param {string}   config.placeholder   — Placeholder mặc định cho input
 */
function initSearchAutocomplete(config) {
    const input = document.getElementById(config.inputId);
    if (!input) return null;

    // ── Inject CSS (chỉ 1 lần) ──
    if (!document.getElementById('search-ac-styles')) {
        const style = document.createElement('style');
        style.id = 'search-ac-styles';
        style.textContent = `
            .search-ac-wrapper {
                position: relative;
                display: inline-block;
                width: 100%;
            }
            .search-ac-dropdown {
                position: absolute;
                top: calc(100% + 4px);
                left: 0;
                right: 0;
                background: #1a1a1a;
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 10px;
                max-height: 260px;
                overflow-y: auto;
                z-index: 1000;
                display: none;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                scrollbar-width: thin;
                scrollbar-color: #333 transparent;
            }
            .search-ac-dropdown::-webkit-scrollbar { width: 5px; }
            .search-ac-dropdown::-webkit-scrollbar-track { background: transparent; }
            .search-ac-dropdown::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
            .search-ac-item {
                padding: 9px 14px;
                cursor: pointer;
                color: #ccc;
                font-size: 13px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                transition: background 0.12s;
                border-bottom: 1px solid rgba(255,255,255,0.04);
                font-family: 'Be Vietnam Pro', sans-serif;
            }
            .search-ac-item:last-child { border-bottom: none; }
            .search-ac-item:hover,
            .search-ac-item.ac-active {
                background: rgba(200,16,46,0.08);
                color: #fff;
            }
            .search-ac-item__text {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .search-ac-item__text em {
                color: #C8102E;
                font-style: normal;
                font-weight: 700;
            }
            .search-ac-item__sub {
                font-size: 11px;
                color: #666;
                background: rgba(255,255,255,0.06);
                padding: 2px 8px;
                border-radius: 4px;
                white-space: nowrap;
                flex-shrink: 0;
            }
            .search-ac-empty {
                padding: 14px;
                text-align: center;
                color: #555;
                font-size: 13px;
                font-family: 'Be Vietnam Pro', sans-serif;
            }
            /* Active filter tag */
            .search-ac-tag {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: rgba(200,16,46,0.12);
                border: 1px solid rgba(200,16,46,0.3);
                color: #eee;
                padding: 6px 10px 6px 14px;
                border-radius: 8px;
                font-size: 13px;
                font-family: 'Be Vietnam Pro', sans-serif;
                font-weight: 500;
                max-width: 100%;
                position: absolute;
                top: 50%;
                left: 10px;
                transform: translateY(-50%);
                z-index: 2;
                pointer-events: auto;
            }
            .search-ac-tag__close {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 18px;
                height: 18px;
                border-radius: 4px;
                background: rgba(255,255,255,0.1);
                border: none;
                color: #aaa;
                cursor: pointer;
                font-size: 12px;
                line-height: 1;
                transition: all 0.15s;
                padding: 0;
                font-family: 'Be Vietnam Pro', sans-serif;
            }
            .search-ac-tag__close:hover {
                background: rgba(220,53,69,0.3);
                color: #fff;
            }
        `;
        document.head.appendChild(style);
    }

    // ── Wrap input ──
    const wrapper = document.createElement('div');
    wrapper.className = 'search-ac-wrapper';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    // ── Create dropdown ──
    const dropdown = document.createElement('div');
    dropdown.className = 'search-ac-dropdown';
    dropdown.id = config.inputId + '-ac-dropdown';
    wrapper.appendChild(dropdown);

    // ── Create filter tag (hidden initially) ──
    const tag = document.createElement('span');
    tag.className = 'search-ac-tag';
    tag.style.display = 'none';
    wrapper.appendChild(tag);

    let activeIndex = -1;
    let currentSuggestions = [];
    let activeFilter = null; // Đang filter theo gì

    // ── Highlight match ──
    function highlightMatch(text, term) {
        if (!term) return text;
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<em>$1</em>');
    }

    // ── Render suggestions ──
    function renderSuggestions(term) {
        if (!term || activeFilter) {
            dropdown.style.display = 'none';
            return;
        }

        const items = config.getItems();
        const lowerTerm = term.toLowerCase().trim();

        currentSuggestions = items.filter(item => config.matchFn(item, lowerTerm)).slice(0, 8);

        if (currentSuggestions.length === 0) {
            dropdown.innerHTML = `<div class="search-ac-empty">Không tìm thấy "${term}"</div>`;
            dropdown.style.display = 'block';
            return;
        }

        dropdown.innerHTML = currentSuggestions.map((item, i) => {
            const mainText = config.getSuggestionText(item);
            const subText = config.getSuggestionSub ? config.getSuggestionSub(item) : '';
            return `
                <div class="search-ac-item" data-index="${i}">
                    <span class="search-ac-item__text">${highlightMatch(mainText, lowerTerm)}</span>
                    ${subText ? `<span class="search-ac-item__sub">${subText}</span>` : ''}
                </div>
            `;
        }).join('');

        dropdown.style.display = 'block';
        activeIndex = -1;
    }

    // ── Apply filter tag ──
    function applyFilter(item, displayText) {
        activeFilter = item;
        const term = config.getSuggestionText(item);

        // Hiển thị tag
        tag.innerHTML = `
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${displayText || term}</span>
            <button class="search-ac-tag__close" title="Xóa bộ lọc">✕</button>
        `;
        tag.style.display = 'inline-flex';

        // Ẩn input text
        input.style.visibility = 'hidden';
        input.value = term;

        // Close dropdown
        dropdown.style.display = 'none';

        // Filter bảng bằng đúng ITEM được chọn
        config.onFilter(term, item);

        // Close button
        tag.querySelector('.search-ac-tag__close').addEventListener('click', clearFilter);
    }

    // ── Clear filter ──
    function clearFilter() {
        activeFilter = null;
        tag.style.display = 'none';
        input.style.visibility = 'visible';
        input.value = '';
        input.focus();
        config.onFilter('', null);
    }

    // ── Event Listeners ──
    let debounce;
    input.addEventListener('input', (e) => {
        clearTimeout(debounce);
        const val = e.target.value.trim();
        
        debounce = setTimeout(() => {
            renderSuggestions(val);
            // Live filter bảng khi gõ (không có selected item)
            config.onFilter(val, null);
        }, 150);
    });

    input.addEventListener('focus', () => {
        const val = input.value.trim();
        if (val && !activeFilter) {
            renderSuggestions(val);
        }
    });

    // Click chọn gợi ý
    dropdown.addEventListener('click', (e) => {
        const itemEl = e.target.closest('.search-ac-item');
        if (!itemEl) return;
        const idx = parseInt(itemEl.dataset.index);
        const item = currentSuggestions[idx];
        if (item) {
            applyFilter(item, config.getSuggestionText(item));
        }
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
        if (dropdown.style.display === 'none' || dropdown.style.display === '') return;

        const items = dropdown.querySelectorAll('.search-ac-item');
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = (activeIndex + 1) % items.length;
            items.forEach((el, i) => el.classList.toggle('ac-active', i === activeIndex));
            items[activeIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = (activeIndex - 1 + items.length) % items.length;
            items.forEach((el, i) => el.classList.toggle('ac-active', i === activeIndex));
            items[activeIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selectedIdx = activeIndex >= 0 ? activeIndex : 0;
            const item = currentSuggestions[selectedIdx];
            if (item) {
                applyFilter(item, config.getSuggestionText(item));
            }
        } else if (e.key === 'Escape') {
            dropdown.style.display = 'none';
        }
    });

    // Click outside đóng dropdown
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    return { clearFilter, applyFilter };
}
