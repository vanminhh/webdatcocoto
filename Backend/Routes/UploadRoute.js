const express = require('express');
const router = express.Router();
const uploadController = require('../Controllers/UploadController');
const { authenticateToken, requireAdmin } = require('../Middlewares/authMiddleware');

router.post('/image', authenticateToken, requireAdmin, uploadController.upload.single('image'), uploadController.uploadImage);

module.exports = router;
