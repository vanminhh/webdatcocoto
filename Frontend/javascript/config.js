/**
 * config.js — Cấu hình API Base URL cho toàn bộ Frontend
 * 
 * File này PHẢI được load trước tất cả các script khác trong mỗi trang HTML.
 * Tự động detect môi trường: localhost → dev, còn lại → production.
 */
(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════
    // CẤU HÌNH: Thay đổi URL production sau khi deploy Render
    // ═══════════════════════════════════════════════════════
    const PRODUCTION_API_URL = 'https://webbanoto-api.onrender.com';

    // Tự động detect môi trường
    const isLocal = window.location.hostname === 'localhost' 
                 || window.location.hostname === '127.0.0.1';

    window.API_BASE = isLocal ? 'http://localhost:4000' : PRODUCTION_API_URL;

    console.log(`[Config] API_BASE = ${window.API_BASE} (${isLocal ? 'DEV' : 'PRODUCTION'})`);
})();
