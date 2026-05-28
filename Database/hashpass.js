const bcrypt = require("bcryptjs");

// Hash mật khẩu
const password = "admin88"; 
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error("Lỗi hash mật khẩu:", err);
    } else {
        console.log("Mật khẩu đã hash:", hash);
    }
});
