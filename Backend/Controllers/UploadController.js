const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

let storage;

// Configure Cloudinary if credentials exist
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'webbanoto_cars',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
        }
    });
} else {
    // Fallback to local disk storage
    const uploadDir = path.join(__dirname, '../../Frontend/image/cars');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, 'car-' + uniqueSuffix + ext);
        }
    });
}

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ hỗ trợ upload file hình ảnh!'));
        }
    }
});

const uploadImage = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Vui lòng chọn một file hình ảnh.' });
    }
    
    // Return Cloudinary URL or local relative path
    const fileUrl = req.file.path ? req.file.path : `/image/cars/${req.file.filename}`;
    res.status(200).json({ 
        message: 'Upload thành công!', 
        url: fileUrl 
    });
};

module.exports = {
    upload,
    uploadImage
};
