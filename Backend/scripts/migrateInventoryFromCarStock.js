const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const connectDB = require('../database');
const Car = require('../models/car');
const Inventory = require('../models/inventory');
const InventoryTransaction = require('../models/inventoryTransaction');

// Kiểm tra tham số dry-run
const isDryRun = process.argv.includes('--dry-run');

async function migrate() {
    console.log('==================================================');
    console.log('    📊 BẮT ĐẦU MIGRATION HỆ THỐNG TỒN KHO 📊     ');
    if (isDryRun) {
        console.log('        ⚠️ CHẾ ĐỘ CHẠY THỬ (DRY-RUN MODE) ⚠️       ');
        console.log('     Không có thay đổi nào được ghi vào CSDL.    ');
    }
    console.log('==================================================');

    try {
        await connectDB();
        
        const cars = await Car.find({});
        console.log(`Tìm thấy ${cars.length} xe trong database.`);
        
        let createdCount = 0;
        let updatedCount = 0;
        let missingIdCount = 0;
        let invalidStockCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const car of cars) {
            try {
                if (!car.id) {
                    console.log(`[CẢNH BÁO] Xe "${car.name}" (_id: ${car._id}) không có trường 'id' (carCode). Bỏ qua.`);
                    missingIdCount++;
                    continue;
                }

                const carCode = car.id;
                
                // Kiểm tra xem đã có bản ghi Inventory chưa
                const existingInventory = await Inventory.findOne({ carCode });
                
                let stock = car.stock;
                if (stock === undefined || stock === null || stock < 0) {
                    console.log(`[CẢNH BÁO] Xe ${carCode} có stock không hợp lệ (${stock}). Sẽ set về 0.`);
                    invalidStockCount++;
                    stock = 0;
                }

                if (existingInventory) {
                    // F1: Cập nhật inventory hiện có theo công thức chuẩn
                    const reserved = existingInventory.reservedQuantity || 0;
                    const sold = existingInventory.soldQuantity || 0;
                    const available = existingInventory.availableQuantity || 0;

                    const newPhysical = available + reserved;
                    const newTotal = available + reserved + sold;

                    // Kiểm tra xem có cần cập nhật hay không
                    const needsUpdate = 
                        existingInventory.totalQuantity !== newTotal || 
                        existingInventory.physicalQuantity !== newPhysical;

                    if (needsUpdate) {
                        console.log(`[INFO] Cập nhật xe ${carCode}: total (${existingInventory.totalQuantity || 0} -> ${newTotal}), physical (${existingInventory.physicalQuantity || 0} -> ${newPhysical})`);
                        
                        existingInventory.physicalQuantity = newPhysical;
                        existingInventory.totalQuantity = newTotal;
                        existingInventory.carObjectId = car._id; // Đồng bộ carObjectId nếu chưa khớp

                        if (!isDryRun) {
                            await existingInventory.save();
                        }
                        updatedCount++;
                    } else {
                        skippedCount++;
                    }
                } else {
                    // F2: Tạo mới Inventory + transaction MIGRATION
                    console.log(`[INFO] Phát hiện xe ${carCode} chưa có Inventory. Tạo mới.`);

                    const available = stock;
                    const reserved = 0;
                    const sold = 0;
                    const physical = available + reserved;
                    const total = available + reserved + sold;

                    const newInventory = new Inventory({
                        carCode: carCode,
                        carObjectId: car._id,
                        totalQuantity: total,
                        physicalQuantity: physical,
                        availableQuantity: available,
                        reservedQuantity: reserved,
                        soldQuantity: sold,
                        lastImportAt: new Date()
                    });

                    const transaction = new InventoryTransaction({
                        carCode: carCode,
                        type: 'MIGRATION',
                        quantity: stock,
                        reason: 'Migrate from Car.stock',
                        // Snapshot before / after cho 8 chỉ số
                        beforeTotalQuantity: 0,
                        afterTotalQuantity: total,
                        beforePhysicalQuantity: 0,
                        afterPhysicalQuantity: physical,
                        beforeAvailableQuantity: 0,
                        afterAvailableQuantity: available,
                        beforeReservedQuantity: 0,
                        afterReservedQuantity: reserved,
                        createdAt: new Date()
                    });

                    if (!isDryRun) {
                        await newInventory.save();
                        await transaction.save();
                    }
                    createdCount++;
                    console.log(`[THÀNH CÔNG] Tạo mới Inventory cho xe ${carCode} với ${stock} xe khả dụng.`);
                }
            } catch (err) {
                console.error(`[LỖI] Lỗi xử lý xe ${car.id || car._id}:`, err.message);
                errorCount++;
            }
        }

        console.log('\n==================================================');
        console.log('            📊 BÁO CÁO MIGRATION KHO 📊          ');
        console.log('==================================================');
        console.log(`- Tổng số xe kiểm tra:          ${cars.length}`);
        console.log(`- Số xe tạo mới Inventory:      ${createdCount}`);
        console.log(`- Số xe cập nhật Inventory hiện có: ${updatedCount}`);
        console.log(`- Số xe không có thay đổi (bỏ qua): ${skippedCount}`);
        console.log(`- Số xe thiếu 'id' (bỏ qua):    ${missingIdCount}`);
        console.log(`- Số xe có stock âm/không hợp lệ: ${invalidStockCount}`);
        console.log(`- Số xe gặp lỗi khi xử lý:       ${errorCount}`);
        console.log('==================================================');
        
        if (isDryRun) {
            console.log('⚠️ ĐANG CHẠY THỬ (DRY-RUN): KHÔNG CÓ THAY ĐỔI THỰC TẾ TRÊN CSDL.');
        } else {
            console.log('✅ ĐÃ HOÀN THÀNH MIGRATION THÀNH CÔNG VÀO CSDL.');
        }
        console.log('==================================================');

    } catch (error) {
        console.error('❌ LỖI HỆ THỐNG MIGRATION:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Đã ngắt kết nối database. Kết thúc.');
    }
}

migrate();
