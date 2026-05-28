/* ═══════════════════════════════════════════════════
   PROMOTIONS.JS — Hệ thống Khuyến Mãi & Hero Banner
   Anh Huy Auto — Toyota Vietnam
   ═══════════════════════════════════════════════════ */

// ===== CÁCH THÊM KHUYẾN MÃI MỚI =====
// 1. Mở file promotions.js
// 2. Thêm object mới vào mảng promotions[] bên dưới
// 3. Điền đầy đủ các trường: carId, carName, salePrice, endDate, isActive: true
// 4. Save file → xe tự động xuất hiện trên panel khuyến mãi
// 5. Đặt isActive: false để ẩn khuyến mãi mà không cần xóa
// =====================================

// ─── DỮ LIỆU HERO BANNER (Admin có thể chỉnh sửa) ───
const heroBanners = [
    {
        id: 'banner_1',
        title: 'Toyota Alphard',
        subtitle: 'Đẳng Cấp Thương Gia',
        description: 'Không gian nội thất sang trọng bậc nhất phân khúc MPV cao cấp. Trải nghiệm đẳng cấp hoàng gia.',
        image: '/image/img_banner/4.png',
        carSearchName: 'alphard',   // Tên xe dùng để tìm trong danh sách car grid
        ctaText: 'Xem ngay',
        learnMoreText: 'Tìm hiểu thêm'
    },
    {
        id: 'banner_2',
        title: 'Toyota Land Cruiser',
        subtitle: 'Chinh Phục Mọi Địa Hình',
        description: 'Biểu tượng SUV huyền thoại với sức mạnh vượt trội và công nghệ tiên tiến nhất.',
        image: '/image/img_banner/6.png',
        carSearchName: 'land cruiser',
        ctaText: 'Khám phá',
        learnMoreText: 'Tìm hiểu thêm'
    },
    {
        id: 'banner_3',
        title: 'Toyota Camry 2025',
        subtitle: 'Sedan Hoàn Hảo',
        description: 'Thiết kế thể thao, công nghệ hybrid tiết kiệm nhiên liệu. Lựa chọn số 1 phân khúc D.',
        image: '/image/img_banner/22.png',
        carSearchName: 'camry',
        ctaText: 'Xem ngay',
        learnMoreText: 'Tìm hiểu thêm'
    },
    {
        id: 'banner_4',
        title: 'Toyota Fortuner',
        subtitle: 'Vua Địa Hình Đô Thị',
        description: 'SUV 7 chỗ bán chạy nhất Việt Nam. Mạnh mẽ — An toàn — Bền bỉ.',
        image: '/image/img_banner/1.png',
        carSearchName: 'fortuner',
        ctaText: 'Xem ngay',
        learnMoreText: 'Tìm hiểu thêm'
    }
];

