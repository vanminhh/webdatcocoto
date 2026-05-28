const Customer = require("../models/customer");

// Tạo mới customer
const createCustomer = async (req, res) => {
  try {
    const { name, email, phoneNumber } = req.body;

    // Kiểm tra customer đã tồn tại chưa (trùng email hoặc SĐT)
    const existingCustomer = await Customer.findOne({
      $or: [{ email }, { phoneNumber }]
    });

    if (existingCustomer) {
      // Khách hàng đã tồn tại → cho phép tạo order mới (1 khách có thể đặt nhiều xe)
      return res.status(202).json({ message: "Khách hàng đã tồn tại, cho phép tạo order." });
    }

    const newCustomer = new Customer({ name, email, phoneNumber });
    await newCustomer.save();
    return res.status(201).json({ message: "Thêm thành công!", customer: newCustomer });
  } catch (error) {
    console.error("❌ Lỗi khi tạo khách hàng:", error);

    if (!res.headersSent) {
      return res.status(500).json({ message: "Lỗi khi tạo khách hàng", error });
    }
  }
};

// Lấy danh sách tất cả customer
const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find();
    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách khách hàng", error });
  }
};

// Xoá customer theo ID
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await Customer.findByIdAndDelete(id);
    res.status(200).json({ message: "Xoá thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xoá khách hàng", error });
  }
};

// Cập nhật thông tin customer
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phoneNumber } = req.body;

    // Kiểm tra nếu khách hàng có tồn tại
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ message: "Khách hàng không tồn tại." });
    }

    // Validate trùng email/phone
    const duplicate = await Customer.findOne({
      _id: { $ne: id },
      $or: [
        { email: email ? email.toLowerCase().trim() : '' },
        { phoneNumber: phoneNumber ? phoneNumber.trim() : '' }
      ]
    });
    if (duplicate) {
      return res.status(400).json({ message: "Email hoặc Số điện thoại đã được sử dụng bởi khách hàng khác!" });
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      { name, email, phoneNumber },
      { new: true }
    );

    res.status(200).json({ message: "Cập nhật khách hàng thành công", customer: updatedCustomer });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi cập nhật khách hàng", error });
  }
};

// Xóa tất cả customer
const deleteAllCustomers = async (req, res) => {
  try {
    const beforeCount = await Customer.countDocuments();
    const result = await Customer.deleteMany({});
    res.status(200).json({
      message: "Xóa tất cả khách hàng thành công!",
      deletedCount: result.deletedCount,
      beforeCount
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa tất cả khách hàng", error });
  }
};

module.exports = {
  createCustomer,
  getAllCustomers,
  deleteCustomer,
  updateCustomer,
  deleteAllCustomers,
};