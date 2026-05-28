const Car = require('../models/car');
const Inventory = require('../models/inventory');
const InventoryService = require('../services/InventoryService');

// Helper function map stock from Inventory
const mapStockToCars = async (cars) => {
    if (!cars || (Array.isArray(cars) && cars.length === 0)) return cars;
    
    const isArray = Array.isArray(cars);
    const carList = isArray ? cars : [cars];
    
    const result = carList.map(car => car.toObject ? car.toObject() : car);
    
    const carIds = result.map(car => car._id);
    const inventories = await Inventory.find({ carObjectId: { $in: carIds } });
    
    const inventoryMap = {};
    inventories.forEach(inv => {
        inventoryMap[inv.carObjectId.toString()] = inv.availableQuantity;
    });
    
    result.forEach(car => {
        const availQty = inventoryMap[car._id.toString()] !== undefined ? inventoryMap[car._id.toString()] : 0;
        // Fallback về 0 nếu chưa có record Inventory
        car.stock = availQty;
        car.availableQuantity = availQty;
    });
    
    return isArray ? result : result[0];
};

// Lấy danh sách xe
const getAllCars = async (req, res) => {
    try {
        const cars = await Car.find();
        const mappedCars = await mapStockToCars(cars);
        res.json(mappedCars);
    } catch (error) {
        console.error('Error fetching cars:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Lọc xe theo giá
const filterCarsByPrice = async (req, res) => {
    try {
        const { minPrice, maxPrice } = req.query;
        const query = {};

        if (minPrice) query.Price = { $gte: parseInt(minPrice) };
        if (maxPrice) query.Price = { ...query.Price, $lte: parseInt(maxPrice) };

        const cars = await Car.find(query);
        const mappedCars = await mapStockToCars(cars);
        res.json(mappedCars);
    } catch (error) {
        console.error('Error filtering cars by price:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Tìm xe theo tên
const getCarsByName = async (carName) => {
    try {
        const cars = await Car.find({ name: { $regex: carName, $options: "i" } });
        return await mapStockToCars(cars);
    } catch (error) {
        console.error('Error fetching cars by name:', error);
        throw error;
    }
};

// Lọc xe theo loại
const filterCarsByType = async (carType) => {
    try {
        const cars = await Car.find({ Type: carType });
        return await mapStockToCars(cars);
    } catch (error) {
        console.error('Error filtering cars by type:', error);
        throw error;
    }
};

// Tạo xe mới
const createCar = async (req, res) => {
    let createdCar = null;
    try {
        const { initialQuantity, id, Price, ...carData } = req.body;
        
        // Validate trùng mã xe
        if (id) {
            const existingCar = await Car.findOne({ id });
            if (existingCar) {
                return res.status(400).json({ message: `Mã xe '${id}' đã tồn tại!` });
            }
        }
        
        // Validate giá hợp lệ
        if (Price !== undefined && Price < 0) {
            return res.status(400).json({ message: "Giá xe không được là số âm!" });
        }
        
        // Validate số lượng
        const initQty = parseInt(initialQuantity);
        if (initialQuantity !== undefined && (isNaN(initQty) || initQty < 0)) {
            return res.status(400).json({ message: "Số lượng ban đầu không hợp lệ!" });
        }
        
        // Tạo xe mới
        createdCar = new Car({ ...carData, id, Price });
        await createdCar.save();
        
        // Khởi tạo inventory ban đầu bằng 0
        await Inventory.create({
            carCode: createdCar.id,
            carObjectId: createdCar._id,
            totalQuantity: 0,
            physicalQuantity: 0,
            availableQuantity: 0,
            reservedQuantity: 0,
            soldQuantity: 0
        });

        // Nếu có initialQuantity > 0, thực hiện nhập kho thông qua InventoryService.importStock
        if (initQty && initQty > 0) {
            const adminId = req.user ? req.user.id || req.user._id : null;
            await InventoryService.importStock(
                createdCar.id, 
                initQty, 
                'Nhập kho ban đầu khi tạo xe mới', 
                adminId
            );
        }

        res.status(201).json({ message: "Thêm xe thành công!", car: createdCar });
    } catch (error) {
        console.error('Error creating car:', error);
        
        // Rollback: nếu đã lưu Car thành công nhưng sau đó gặp lỗi ở bước Inventory, ta xóa Car vừa tạo
        if (createdCar && createdCar._id) {
            try {
                await Car.findByIdAndDelete(createdCar._id);
                await Inventory.deleteOne({ carObjectId: createdCar._id });
                console.log(`Rollback: Đã xóa xe ${createdCar._id} và Inventory do lỗi khởi tạo kho.`);
            } catch (rollbackErr) {
                console.error('Lỗi khi thực hiện rollback tạo xe:', rollbackErr);
            }
        }
        
        res.status(500).json({ message: "Lỗi khi tạo xe", error: error.message });
    }
};

// Cập nhật xe
const updateCar = async (req, res) => {
    try {
        const { id, Price } = req.body;
        
        // Validate trùng mã xe (nếu đổi mã)
        if (id) {
            const duplicate = await Car.findOne({ _id: { $ne: req.params.id }, id });
            if (duplicate) {
                return res.status(400).json({ message: `Mã xe '${id}' đã tồn tại!` });
            }
        }
        
        // Validate giá
        if (Price !== undefined && Price < 0) {
            return res.status(400).json({ message: "Giá xe không được là số âm!" });
        }

        const updatedCar = await Car.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedCar) return res.status(404).json({ message: 'Xe không tồn tại' });
        
        const mappedCar = await mapStockToCars(updatedCar);
        res.status(200).json({ message: "Cập nhật xe thành công!", car: mappedCar });
    } catch (error) {
        console.error('Error updating car:', error);
        res.status(500).json({ message: "Lỗi khi cập nhật xe", error: error.message });
    }
};

// Xóa xe
const deleteCar = async (req, res) => {
    try {
        const deletedCar = await Car.findByIdAndDelete(req.params.id);
        if (!deletedCar) return res.status(404).json({ message: 'Xe không tồn tại' });
        res.status(200).json({ message: 'Xóa xe thành công!' });
    } catch (error) {
        console.error('Error deleting car:', error);
        res.status(500).json({ message: "Lỗi khi xóa xe", error: error.message });
    }
};

// Cập nhật tồn kho (DEPRECATED)
const updateStock = async (req, res) => {
    // Deprecated route, return 410 Gone
    return res.status(410).json({ message: 'API update stock trực tiếp trên Car đã bị loại bỏ. Vui lòng sử dụng luồng nhập hàng mới (Inventory).' });
};

// Export các hàm
module.exports = {
    getAllCars,
    filterCarsByPrice,
    getCarsByName,
    filterCarsByType,
    createCar,
    updateCar,
    deleteCar,
    updateStock
};