// ─── DỮ LIỆU KHUYẾN MÃI (Admin có thể chỉnh sửa) ───
// ===== CÁCH THÊM KHUYẾN MÃI MỚI =====
// Copy object mẫu bên dưới, đổi thông tin, paste vào cuối mảng
// Lưu ý: carImage nên dùng URL ảnh từ database hoặc đường dẫn /image/
// =====================================
const promotions = [
    {
        id: 'promo_001',
        carId: 'alphard',
        carName: 'Toyota Alphard',
        carImage: '/image/img_banner/4.png',
        originalPrice: 4510000000,
        salePrice: 4310000000,
        discountAmount: 200000000,
        discountPercent: 0,
        promoTitle: 'Ưu đãi tháng 3',
        promoDescription: 'Giảm 200 triệu + Tặng phụ kiện chính hãng trị giá 50 triệu',
        badge: 'HOT',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        isActive: true,
        totalSlots: 10,      // Tổng suất ưu đãi
        remainingSlots: 4     // Còn lại bao nhiêu suất
    },
    {
        id: 'promo_002',
        carId: 'camry_hev',
        carName: 'Toyota Camry HEV',
        carImage: '/image/img_banner/22.png',
        originalPrice: 1460000000,
        salePrice: 1360000000,
        discountAmount: 100000000,
        discountPercent: 0,
        promoTitle: 'Flash Sale tháng 3',
        promoDescription: 'Giảm 100 triệu + Bảo hiểm vật chất 1 năm miễn phí',
        badge: 'FLASH SALE',
        startDate: '2026-03-10',
        endDate: '2026-03-20',
        isActive: true,
        totalSlots: 5,
        remainingSlots: 2
    },
    {
        id: 'promo_003',
        carId: 'fortuner',
        carName: 'Toyota Fortuner Legender',
        carImage: '/image/img_banner/1.png',
        originalPrice: 1395000000,
        salePrice: 1295000000,
        discountAmount: 100000000,
        discountPercent: 0,
        promoTitle: 'Ưu đãi đặc biệt',
        promoDescription: 'Giảm 100 triệu + Tặng camera 360 + Phim cách nhiệt',
        badge: 'MỚI',
        startDate: '2026-03-01',
        endDate: '2026-04-15',
        isActive: true,
        totalSlots: 15,
        remainingSlots: 8
    },
    {
        id: 'promo_004',
        carId: 'land_cruiser',
        carName: 'Toyota Land Cruiser 300',
        carImage: '/image/img_banner/6.png',
        originalPrice: 4580000000,
        salePrice: 4280000000,
        discountAmount: 300000000,
        discountPercent: 0,
        promoTitle: 'Siêu ưu đãi VIP',
        promoDescription: 'Giảm 300 triệu + Gói bảo dưỡng 3 năm miễn phí',
        badge: 'HOT',
        startDate: '2026-03-01',
        endDate: '2026-03-25',
        isActive: true,
        totalSlots: 3,
        remainingSlots: 1
    },
    {
        id: 'promo_005',
        carId: 'vios',
        carName: 'Toyota Vios 1.5E-MT',
        carImage: '/image/img_banner/23.png',
        originalPrice: 458000000,
        salePrice: 428000000,
        discountAmount: 30000000,
        discountPercent: 0,
        promoTitle: 'Ưu đãi mùa xuân',
        promoDescription: 'Giảm 30 triệu + Tặng bộ phụ kiện ngoại thất',
        badge: 'SẮP HẾT',
        startDate: '2026-03-05',
        endDate: '2026-03-15',
        isActive: true,
        totalSlots: 20,
        remainingSlots: 3
    },
    {
        id: 'promo_006',
        carId: 'innova_cross',
        carName: 'Toyota Innova Cross',
        carImage: '/image/img_banner/28.png',
        originalPrice: 825000000,
        salePrice: 775000000,
        discountAmount: 50000000,
        discountPercent: 0,
        promoTitle: 'Ưu đãi gia đình',
        promoDescription: 'Giảm 50 triệu + Tặng ghế trẻ em + Thảm sàn',
        badge: 'MỚI',
        startDate: '2026-03-01',
        endDate: '2026-04-30',
        isActive: true,
        totalSlots: 12,
        remainingSlots: 7
    }
];


// ─── HÀM LẤY KHUYẾN MÃI ĐANG HOẠT ĐỘNG ───
// Ưu tiên lấy từ admin localStorage nếu có (đồng bộ với quản lý Sale)
// Fallback về data hardcode nếu chưa có admin data
function getActivePromotions() {
    const today = new Date();
    let source = promotions;

    // Đồng bộ từ admin localStorage nếu có
    const adminData = localStorage.getItem('adminSales');
    if (adminData) {
        try {
            source = JSON.parse(adminData);
        } catch (e) { /* fallback to hardcoded */ }
    }

    return source.filter(p =>
        p.isActive &&
        new Date(p.startDate) <= today &&
        new Date(p.endDate) >= today
    ).sort((a, b) => (b.discountAmount || 0) - (a.discountAmount || 0));
}

// ─── HÀM TÍNH COUNTDOWN ───
// Trả về { days, hours, minutes, seconds, expired }
function getCountdown(endDateStr) {
    const now = new Date();
    const end = new Date(endDateStr + 'T23:59:59');
    const diff = end - now;

    if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    }

    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        expired: false
    };
}

// ─── KIỂM TRA SẮP HẾT HẠN (< 3 NGÀY) ───
function isExpiringSoon(endDateStr) {
    const countdown = getCountdown(endDateStr);
    return !countdown.expired && countdown.days < 3;
}

// ─── FORMAT TIỀN VNĐ ───
function formatVND(amount) {
    if (amount >= 1000000000) {
        const ty = amount / 1000000000;
        return ty % 1 === 0 ? `${ty} tỷ` : `${ty.toFixed(1)} tỷ`;
    }
    if (amount >= 1000000) {
        const trieu = amount / 1000000;
        return trieu % 1 === 0 ? `${trieu} triệu` : `${trieu.toFixed(0)} triệu`;
    }
    return amount.toLocaleString('vi-VN') + ' ₫';
}

// ─── FORMAT DISCOUNT BADGE ───
function getDiscountLabel(promo) {
    if (promo.discountAmount > 0) {
        return `Giảm ${formatVND(promo.discountAmount)}`;
    }
    if (promo.discountPercent > 0) {
        return `Giảm ${promo.discountPercent}%`;
    }
    return 'Ưu đãi';
}

// ─── KIỂM TRA XE CÓ ĐANG KHUYẾN MÃI KHÔNG ───
// Dùng trong loadCars() để thêm badge "ĐANG KM" trên card
function getCarPromotion(carName) {
    const activePromos = getActivePromotions();
    return activePromos.find(p =>
        carName.toLowerCase().includes(p.carName.toLowerCase().split(' ').slice(-1)[0])
    ) || null;
}
