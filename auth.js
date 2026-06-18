// =======================
// REGISTER
// =======================
function registerUser() {

    const nameInput = document.getElementById("registerName");
    const emailInput = document.getElementById("registerEmail");
    const passwordInput = document.getElementById("registerPassword");
    const photoInput = document.getElementById("registerPhoto");

    if (!nameInput || !emailInput || !passwordInput) {
        alert("Register inputs not found");
        return;
    }

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (name === "" || email === "" || password === "") {
        alert("Please fill all fields");
        return;
    }

    if (!photoInput || !photoInput.files || !photoInput.files[0]) {
        alert("Please select profile photo");
        return;
    }

    const file = photoInput.files[0];
    const reader = new FileReader();

    reader.onload = function () {

        const user = {
            name: name,
            email: email,
            password: password,
            photo: reader.result,
            role: "Golden Trade Client",
            createdAt: new Date().toISOString()
        };

        localStorage.setItem("golden_user", JSON.stringify(user));
        localStorage.removeItem("golden_logged");

        alert("Account Created Successfully");

        window.location.href = "login.html";
    };

    reader.readAsDataURL(file);
}

// =======================
// LOGIN
// =======================
function loginUser() {

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");

    if (!emailInput || !passwordInput) {
        alert("Login inputs not found");
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (email === "" || password === "") {
        alert("Please fill all fields");
        return;
    }

    const savedUser = localStorage.getItem("golden_user");

    if (!savedUser) {
        alert("No account found. Please create account first.");
        return;
    }

    const saved = JSON.parse(savedUser);

    if (email === saved.email && password === saved.password) {
        localStorage.setItem("golden_logged", "true");
        window.location.href = "dashboard.html";
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
// LOAD DASHBOARD USER
// =======================
function loadDashboardUser(){
    const savedUser = localStorage.getItem("golden_user");

    if(!savedUser) return;

    const user = JSON.parse(savedUser);

    const photo = document.getElementById("dashboardPhoto");
    const name = document.getElementById("dashboardName");
    const title = document.getElementById("dashboardTitle");

    if(photo && user.photo){
        photo.src = user.photo;
    }

    if(name && user.name){
        name.innerHTML = user.name;
    }

    if(title){
        title.innerHTML = user.role || "Golden Trade Client";
    }
}

// =======================
// PROTECT DASHBOARD
// =======================
if (
    window.location.pathname.includes("dashboard.html") ||
    window.location.pathname.endsWith("/")
) {
    const logged = localStorage.getItem("golden_logged");

    if (logged !== "true") {
        window.location.href = "login.html";
    }
}

// =======================
// AUTO LOAD USER
// =======================
window.addEventListener("load", () => {
    loadDashboardUser();
});