/**
 * seedInventoryDefault.js
 * ─────────────────────────────────────────────────────────────────────────
 * Seed dữ liệu Inventory mặc định từ danh sách xe trong DB.
 *
 * Quy tắc seed:
 *  - totalQuantity    = 50
 *  - physicalQuantity = 50
 *  - availableQuantity= 50
 *  - reservedQuantity = 0
 *  - soldQuantity     = 0
 *  - lastImportAt     = 2026-04-20T00:00:00.000Z
 *
 * Hành vi:
 *  - Xe đã có Inventory → bỏ qua (không ghi đè)
 *  - Xe chưa có Inventory → tạo mới + ghi 1 transaction IMPORT
 *  - Chế độ --dry-run: chỉ log, không ghi vào DB
 *  - Chế độ --force: ghi đè tất cả (kể cả đã có)
 *
 * Cách chạy:
 *   node scripts/seedInventoryDefault.js            # Chạy thật
 *   node scripts/seedInventoryDefault.js --dry-run  # Xem trước
 *   node scripts/seedInventoryDefault.js --force    # Ghi đè tất cả
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const connectDB = require('../database');
const Car = require('../models/car');
const Inventory = require('../models/inventory');
const InventoryTransaction = require('../models/inventoryTransaction');

// ─── Cấu hình seed ────────────────────────────────────────────────────────
const SEED_CONFIG = {
    totalQuantity:    50,
    physicalQuantity: 50,
    availableQuantity:50,
    reservedQuantity: 0,
    soldQuantity:     0,
    lastImportAt:     new Date('2026-04-20T00:00:00.000Z'),
    importReason:     'Nhập kho mặc định — seed dữ liệu ban đầu (20/04/2026)'
};

// ─── Đọc tham số CLI ──────────────────────────────────────────────────────
const isDryRun = process.argv.includes('--dry-run');
const isForce  = process.argv.includes('--force');

// ─── Main ─────────────────────────────────────────────────────────────────
async function seed() {
    console.log('');
    console.log('══════════════════════════════════════════════════════════');
    console.log('       🏭  SEED TỒN KHO MẶC ĐỊNH — N18-AUTO  🏭         ');
    if (isDryRun) console.log('        ⚠️  CHẾ ĐỘ DRY-RUN — KHÔNG GHI VÀO DB ⚠️         ');
    if (isForce)  console.log('        ⚡  CHẾ ĐỘ FORCE — GHI ĐÈ TẤT CẢ ⚡            ');
    console.log('══════════════════════════════════════════════════════════');
    console.log(`  Cấu hình seed:
    - totalQuantity    : ${SEED_CONFIG.totalQuantity}
    - physicalQuantity : ${SEED_CONFIG.physicalQuantity}
    - availableQuantity: ${SEED_CONFIG.availableQuantity}
    - reservedQuantity : ${SEED_CONFIG.reservedQuantity}
    - soldQuantity     : ${SEED_CONFIG.soldQuantity}
    - lastImportAt     : ${SEED_CONFIG.lastImportAt.toLocaleDateString('vi-VN')}
  `);
    console.log('══════════════════════════════════════════════════════════');

    try {
        await connectDB();

        // Lấy tất cả xe
        const cars = await Car.find({});
        console.log(`\n📋 Tìm thấy ${cars.length} xe trong database.\n`);

        if (cars.length === 0) {
            console.log('⚠️  Không có xe nào trong DB. Script kết thúc.');
            return;
        }

        let stats = {
            total:   cars.length,
            created: 0,
            updated: 0,
            skipped: 0,
            noId:    0,
            errors:  0
        };

        for (const car of cars) {
            try {
                // Bỏ qua xe không có carCode
                if (!car.id) {
                    console.log(`  ⚠️  Xe "${car.name}" (_id: ${car._id}) THIẾU trường 'id' (carCode). Bỏ qua.`);
                    stats.noId++;
                    continue;
                }

                const carCode = car.id;
                const existingInventory = await Inventory.findOne({ carCode });

                if (existingInventory && !isForce) {
                    // Đã có inventory và không dùng --force → bỏ qua
                    console.log(`  ⏭️  [SKIP] ${carCode} — đã có Inventory (available: ${existingInventory.availableQuantity})`);
                    stats.skipped++;
                    continue;
                }

                if (existingInventory && isForce) {
                    // Chế độ FORCE → cập nhật lại
                    console.log(`  ⚡ [FORCE UPDATE] ${carCode} — "${car.name}"`);

                    if (!isDryRun) {
                        // Xóa transaction cũ của xe này (optional, giữ sạch)
                        await InventoryTransaction.deleteMany({ carCode, type: { $in: ['MIGRATION', 'IMPORT'] } });

                        await Inventory.findOneAndUpdate(
                            { carCode },
                            {
                                $set: {
                                    carObjectId:      car._id,
                                    totalQuantity:    SEED_CONFIG.totalQuantity,
                                    physicalQuantity: SEED_CONFIG.physicalQuantity,
                                    availableQuantity:SEED_CONFIG.availableQuantity,
                                    reservedQuantity: SEED_CONFIG.reservedQuantity,
                                    soldQuantity:     SEED_CONFIG.soldQuantity,
                                    lastImportAt:     SEED_CONFIG.lastImportAt
                                }
                            },
                            { runValidators: true }
                        );

                        await InventoryTransaction.create({
                            carCode,
                            type:            'IMPORT',
                            quantity:        SEED_CONFIG.totalQuantity,
                            beforeTotal:     0,
                            afterTotal:      SEED_CONFIG.totalQuantity,
                            beforePhysical:  0,
                            afterPhysical:   SEED_CONFIG.physicalQuantity,
                            beforeReserved:  0,
                            afterReserved:   SEED_CONFIG.reservedQuantity,
                            beforeAvailable: 0,
                            afterAvailable:  SEED_CONFIG.availableQuantity,
                            reason:          SEED_CONFIG.importReason,
                            createdBy:       null,
                            createdAt:       SEED_CONFIG.lastImportAt
                        });
                    }
                    stats.updated++;

                } else {
                    // Chưa có inventory → tạo mới
                    console.log(`  ✅ [CREATE] ${carCode} — "${car.name}"`);

                    if (!isDryRun) {
                        await Inventory.create({
                            carCode,
                            carObjectId:      car._id,
                            totalQuantity:    SEED_CONFIG.totalQuantity,
                            physicalQuantity: SEED_CONFIG.physicalQuantity,
                            availableQuantity:SEED_CONFIG.availableQuantity,
                            reservedQuantity: SEED_CONFIG.reservedQuantity,
                            soldQuantity:     SEED_CONFIG.soldQuantity,
                            lastImportAt:     SEED_CONFIG.lastImportAt
                        });

                        await InventoryTransaction.create({
                            carCode,
                            type:            'IMPORT',
                            quantity:        SEED_CONFIG.totalQuantity,
                            beforeTotal:     0,
                            afterTotal:      SEED_CONFIG.totalQuantity,
                            beforePhysical:  0,
                            afterPhysical:   SEED_CONFIG.physicalQuantity,
                            beforeReserved:  0,
                            afterReserved:   SEED_CONFIG.reservedQuantity,
                            beforeAvailable: 0,
                            afterAvailable:  SEED_CONFIG.availableQuantity,
                            reason:          SEED_CONFIG.importReason,
                            createdBy:       null,
                            createdAt:       SEED_CONFIG.lastImportAt
                        });
                    }
                    stats.created++;
                }

            } catch (err) {
                console.error(`  ❌ [LỖI] Xe ${car.id || car._id}: ${err.message}`);
                stats.errors++;
            }
        }

        // ─── Báo cáo kết quả ─────────────────────────────────────────────
        console.log('\n══════════════════════════════════════════════════════════');
        console.log('                   📊 BÁO CÁO KẾT QUẢ                   ');
        console.log('══════════════════════════════════════════════════════════');
        console.log(`  Tổng xe kiểm tra     : ${stats.total}`);
        console.log(`  ✅ Tạo mới           : ${stats.created}`);
        console.log(`  ⚡ Cập nhật (force)  : ${stats.updated}`);
        console.log(`  ⏭️  Bỏ qua (đã có)   : ${stats.skipped}`);
        console.log(`  ⚠️  Thiếu carCode     : ${stats.noId}`);
        console.log(`  ❌ Lỗi               : ${stats.errors}`);
        console.log('──────────────────────────────────────────────────────────');

        if (isDryRun) {
            console.log('  ⚠️  DRY-RUN: Không có thay đổi nào được ghi vào DB.');
            console.log('  ▶️  Chạy lại không có --dry-run để áp dụng thực sự.');
        } else {
            console.log('  ✅ Seed hoàn tất. Dữ liệu đã được ghi vào MongoDB.');
        }
        console.log('══════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ LỖI HỆ THỐNG:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Đã ngắt kết nối database.');
    }
}

seed();
