const express = require("express");
const carController = require("../Controllers/CarController");
const { authenticateToken, requireAdmin } = require('../Middlewares/authMiddleware');

const router = express.Router();

router.get("/cars", carController.getAllCars);
router.get("/cars/filterByPrice", carController.filterCarsByPrice);
router.post("/cars", authenticateToken, requireAdmin, carController.createCar);
router.put("/cars/:id", authenticateToken, requireAdmin, carController.updateCar);
router.patch("/cars/:id/stock", authenticateToken, requireAdmin, carController.updateStock);
router.delete("/cars/:id", authenticateToken, requireAdmin, carController.deleteCar);

module.exports = router;
