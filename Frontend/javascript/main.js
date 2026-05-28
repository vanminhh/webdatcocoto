/* ════════════════════════════════════════════
   MAIN.JS — Anh Huy Auto (Luxury Theme)
   Hero Banner + Promotion System + Car Grid
   ════════════════════════════════════════════ */

// ─── Filter Toggle (Accordion) ───
function selectOption(element) {
    let parentGroup = element.parentNode;
    let options = parentGroup.querySelectorAll('.filter-option');
    options.forEach(opt => opt.classList.remove('active'));
    element.classList.add('active');
}

function toggleFilter(header) {
    let options = header.nextElementSibling;
    let isOpen = header.classList.contains('open');

    if (isOpen) {
        header.classList.remove('open');
        options.classList.remove('visible');
    } else {
        header.classList.add('open');
        options.classList.add('visible');
    }
}

// ─── Navbar / Auth ───
async function updateNavbar() {
    const urlParams = new URLSearchParams(window.location.search);
    const userInfo = urlParams.get('userInfo');

    if (userInfo) {
        const user = JSON.parse(decodeURIComponent(userInfo));
        localStorage.setItem("token", user.token);
        localStorage.setItem("email", user.email);
        localStorage.setItem("name", user.name);
        localStorage.setItem("avatar", user.avatar);
        window.history.replaceState({}, document.title, "/index.html");
    }

    const token = localStorage.getItem("token");
    const email = localStorage.getItem("email");
    const name = localStorage.getItem("name");
    const avatar = localStorage.getItem("avatar");
    const loginBtn = document.getElementById("login-btn");
    const adminManagerLink = document.querySelector('a[href="manager.html"]');
    const myOrdersLink = document.getElementById("my-orders-link");

    if (email && token) {
        loginBtn.innerHTML = `<img src="${avatar || '/image/default-avatar.png'}" alt="Avatar" class="avatar"> <span>${name || email}</span>`;
        loginBtn.href = "profile.html";
        loginBtn.onclick = null; // click đi đến profile, không logout

        // Hiển thị link Đơn của tôi và Hồ sơ
        if (myOrdersLink) myOrdersLink.style.display = "flex";
        const profileLink = document.getElementById("profile-link");
        if (profileLink) profileLink.style.display = "flex";

        try {
            const response = await fetch("http://localhost:4000/auth/profile", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
            const data = await response.json();
            if (response.ok && data.role === "admin") {
                adminManagerLink.style.display = "flex";
            } else {
                adminManagerLink.style.display = "none";
            }
        } catch (error) {
            console.error("Lỗi khi gọi API profile:", error);
            adminManagerLink.style.display = "none";
        }
    } else {
        loginBtn.innerHTML = `<i class="fa fa-user"></i> <span>Login</span>`;
        loginBtn.href = "login.html";
        loginBtn.onclick = null;
        adminManagerLink.style.display = "none";

        // Ẩn link Đơn của tôi và Hồ sơ khi chưa đăng nhập
        if (myOrdersLink) myOrdersLink.style.display = "none";
        const profileLink = document.getElementById("profile-link");
        if (profileLink) profileLink.style.display = "none";
    }
}

function logoutUser() {
    currentEmail = null;
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    localStorage.removeItem("name");
    localStorage.removeItem("avatar");
    alert("Bạn đã đăng xuất!");
    updateNavbar();
}

document.addEventListener("DOMContentLoaded", updateNavbar);

function loadPage(url) {
    let link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


/* ══════════════════════════════════════════════════════════════
   HERO BANNER — Slider Logic
   ══════════════════════════════════════════════════════════════ */
let heroCurrentSlide = 0;
let heroAutoPlayTimer = null;

function initHeroBanner() {
    const slidesContainer = document.getElementById('hero-slides');
    const dotsContainer = document.getElementById('hero-dots');
    if (!slidesContainer || !dotsContainer) return;
    if (typeof heroBanners === 'undefined' || heroBanners.length === 0) return;

    // ── Render slides ──
    heroBanners.forEach((banner, i) => {
        const slideHTML = `
            <div class="hero__slide ${i === 0 ? 'active' : ''}" data-slide="${i}" data-car-search="${banner.carSearchName}">
                <img class="hero__image"
                     src="${banner.image}"
                     alt="${banner.title}"
                     loading="${i === 0 ? 'eager' : 'lazy'}">
                <div class="hero__content">
                    <p class="hero__subtitle">${banner.subtitle}</p>
                    <h2 class="hero__title">${banner.title}</h2>
                    <p class="hero__description">${banner.description}</p>
                    <div class="hero__cta-group">
                        <button class="hero__cta hero__cta--primary" onclick="handleXemNgay('${banner.carSearchName}')">
                            ${banner.ctaText}
                        </button>
                        <button class="hero__cta hero__cta--outline" onclick="handleTimHieuThem('${banner.carSearchName}')">
                            ${banner.learnMoreText}
                        </button>
                    </div>
                </div>
            </div>
        `;
        slidesContainer.insertAdjacentHTML('beforeend', slideHTML);
    });

    // ── Render dots ──
    heroBanners.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = `hero__dot ${i === 0 ? 'active' : ''}`;
        dot.setAttribute('aria-label', `Slide ${i + 1}`);
        dot.addEventListener('click', () => goToHeroSlide(i));
        dotsContainer.appendChild(dot);
    });

    // ── Prev / Next ──
    document.getElementById('hero-prev').addEventListener('click', () => {
        goToHeroSlide(heroCurrentSlide - 1);
    });
    document.getElementById('hero-next').addEventListener('click', () => {
        goToHeroSlide(heroCurrentSlide + 1);
    });

    // ── Auto-slide 5 giây ──
    startHeroAutoPlay();

    // ── Pause khi hover ──
    const heroEl = document.getElementById('hero-banner');
    heroEl.addEventListener('mouseenter', stopHeroAutoPlay);
    heroEl.addEventListener('mouseleave', startHeroAutoPlay);
}

