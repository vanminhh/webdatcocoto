const express = require("express");
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../Middlewares/authMiddleware');

// Route to fetch the list of customers
const customerController = require("../Controllers/CustomerController");
router.post("/create", customerController.createCustomer);
router.get("/list", authenticateToken, requireAdmin, customerController.getAllCustomers);
// ⚠️ Route delete-all PHẢI đăng ký TRƯỚC /:id để tránh Express match nhầm "delete-all" vào param :id
router.delete("/delete-all", authenticateToken, requireAdmin, customerController.deleteAllCustomers);
router.delete("/:id", authenticateToken, requireAdmin, customerController.deleteCustomer);
router.put("/:id", authenticateToken, requireAdmin, customerController.updateCustomer);
module.exports = router;