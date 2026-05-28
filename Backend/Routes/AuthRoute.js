const express = require("express");
const passport = require("passport");
const authController = require("../Controllers/AuthController");
const authMiddleware = require("../Middlewares/authMiddleware");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);
router.get("/profile", authMiddleware.authenticateToken, authController.getProfile);
router.put("/update-profile", authMiddleware.authenticateToken, authController.updateProfile);

// Google Login
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Google Callback
router.get("/google/callback", passport.authenticate("google", { failureRedirect: "/login.html" }), authController.googleCallback);

router.get("/logout", authController.logout);

module.exports = router;