function goToHeroSlide(index) {
    const slides = document.querySelectorAll('.hero__slide');
    const dots = document.querySelectorAll('.hero__dot');
    if (slides.length === 0) return;

    // Wrap around
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;

    // Crossfade: bỏ active cũ, thêm active mới
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));

    slides[index].classList.add('active');
    dots[index].classList.add('active');

    heroCurrentSlide = index;
}

function startHeroAutoPlay() {
    stopHeroAutoPlay();
    heroAutoPlayTimer = setInterval(() => {
        goToHeroSlide(heroCurrentSlide + 1);
    }, 5000);
}

function stopHeroAutoPlay() {
    if (heroAutoPlayTimer) {
        clearInterval(heroAutoPlayTimer);
        heroAutoPlayTimer = null;
    }
}


// ─── NÚT "XEM NGAY" → Scroll đến card xe, highlight 2 giây ───
function handleXemNgay(carSearchName) {
    // Tìm card xe trong danh sách bằng data-car-name
    const allCards = document.querySelectorAll('.car-card[data-car-name]');
    let targetCard = null;

    allCards.forEach(card => {
        const cardName = card.getAttribute('data-car-name').toLowerCase();
        if (cardName.includes(carSearchName.toLowerCase())) {
            targetCard = card;
        }
    });

    if (targetCard) {
        // Scroll mượt đến card
        targetCard.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        // Highlight card trong 2.5 giây
        setTimeout(() => {
            targetCard.classList.add('highlight');
            setTimeout(() => {
                targetCard.classList.remove('highlight');
            }, 2500);
        }, 600); // Đợi scroll xong rồi mới highlight
    } else {
        // Nếu không tìm thấy card, scroll xuống danh sách xe
        const carList = document.getElementById('car-list');
        if (carList) {
            carList.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

// ─── NÚT "TÌM HIỂU THÊM" → Mở trang chi tiết xe ───
function handleTimHieuThem(carSearchName) {
    // Tìm car ID từ allCars array (đã fetch từ API)
    const matchedCar = allCars.find(car =>
        car.name.toLowerCase().includes(carSearchName.toLowerCase())
    );

    if (matchedCar) {
        window.location.href = `detailCar.html?id=${matchedCar.id}`;
    } else {
        // Fallback: scroll xuống danh sách xe
        handleXemNgay(carSearchName);
    }
}


/* ══════════════════════════════════════════════════════════════
   PROMO TICKER — Auto-scroll Infinite
   ══════════════════════════════════════════════════════════════ */
function initPromoTicker() {
    const track = document.getElementById('promo-ticker-track');
    if (!track) return;
    if (typeof getActivePromotions === 'undefined') return;

    const activePromos = getActivePromotions();
    if (activePromos.length === 0) {
        document.getElementById('promo-ticker').style.display = 'none';
        return;
    }

    // Render cards (nhân đôi để infinite loop)
    const cardsHTML = activePromos.map(promo => createTickerCardHTML(promo)).join('');
    track.innerHTML = cardsHTML + cardsHTML; // duplicate cho infinite scroll
}

function createTickerCardHTML(promo) {
    const countdown = getCountdown(promo.endDate);
    const showCountdown = isExpiringSoon(promo.endDate);

    return `
        <div class="ticker-card" onclick="scrollToPromoSection()">
            <img class="ticker-card__image"
                 src="${promo.carImage}"
                 alt="${promo.carName}"
                 loading="lazy">
            <div class="ticker-card__info">
                <div class="ticker-card__name">
                    ${promo.carName}
                    <span class="ticker-card__badge">${promo.badge}</span>
                </div>
                <div class="ticker-card__prices">
                    <span class="ticker-card__original-price">${formatPrice(promo.originalPrice)}</span>
                    <span class="ticker-card__sale-price">${formatPrice(promo.salePrice)}</span>
                </div>
                ${showCountdown ? `
                    <div class="ticker-card__countdown" data-end="${promo.endDate}">
                        ⏰ Còn ${countdown.days}N ${countdown.hours}G ${countdown.minutes}P
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function scrollToPromoSection() {
    const section = document.getElementById('promo-section');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}


/* ══════════════════════════════════════════════════════════════
   PROMO SECTION — Featured Promotions Grid
   ══════════════════════════════════════════════════════════════ */
function initPromoSection() {
    const grid = document.getElementById('promo-section-grid');
    const section = document.getElementById('promo-section');
    if (!grid || !section) return;
    if (typeof getActivePromotions === 'undefined') return;

    const activePromos = getActivePromotions();
    if (activePromos.length === 0) {
        section.style.display = 'none';
        return;
    }

    // Hiển thị tối đa 3 promo nổi bật nhất
    const topPromos = activePromos.slice(0, 3);

    grid.innerHTML = topPromos.map(promo => createPromoCardHTML(promo)).join('');

    // Bắt đầu countdown timer
    startCountdownTimers();
}

function getBadgeClass(badge) {
    const b = badge.toUpperCase();
    if (b.includes('HOT')) return 'promo-card__type-badge--hot';
    if (b.includes('MỚI') || b.includes('NEW')) return 'promo-card__type-badge--new';
    if (b.includes('FLASH')) return 'promo-card__type-badge--flash';
    if (b.includes('SẮP HẾT') || b.includes('ENDING')) return 'promo-card__type-badge--ending';
    return 'promo-card__type-badge--hot';
}

function createPromoCardHTML(promo) {
    const countdown = getCountdown(promo.endDate);
    const discountLabel = getDiscountLabel(promo);
    const progress = promo.totalSlots > 0
        ? Math.round((promo.remainingSlots / promo.totalSlots) * 100)
        : 50;

    return `
        <article class="promo-card" data-promo-id="${promo.id}">
            <div class="promo-card__image-wrapper">
                <span class="promo-card__discount-badge">${discountLabel}</span>
                <span class="promo-card__type-badge ${getBadgeClass(promo.badge)}">${promo.badge}</span>
                <img class="promo-card__image"
                     src="${promo.carImage}"
                     alt="${promo.carName} - Khuyến mãi"
                     loading="lazy">
            </div>
            <div class="promo-card__body">
                <h3 class="promo-card__name">${promo.carName}</h3>
                <p class="promo-card__promo-title">${promo.promoDescription}</p>

                <div class="promo-card__prices">
                    <span class="promo-card__original-price">${formatPrice(promo.originalPrice)}</span>
                    <span class="promo-card__sale-price">${formatPrice(promo.salePrice)}</span>
                </div>

                <div class="promo-card__countdown" data-countdown-end="${promo.endDate}">
                    <div class="promo-card__countdown-item">
                        <span class="promo-card__countdown-value countdown-days">${String(countdown.days).padStart(2, '0')}</span>
                        <span class="promo-card__countdown-label">Ngày</span>
                    </div>
                    <div class="promo-card__countdown-item">
                        <span class="promo-card__countdown-value countdown-hours">${String(countdown.hours).padStart(2, '0')}</span>
                        <span class="promo-card__countdown-label">Giờ</span>
                    </div>
                    <div class="promo-card__countdown-item">
                        <span class="promo-card__countdown-value countdown-mins">${String(countdown.minutes).padStart(2, '0')}</span>
                        <span class="promo-card__countdown-label">Phút</span>
                    </div>
                    <div class="promo-card__countdown-item">
                        <span class="promo-card__countdown-value countdown-secs">${String(countdown.seconds).padStart(2, '0')}</span>
                        <span class="promo-card__countdown-label">Giây</span>
                    </div>
                </div>

                <div class="promo-card__progress">
                    <div class="promo-card__progress-text">
                        <span>Còn <strong>${promo.remainingSlots}</strong> suất ưu đãi</span>
                        <span>${progress}%</span>
                    </div>
                    <div class="promo-card__progress-bar">
                        <div class="promo-card__progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>

                <button class="promo-card__cta" onclick="openPromoDetail('${promo.carId}')">
                    <i class="fa fa-phone"></i> Đăng Ký Ngay
                </button>
            </div>
        </article>
    `;
}

// ── Mở trang chi tiết xe từ promo card ──
async function openPromoDetail(carId) {
    try {
        const res = await fetch('/api/cars');
        const cars = await res.json();
        const car = cars.find(c =>
            c.name && c.name.toLowerCase().includes(carId.toLowerCase().replace('_', ' '))
        );
        if (car) {
            window.location.href = `/detailCar.html?id=${car.id}`;
        } else {
            // Fallback: cuộn tới phần xe để user tự chọn
            const carGrid = document.querySelector('.car-grid');
            if (carGrid) carGrid.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (e) {
        console.log('Error finding car:', e);
        const carGrid = document.querySelector('.car-grid');
        if (carGrid) carGrid.scrollIntoView({ behavior: 'smooth' });
    }
}

// ── Countdown Timer (cập nhật mỗi giây) ──
function startCountdownTimers() {
    setInterval(() => {
        const countdowns = document.querySelectorAll('[data-countdown-end]');
        countdowns.forEach(el => {
            const endDate = el.getAttribute('data-countdown-end');
            const cd = getCountdown(endDate);

            const days = el.querySelector('.countdown-days');
            const hours = el.querySelector('.countdown-hours');
            const mins = el.querySelector('.countdown-mins');
            const secs = el.querySelector('.countdown-secs');

            if (days) days.textContent = String(cd.days).padStart(2, '0');
            if (hours) hours.textContent = String(cd.hours).padStart(2, '0');
            if (mins) mins.textContent = String(cd.minutes).padStart(2, '0');
            if (secs) secs.textContent = String(cd.seconds).padStart(2, '0');
        });

        // Cập nhật ticker countdown
        const tickerCountdowns = document.querySelectorAll('.ticker-card__countdown[data-end]');
        tickerCountdowns.forEach(el => {
            const endDate = el.getAttribute('data-end');
            const cd = getCountdown(endDate);
            if (!cd.expired) {
                el.textContent = `⏰ Còn ${cd.days}N ${cd.hours}G ${cd.minutes}P`;
            } else {
                el.textContent = '⏰ Đã hết hạn';
            }
        });
    }, 1000);
}


/* ══════════════════════════════════════════════════════════════
   CAR DATA & FILTERS (giữ nguyên logic)
   ══════════════════════════════════════════════════════════════ */
let allCars = [];
let currentFilters = {
    name: '',
    minPrice: null,
    maxPrice: null,
    type: 'all',
    fuel: 'all'
};

async function FetchAllCars() {
    try {
        const response = await fetch('/api/cars');
        allCars = await response.json();
        applyAllFilters();
    } catch (error) {
        console.error('Lỗi khi tải danh sách xe:', error);
        throw error;
    }
}

function applyAllFilters() {
    try {
        let filteredCars = [...allCars];

        if (currentFilters.name.trim() !== '') {
            const searchTerm = currentFilters.name.toLowerCase();
            filteredCars = filteredCars.filter(car =>
                car.name.toLowerCase().includes(searchTerm)
            );
        }

        if (currentFilters.minPrice !== null || currentFilters.maxPrice !== null) {
            filteredCars = filteredCars.filter(car => {
                const priceMatch =
                    (currentFilters.minPrice === null || car.Price >= currentFilters.minPrice) &&
                    (currentFilters.maxPrice === null || car.Price <= currentFilters.maxPrice);
                return priceMatch;
            });
        }

        if (currentFilters.type !== 'all') {
            filteredCars = filteredCars.filter(car =>
                car.Type.toLowerCase() === currentFilters.type.toLowerCase()
            );
        }

        if (currentFilters.fuel !== 'all') {
            filteredCars = filteredCars.filter(car =>
                car.Fuel.toLowerCase() === currentFilters.fuel.toLowerCase()
            );
        }

        loadCars(filteredCars);
    } catch (error) {
        console.error('Lỗi khi áp dụng bộ lọc:', error);
        throw error;
    }
}

function updateNameFilter(name) {
    currentFilters.name = name;
    applyAllFilters();
}

function updatePriceFilter(minPrice, maxPrice) {
    currentFilters.minPrice = minPrice;
    currentFilters.maxPrice = maxPrice;
    applyAllFilters();
}

function updateTypeFilter(type) {
    currentFilters.type = type;
    applyAllFilters();
}

function updateFuelFilter(fuel) {
    currentFilters.fuel = fuel;
    applyAllFilters();
}


/* ══════════════════════════════════════════════════════════════
   RENDER CAR CARDS (Premium Template + Promo Badge)
   ══════════════════════════════════════════════════════════════ */
function getFuelBadge(fuel) {
    const f = (fuel || '').toLowerCase();
    if (f === 'gas' || f.includes('xăng')) {
        return { label: 'GASOLINE', cls: 'car-card__badge--gas' };
    }
    return { label: 'DIESEL', cls: 'car-card__badge--oil' };
}

function formatPrice(price) {
    return price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

async function loadCars(cars) {
    try {
        const carList = document.getElementById('car-list');
        carList.innerHTML = '';

        if (cars.length === 0) {
            carList.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                    <i class="fa fa-car" style="font-size: 48px; opacity: 0.3; margin-bottom: 16px; display: block;"></i>
                    <p style="font-family: var(--font-heading); font-size: 20px; color: var(--text-light);">Không tìm thấy xe phù hợp</p>
                    <p style="margin-top: 8px;">Thử thay đổi bộ lọc để xem thêm kết quả</p>
                </div>
            `;
            return;
        }

        // Lấy danh sách KM đang hoạt động để thêm badge
        const activePromos = (typeof getActivePromotions !== 'undefined') ? getActivePromotions() : [];

        cars.forEach((car, index) => {
            const badge = getFuelBadge(car.Fuel);
            const delay = index * 0.06;
            const stock = car.availableQuantity !== undefined ? car.availableQuantity : (car.stock !== undefined ? car.stock : 0);
            const isSoldOut = stock <= 0;

            // Kiểm tra xe có đang khuyến mãi không
            const carPromo = activePromos.find(p =>
                car.name.toLowerCase().includes(p.carName.toLowerCase().split(' ').pop())
            );
            const promoBadgeHTML = carPromo
                ? `<span class="car-card__promo-badge">🔥 ĐANG KM</span>`
                : '';
            const stockBadgeHTML = isSoldOut
                ? `<span class="car-card__stock-badge car-card__stock-badge--sold">HẾT HÀNG</span>`
                : `<span class="car-card__stock-badge">Còn ${stock} xe</span>`;

            const carHTML = `
                <article class="car-card ${isSoldOut ? 'car-card--sold-out' : ''}" data-car-name="${car.name}" onclick="${isSoldOut ? 'alert(\'Xe đã hết hàng!\')' : `delayedRedirect(${car.id})`}" style="animation-delay: ${delay}s;">
                    <div class="car-card__image-wrapper">
                        <span class="car-card__badge ${badge.cls}">${badge.label}</span>
                        ${promoBadgeHTML}
                        ${stockBadgeHTML}
                        <img class="car-card__image"
                             src="${car.URL}"
                             alt="${car.name} - ${car.Type || 'Ô tô'}"
                             loading="lazy">
                    </div>
                    <div class="car-card__body">
                        <h3 class="car-card__name">${car.name}</h3>
                        <div class="car-card__price">${formatPrice(car.Price)}</div>
                        <div class="car-card__specs">
                            <div class="car-card__spec">
                                <i class="fa fa-user-friends"></i>
                                <span>${car.seats ? car.seats + ' chỗ' : '5 chỗ'}</span>
                            </div>
                            <div class="car-card__spec-divider"></div>
                            <div class="car-card__spec">
                                <i class="fa fa-cog"></i>
                                <span>${car.transmission || 'CVT'}</span>
                            </div>
                            <div class="car-card__spec-divider"></div>
                            <div class="car-card__spec">
                                <i class="fa fa-gas-pump"></i>
                                <span>${car.Fuel || 'Xăng'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="car-card__cta">
                        <span>${isSoldOut ? 'Hết hàng' : 'Xem Chi Tiết'}</span>
                        <i class="fa fa-arrow-right"></i>
                    </div>
                </article>
            `;
            carList.insertAdjacentHTML('beforeend', carHTML);
        });

    } catch (error) {
        console.error('Lỗi khi tải danh sách xe:', error);
        document.getElementById('car-list').innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <p>Không thể tải danh sách xe. Vui lòng thử lại sau.</p>
            </div>
        `;
    }
}

module.exports = email;