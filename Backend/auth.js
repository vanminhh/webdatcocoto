require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");

function createAuthRouter(db) {
    const router = express.Router();


    //Register
    router.post("/register", async (req, res) => {
        try {
            const { name, email, password } = req.body;
            const normalizedEmail = email.toLowerCase().trim();
            const existingUser = await db.collection("users").findOne({ email: normalizedEmail });
            if (existingUser) {
                return res.status(400).json({ message: "Email đã tồn tại!" });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = {
                name: name || "User",
                email: normalizedEmail,
                password: hashedPassword,
                createdAt: new Date(),
            };
            await db.collection("users").insertOne(newUser);
            res.json({ message: "Đăng ký thành công!" });
        } catch (error) {
            console.error("Lỗi đăng ký:", error);
            res.status(500).json({ message: "Lỗi server!" });
        }
    });

    //Login 
    router.post("/login", async (req, res) => {
        try {
            const { email, password } = req.body;
            const normalizedEmail = email.toLowerCase().trim();
            const user = await db.collection("users").findOne({ email: normalizedEmail });
            if (!user) {
                return res.status(400).json({ message: "Email hoặc mật khẩu không đúng!" });
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: "Email hoặc mật khẩu không đúng!" });
            }
            const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
            res.json({ message: "Đăng nhập thành công!", token, email: user.email });
        } catch (error) {
            console.error("Lỗi đăng nhập:", error);
            res.status(500).json({ message: "Lỗi server!" });
        }
    });

    //Check token return profile    
    router.get("/profile", async (req, res) => {
        try {
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

            if (!token) {
                console.error("Không tìm thấy token trong Authorization Header!");
                return res.status(401).json({ message: "Không có token!" });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await db.collection("users").findOne({ _id: decoded.userId });
            if (!user) return res.status(404).json({ message: "Không tìm thấy user!" });
            res.json({ name: user.name, email: user.email, createdAt: user.createdAt });
        } catch (error) {
            console.error("Lỗi lấy profile:", error);
            res.status(500).json({ message: "Lỗi server!" });
        }
    });

    //Google login
    router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

    router.get("/google/callback", passport.authenticate("google", { failureRedirect: "/login.html" }), (req, res) => {
        const user = req.user;
        const userInfo = {
            token: req.session.passport.user,
            email: user.email,
            name: user.name,
            avatar: user.avatar
        };
        const userInfoString = encodeURIComponent(JSON.stringify(userInfo));
        res.redirect(`/index.html?userInfo=${userInfoString}`);
    });

    router.get("/logout", (req, res) => {
        req.logout();
        res.redirect("/index.html");
    });

    return router;
}

module.exports = createAuthRouter;