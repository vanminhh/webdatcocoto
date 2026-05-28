const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Order = require('../models/order');
const Inventory = require('../models/inventory');

async function debug() {
    await require('../database')();
    const orders = await Order.find({ status: { $in: ['pending', 'deposited'] } });
    console.log('Orders pending/deposited:');
    for (const o of orders) {
        console.log(`- ID: ${o._id}, status: ${o.status}, inventoryReserved: ${o.inventoryReserved}, physical: ${o.inventoryPhysicalDeductedAt!=null}, created: ${o.createdAt}, expire: ${o.deposit_expire_date}`);
    }
    const inv = await Inventory.findOne({ carCode: 'CAR_A_QA' });
    console.log('Inventory:', inv);
    process.exit(0);
}
debug();
