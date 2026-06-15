// =======================
// REGISTER
// =======================
function registerUser() {

    const nameInput = document.getElementById("registerName");
    const emailInput = document.getElementById("registerEmail");
    const passwordInput = document.getElementById("registerPassword");

    if (!nameInput || !emailInput || !passwordInput) return;

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

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

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

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