// =======================
// REGISTER
// =======================
function registerUser() {

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value.trim();

    if (name === "" || email === "" || password === "") {
        alert("Please fill all fields");
        return;
    }

    const user = {
        name: name,
        email: email,
        password: password
    };

    localStorage.setItem("golden_user", JSON.stringify(user));

    alert("Account Created Successfully");

    window.location.href = "login.html";
}

// =======================
// LOGIN
// =======================
function loginUser() {

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (email === "" || password === "") {
        alert("Please fill all fields");
        return;
    }

    const saved = JSON.parse(localStorage.getItem("golden_user"));

    if (!saved) {
        alert("No account found");
        return;
    }

    if (email === saved.email && password === saved.password) {

        localStorage.setItem("golden_logged", "true");

        // 🔥 فتح المنصة الرئيسية
        window.location.href = "index.html";

    } else {

        alert("Wrong Email or Password");
    }
}

// =======================
// LOGOUT
// =======================
function logout() {
    localStorage.removeItem("golden_logged");
    window.location.href = "login.html";
}

// =======================
// PROTECT PLATFORM
// =======================
if (window.location.pathname.includes("index.html")) {

    const logged = localStorage.getItem("golden_logged");

    if (logged !== "true") {
        window.location.href = "login.html";
    }
}