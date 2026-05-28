const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
    name: { type: String, required: true },
    id: {type: String , require: true},
    URL: { type: String, required: true },
    bannerURL: { type: String },
    detailURL: { type: String },
    galleryURLs: [{ type: String }],
    seats: { type: Number },
    description: { type: String },
    Fuel: { type: String, enum: ['GAS', 'DIESEL', 'ELECTRIC', 'HYBRID'], required: true },
    Type: { type: String, enum: ['SUV', 'SEDAN', 'TRUCK', 'COUPE', 'HATCHBACK'], required: true },
    Price: { type: Number, required: true },
    stock: { type: Number, default: 20 } // DEPRECATED: Use Inventory model instead
});
module.exports = mongoose.model('Car', carSchema);