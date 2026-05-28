const mongoose = require('mongoose');
const Car = require('./Models/Car');
const Inventory = require('./Models/Inventory');
const InventoryTransaction = require('./Models/InventoryTransaction');
const request = require('http'); // but we'll use local script for direct DB check or express check.

async function runQA() {
    console.log("=== START QA BACKEND ===");
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/webbanoto', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("✅ Kết nối DB thành công.");

        // 1. Check Inventory Consistency
        const cars = await Car.find();
        let consistent = true;
        for (const car of cars) {
            const inv = await Inventory.findOne({ carObjectId: car._id });
            if (!inv) {
                console.log(`❌ Lỗi: Xe ${car.id} không có bản ghi Inventory!`);
                consistent = false;
            } else if (car.quantity !== inv.stockQuantity) {
                console.log(`❌ Lỗi: Xe ${car.id} lệch số lượng! Car(${car.quantity}) vs Inv(${inv.stockQuantity})`);
                consistent = false;
            }
        }
        if (consistent) console.log("✅ Inventory hoàn toàn nhất quán.");

        // 2. Kiểm tra Import Transaction
        const txs = await InventoryTransaction.find({ type: 'IMPORT' });
        if (txs.length > 0) {
            console.log(`✅ Tìm thấy ${txs.length} giao dịch IMPORT.`);
        } else {
            console.log(`⚠️ Không có giao dịch IMPORT nào để verify.`);
        }

    } catch (e) {
        console.error("QA Lỗi:", e);
    } finally {
        await mongoose.disconnect();
        console.log("=== END QA ===");
    }
}

runQA();
