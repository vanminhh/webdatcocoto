/**
 * fixDuplicatePhones.js
 * Tìm các SĐT bị dùng chung và xóa SĐT trùng (giữ tài khoản cũ nhất, clear SĐT của tài khoản mới hơn)
 * Chạy: node scripts/fixDuplicatePhones.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/user');

async function fixDuplicatePhones() {
    console.log('🔌 Kết nối MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Kết nối thành công!\n');

    // Tìm tất cả phone bị trùng (không đếm phone rỗng "")
    const duplicates = await User.aggregate([
        { $match: { phone: { $ne: "", $ne: null, $exists: true } } },
        { $group: { _id: "$phone", count: { $sum: 1 }, users: { $push: { id: "$_id", email: "$email", name: "$name", createdAt: "$createdAt" } } } },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } }
    ]);

    if (duplicates.length === 0) {
        console.log('🎉 Không có SĐT trùng lặp nào!');
        await mongoose.disconnect();
        return;
    }

    console.log(`⚠️  Tìm thấy ${duplicates.length} SĐT bị trùng:\n`);

    let totalFixed = 0;

    for (const dup of duplicates) {
        console.log(`📞 SĐT: ${dup._id} — ${dup.count} tài khoản`);

        // Sắp xếp theo ngày tạo: giữ tài khoản cũ nhất (index 0), xóa SĐT các tài khoản còn lại
        const sorted = dup.users.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        const keeper = sorted[0];
        const toFix  = sorted.slice(1);

        console.log(`   ✅ Giữ nguyên: ${keeper.email} (${keeper.id})`);

        for (const u of toFix) {
            await User.findByIdAndUpdate(u.id, { phone: '' });
            console.log(`   🧹 Đã xóa SĐT của: ${u.email} (${u.id})`);
            totalFixed++;
        }
        console.log();
    }

    console.log(`\n✅ Hoàn tất! Đã làm sạch SĐT của ${totalFixed} tài khoản.`);
    console.log('💡 Những tài khoản bị xóa SĐT hãy cập nhật lại SĐT trong trang Hồ sơ.\n');

    await mongoose.disconnect();
    console.log('🔌 Đã ngắt kết nối MongoDB.');
}

fixDuplicatePhones().catch(err => {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
});
