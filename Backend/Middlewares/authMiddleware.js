const jwt = require("jsonwebtoken");
const User = require("../models/user");

exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
        return res.status(401).json({ message: "Không có token!" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn!" });
        }
        req.user = user;
        next();
    });
};

exports.requireAdmin = async (req, res, next) => {
    try {
        // Ưu tiên kiểm tra role từ JWT token
        if (req.user && req.user.role === 'admin') {
            return next();
        }

        // Fallback: tra cứu role từ database (cho token cũ chưa có role)
        if (req.user && req.user.userId) {
            const dbUser = await User.findById(req.user.userId).select('role');
            if (dbUser && dbUser.role === 'admin') {
                req.user.role = 'admin'; // Gắn role vào request cho các middleware/controller phía sau
                return next();
            }
        }

        return res.status(403).json({ message: "Bạn không có quyền thực hiện hành động này. Yêu cầu tài khoản Admin!" });
    } catch (error) {
        console.error("Lỗi kiểm tra quyền admin:", error);
        return res.status(500).json({ message: "Lỗi server khi kiểm tra quyền!" });
    }
};