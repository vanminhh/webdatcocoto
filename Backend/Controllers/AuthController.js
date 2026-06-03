const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user"); // Import User Model

let refreshTokens = []; // Store refresh tokens temporarily (should be stored in DB in production)

// Đăng ký tài khoản
const register = async (req, res) => {
    try {
        console.log("Đăng ký tài khoản:", req.body);
        const { name, email, password, phone, address } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        // Kiểm tra email đã tồn tại
        const existingEmail = await User.findOne({ email: normalizedEmail });
        if (existingEmail) {
            return res.status(400).json({ message: "Email đã được sử dụng!" });
        }

        // Kiểm tra số điện thoại đã tồn tại (chỉ kiểm tra khi có nhập SĐT)
        if (phone && phone.trim()) {
            const existingPhone = await User.findOne({ phone: phone.trim() });
            if (existingPhone) {
                return res.status(400).json({ message: "Số điện thoại này đã được liên kết với tài khoản khác!" });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name: name || "User",
            email: normalizedEmail,
            password: hashedPassword,
            phone: phone ? phone.trim() : "",
            address: address || "",
            createdAt: new Date(),
        });

        await newUser.save();
        res.json({ message: "Đăng ký thành công!", user: newUser });
    } catch (error) {
        console.error("Lỗi đăng ký:", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
};

// Đăng nhập
const login = async (req, res) => {
    try {
        console.log("Dữ liệu đăng nhập:", req.body); // Debug login data
        const { email, username, password } = req.body;

        let user;
        if (username) {
            console.log("Đăng nhập bằng username:", username); // Debug username
            user = await User.findOne({ username, role: "admin" });
        } else if (email) {
            console.log("Đăng nhập bằng email:", email); // Debug email
            user = await User.findOne({ email });
        } else {
            return res.status(400).json({ message: "Vui lòng nhập email hoặc username!" });
        }
        
        if (!user) {
            console.error("Không tìm thấy user!"); // Debug user not found
            return res.status(400).json({ message: "Tài khoản hoặc mật khẩu không đúng!" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.error("Mật khẩu không đúng!"); // Debug password mismatch
            return res.status(400).json({ message: "Tài khoản hoặc mật khẩu không đúng!" });
        }

        const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
        const refreshToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
        refreshTokens.push(refreshToken); // Store refresh token
        console.log("Đăng nhập thành công! Token:", token); // Debug token
        res.json({ 
            message: "Đăng nhập thành công!", 
            token, 
            refreshToken, 
            email: user.email, 
            name: user.name,
            username: user.username, 
            role: user.role, 
            avatar: user.avatar || "/image/default-avatar.png",
            phone: user.phone || "",
            address: user.address || ""
        });
    } catch (error) {
        console.error("Lỗi đăng nhập:", error); // Debug error
        res.status(500).json({ message: "Lỗi server!" });
    }
};

// Lấy thông tin profile từ token
const getProfile = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.user.userId });
        if (!user) return res.status(404).json({ message: "Không tìm thấy user!" });
        res.json({ 
            name: user.name, 
            email: user.email, 
            role: user.role, 
            avatar: user.avatar || "/image/default-avatar.png",
            phone: user.phone || "",
            address: user.address || "",
            createdAt: user.createdAt 
        });
    } catch (error) {
        console.error("Lỗi lấy profile:", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
};

// Cập nhật thông tin profile của user hiện tại
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, phone, address } = req.body;

        // Kiểm tra SĐT đã thuộc tài khoản khác chưa
        if (phone && phone.trim()) {
            const phoneConflict = await User.findOne({
                phone: phone.trim(),
                _id: { $ne: userId }   // Loại trừ chính mình
            });
            if (phoneConflict) {
                return res.status(400).json({
                    message: "Số điện thoại này đã được liên kết với tài khoản khác!"
                });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { name, phone: phone ? phone.trim() : "", address },
            { new: true }
        );

        if (!updatedUser) return res.status(404).json({ message: "Không tìm thấy user!" });

        res.json({
            message: "Cập nhật thành công!",
            name: updatedUser.name,
            phone: updatedUser.phone || "",
            address: updatedUser.address || ""
        });
    } catch (error) {
        console.error("Lỗi cập nhật profile:", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
};

// Google Login
const googleCallback = (req, res) => {
    const user = req.user;

    if (!user || !user.token || !user.refreshToken) {
        console.error("Lỗi: Không thể tạo token cho người dùng Google.");
        const frontendUrl = process.env.FRONTEND_URL || '';
        return res.redirect(`${frontendUrl}/login.html?error=Không thể đăng nhập bằng Google!`);
    }

    const userInfo = {
        token: user.token,
        refreshToken: user.refreshToken,
        email: user.email,
        name: user.name,
        avatar: "/image/default-avatar.png" // Set default avatar
    };

    console.log("Thông tin người dùng Google:", userInfo); // Debug user info
    const userInfoString = encodeURIComponent(JSON.stringify(userInfo));
    const frontendUrl = process.env.FRONTEND_URL || '';
    res.redirect(`${frontendUrl}/index.html?userInfo=${userInfoString}`);
};

// Refresh Token
const refreshToken = (req, res) => {
    const { token } = req.body;
    console.log("Yêu cầu làm mới token:", token); 

    if (!token) {
        console.error("Không có Refresh Token!"); 
        return res.status(401).json({ message: "Không có Refresh Token!" });
    }

    if (!refreshTokens.includes(token)) {
        console.error("Refresh Token không hợp lệ!"); 
        return res.status(403).json({ message: "Refresh Token không hợp lệ!" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const accessToken = jwt.sign({ userId: decoded.userId, role: decoded.role }, process.env.JWT_SECRET, { expiresIn: "15m" });
        console.log("Token mới được cấp:", accessToken); // Debug new token
        res.json({ accessToken });
    } catch (error) {
        console.error("Lỗi xác thực Refresh Token:", error); // Debug error
        res.status(403).json({ message: "Refresh Token không hợp lệ!" });
    }
};

// Đăng xuất
const logout = (req, res) => {
    const { token } = req.body;
    console.log("Đăng xuất, xóa token:", token); // Debug token khi đăng xuất
    refreshTokens = refreshTokens.filter(rt => rt !== token); // Xóa refresh token khỏi danh sách
    res.json({ message: "Đăng xuất thành công!" });
};

// Export tất cả hàm
module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    googleCallback,
    refreshToken,
    logout
};