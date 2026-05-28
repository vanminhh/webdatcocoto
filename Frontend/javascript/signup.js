document.getElementById("signupForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const phone = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();

    // Kiểm tra mật khẩu
    if (password !== confirmPassword) {
        alert("Mật khẩu không khớp!");
        return;
    }

    // Kiểm tra số điện thoại
    if (!/^[0-9]{9,11}$/.test(phone)) {
        alert("Số điện thoại không hợp lệ! Vui lòng nhập 9-11 chữ số.");
        return;
    }

    try {
        const response = await fetch("http://localhost:4000/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: username, email, password, phone, address }),
        });

        const data = await response.json();
        alert(data.message);

        if (response.ok) {
            window.location.href = "login.html";
        }
    } catch (error) {
        console.error("Lỗi:", error);
        alert("Có lỗi xảy ra, vui lòng thử lại!");
    }
});