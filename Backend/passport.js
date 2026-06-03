const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const User = require("./models/user");

passport.serializeUser((user, done) => {
    done(null, user.token);
});

passport.deserializeUser((token, done) => {
    done(null, { token });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || "DUMMY_ID",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "DUMMY_SECRET",
    callbackURL: process.env.GOOGLE_REDIRECT_URI || "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log("Google Profile:", profile); // Debug Google profile
        const email = profile.emails[0].value;
        let user = await User.findOne({ email });

        if (!user) {
            console.log("Tạo user mới từ Google:", email); // Debug new user creation
            user = new User({
                name: profile.displayName,
                email: email,
                avatar: "/image/default-avatar.png", // Set default avatar
                googleId: profile.id,
                createdAt: new Date()
            });
            await user.save();
        } else if (!user.avatar || user.avatar === "/image/default-avatar.png") {
            // Cập nhật avatar nếu chưa có hoặc đang dùng avatar mặc định
            user.avatar = "/image/default-avatar.png"; // Set default avatar
            await user.save();
        }

        // Tạo token và refresh token
        const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
        const refreshToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });

        console.log("Đăng nhập Google thành công! Token:", token); // Debug successful login
        done(null, { token, refreshToken, email: user.email, name: user.name, avatar: user.avatar });
    } catch (error) {
        console.error("Lỗi trong Google Strategy:", error); // Debug error
        done(error, null);
    }
}));

module.exports = passport;