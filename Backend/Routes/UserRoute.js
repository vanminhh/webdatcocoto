const express = require("express");
const userController = require("../Controllers/UserController");
const { authenticateToken, requireAdmin } = require('../Middlewares/authMiddleware');

const router = express.Router();

router.get("/list", authenticateToken, requireAdmin, userController.getAllUsers);
router.get("/getByID", authenticateToken, requireAdmin, userController.getUserById);
router.post("/create", authenticateToken, requireAdmin, userController.createUser);
router.post("/createAdmin", authenticateToken, requireAdmin, userController.createAdmin);
router.put("/:id", authenticateToken, requireAdmin, userController.updateUser);
router.delete("/:id", authenticateToken, requireAdmin, userController.deleteUser);

module.exports = router;