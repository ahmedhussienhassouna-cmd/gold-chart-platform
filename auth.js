alert("AUTH LOADED");

// =======================
// REGISTER
// =======================
function registerUser() {

    const name = document.getElementById("registerName").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;

    if (!name  !email  !password) {
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

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const saved = JSON.parse(localStorage.getItem("golden_user"));

    if (!saved) {
        alert("No account found");
        return;
    }

    if (email === saved.email && password === saved.password) {

        localStorage.setItem("golden_logged", "true");

        window.location.href = "dashboard.html";

    } else {

        alert("Wrong Email or Password");
    }
}

// =======================
// PROTECT DASHBOARD
// =======================
if (window.location.pathname.includes("dashboard.html")) {

    const logged = localStorage.getItem("golden_logged");

    if (logged !== "true") {
        window.location.href = "login.html";
    }
}
