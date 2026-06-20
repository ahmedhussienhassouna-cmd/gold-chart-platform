// =======================
// REGISTER
// =======================
function registerUser() {

    const nameInput = document.getElementById("registerName");
    const emailInput = document.getElementById("registerEmail");
    const passwordInput = document.getElementById("registerPassword");
    const photoInput = document.getElementById("registerPhoto");

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (name === "" || email === "" || password === "") {
        alert("Please fill all fields");
        return;
    }

    if (!photoInput || !photoInput.files[0]) {
        alert("Please select profile photo");
        return;
    }

    const file = photoInput.files[0];
    const reader = new FileReader();

    reader.onload = async function () {

        const user = {
            name: name,
            email: email,
            password: password,
            photo: reader.result,
            role: "Free",
            subscription: "free",
            status: "active",
            vipUntil: "",
            createdAt: new Date().toISOString()
        };

        localStorage.setItem("golden_user", JSON.stringify(user));
        localStorage.removeItem("golden_logged");

        if (window.saveUserToFirebase) {
            await window.saveUserToFirebase(user);
        }

        alert("Account Created Successfully");
        window.location.href = "login.html";
    };

    reader.readAsDataURL(file);
}

// =======================
// LOGIN
// =======================
async function loginUser() {

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");

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

        if (window.updateUserLoginFirebase) {
            await window.updateUserLoginFirebase(email);
        }

        if (window.trackSiteVisitFirebase) {
            await window.trackSiteVisitFirebase();
        }

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
        title.innerHTML =
            user.subscription === "vip"
            ? "VIP Member"
            : "Free Member";
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