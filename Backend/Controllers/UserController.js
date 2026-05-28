const User = require("../models/user");
const bcrypt = require("bcryptjs");

// Lấy danh sách tất cả người dùng
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách user", error });
  }
};

// Lấy thông tin một user theo ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User không tồn tại" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy user", error });
  }
};

// Tạo user mới
const createUser = async (req, res) => {
  try {
    const { email, username } = req.body;
    
    // Validate trùng email/username
    const existingUser = await User.findOne({
        $or: [
            { email: email ? email.toLowerCase().trim() : '' },
            { username: username ? username.trim() : '' }
        ]
    });
    
    if (existingUser) {
        return res.status(400).json({ message: "Email hoặc Username đã tồn tại!" });
    }

    const newUser = new User(req.body);
    await newUser.save();
    res.status(201).json({ message: "Thêm thành công!", user: newUser });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi tạo user", error });
  }
};

//Create admin
const createAdmin = async (req, res) => {
  try {
    const { name, email, username, password } = req.body;
    
    // Validate trùng email/username
    const existingAdmin = await User.findOne({
        $or: [
            { email: email ? email.toLowerCase().trim() : '' },
            { username: username ? username.trim() : '' }
        ]
    });
    
    if (existingAdmin) {
        return res.status(400).json({ message: "Email hoặc Username đã tồn tại!" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new User({
      name,
      username,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "admin"
    });
    await newAdmin.save();
    res.status(201).json({ message: "Admin created successfully!", user: newAdmin });
  } catch (error) {
    res.status(500).json({ message: "Error creating admin", error });
  }
};

// Cập nhật user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User không tồn tại." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    res.status(200).json({ message: "Cập nhật user thành công", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi cập nhật user", error });
  }
};

// Xóa user theo ID
const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: "User không tồn tại" });
    res.json({ message: "User đã bị xóa" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa user", error });
  }
};

// Export tất cả hàm
module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  createAdmin,
  updateUser,
  deleteUser
};