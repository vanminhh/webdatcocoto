document.addEventListener("DOMContentLoaded", function () {
    // Kiểm tra và xóa token cũ nếu không hợp lệ
    const token = localStorage.getItem("token");
    if (!token) {
        console.log("Không tìm thấy token, xóa dữ liệu đăng nhập cũ.");
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("username");
        localStorage.removeItem("email");
        localStorage.removeItem("role");
        localStorage.removeItem("avatar");
    }

    const loginForm = document.getElementById("loginForm");
    if (!loginForm) {
        console.error("Không tìm thấy phần tử #loginForm");
        return;
    }

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const emailOrUser = document.getElementById("emailOrUser").value.trim();
        const password = document.getElementById("password").value.trim();

        console.log("Dữ liệu gửi lên API:", { emailOrUser, password });

        const isEmail = emailOrUser.includes("@");
        const payload = isEmail
            ? { email: emailOrUser, password }
            : { username: emailOrUser, password };

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            console.log("Phản hồi từ API:", response.status, data);

            if (response.ok) {
                alert("Đăng nhập thành công!");
                localStorage.setItem("token", data.token);
                localStorage.setItem("refreshToken", data.refreshToken);
                localStorage.setItem("username", data.username || "");
                localStorage.setItem("email", data.email || "");
                localStorage.setItem("name", data.name || data.username || "");
                localStorage.setItem("role", data.role || "");
                localStorage.setItem("avatar", data.avatar || "/image/default-avatar.png");
                localStorage.setItem("phone", data.phone || "");
                localStorage.setItem("address", data.address || "");
                // Redirect về trang trước nếu có
                const urlParams = new URLSearchParams(window.location.search);
                const redirectUrl = urlParams.get('redirect');
                window.location.href = redirectUrl || "index.html";
            } else {
                alert(data.message || "Đăng nhập thất bại!");
            }
        } catch (error) {
            alert("Không thể kết nối với server!");
            console.error("Lỗi kết nối:", error);
        }
    });

    // Google login
    const googleLoginButton = document.getElementById("google-login");
    if (googleLoginButton) {
        googleLoginButton.addEventListener("click", function () {
            window.location.href = `${API_BASE}/auth/google`;
        });
    }

    // Thêm sự kiện để gọi API profile
    const profileButton = document.getElementById("fetchProfileButton");
    if (profileButton) {
        profileButton.addEventListener("click", fetchProfile);
    }

    // Xử lý thông tin người dùng Google từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const userInfo = urlParams.get("userInfo");

    if (userInfo) {
        const user = JSON.parse(decodeURIComponent(userInfo));
        console.log("Thông tin người dùng Google:", user);

        // Lưu token và refresh token vào localStorage
        localStorage.setItem("token", user.token);
        localStorage.setItem("refreshToken", user.refreshToken);
        localStorage.setItem("email", user.email);
        localStorage.setItem("name", user.name);
        localStorage.setItem("avatar", "/image/default-avatar.png");

        // Redirect về trang trước nếu có
        const urlParams2 = new URLSearchParams(window.location.search);
        const redirectUrl2 = urlParams2.get('redirect');
        window.location.href = redirectUrl2 || "index.html";
    }
});

function handleCredentialResponse(response) {
    console.log("Encoded JWT ID token: " + response.credential);

    const data = JSON.parse(atob(response.credential.split('.')[1]));
    console.log("User Info:", data);

    localStorage.setItem("token", response.credential);
    localStorage.setItem("email", data.email);
    localStorage.setItem("name", data.name);
    localStorage.setItem("avatar", data.picture || "/image/default-avatar.png");

    setTimeout(() => {
        window.location.href = "index.html";
    }, 500);
}

// Example: Fetch profile after login
async function fetchProfile() {
    let token = localStorage.getItem("token");
    console.log("Token được lấy từ localStorage:", token);
    if (!token) {
        console.error("Không tìm thấy token trong localStorage!");
        alert("Bạn cần đăng nhập trước khi lấy thông tin profile!");
        return;
    }

    try {
        let response = await fetch(`${API_BASE}/auth/profile`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (response.status === 403) {
            console.log("Token hết hạn, đang làm mới token...");
            const refreshToken = localStorage.getItem("refreshToken");
            const refreshResponse = await fetch(`${API_BASE}/auth/refresh-token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: refreshToken }),
            });

            const refreshData = await refreshResponse.json();
            if (refreshResponse.ok) {
                token = refreshData.accessToken;
                localStorage.setItem("token", token);
                console.log("Token mới:", token);

                // Retry fetching the profile with the new token
                response = await fetch(`${API_BASE}/auth/profile`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });
            } else {
                alert("Không thể làm mới token, vui lòng đăng nhập lại!");
                console.error("Lỗi làm mới token:", refreshData.message);
                return;
            }
        }

        const data = await response.json();
        console.log("Dữ liệu nhận được từ API profile:", data);

        if (response.ok) {
            alert(`Lấy thông tin profile thành công!\nTên: ${data.name}\nEmail: ${data.email}`);
            const avatarElement = document.getElementById("profileAvatar");
            if (avatarElement) {
                avatarElement.src = data.avatar || "/image/default-avatar.png"; // Set avatar or default
            }
        } else {
            alert(data.message || "Không thể lấy thông tin profile!");
        }
    } catch (error) {
        console.error("Lỗi khi gọi API profile:", error);
        alert("Đã xảy ra lỗi khi lấy thông tin profile!");
    }
}


