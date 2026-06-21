// =======================
// HELPERS
// =======================
function addDays(date, days){
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function getDaysRemaining(endDate){
    if(!endDate) return 0;

    const now = new Date();
    const end = new Date(endDate);

    const diff = end - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function updateLocalUserStatus(user){
    if(!user) return user;

    const today = new Date();

    if(user.subscription === "trial"){
        const trialEnd = new Date(user.trialEnd);

        if(today > trialEnd){
            user.subscription = "expired";
            user.status = "expired";
            user.role = "Expired Member";
        }
    }

    if(user.subscription === "vip" && user.vipUntil && user.vipUntil !== "lifetime"){
        const vipEnd = new Date(user.vipUntil);

        if(today > vipEnd){
            user.subscription = "expired";
            user.status = "expired";
            user.role = "Expired Member";
        }
    }

    localStorage.setItem("golden_user", JSON.stringify(user));
    return user;
}

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

    const now = new Date();
    const trialEnd = addDays(now, 14);

    const file = photoInput.files[0];
    const reader = new FileReader();

    reader.onload = async function () {

        const user = {
            name: name,
            email: email,
            password: password,
            photo: reader.result,

            role: "Trial Member",
            subscription: "trial",
            status: "active",

            trialDays: 14,
            trialStart: now.toISOString(),
            trialEnd: trialEnd.toISOString(),

            vipUntil: "",
            createdAt: now.toISOString()
        };

        localStorage.setItem("golden_user", JSON.stringify(user));
        localStorage.removeItem("golden_logged");

        if (window.saveUserToFirebase) {
            await window.saveUserToFirebase(user);
        }

        alert("Account Created Successfully - 14 Days Free Trial Started");
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

    let saved = JSON.parse(savedUser);
    saved = updateLocalUserStatus(saved);

    if (email === saved.email && password === saved.password) {

        localStorage.setItem("golden_logged", "true");

        if (window.updateUserLoginFirebase) {
            await window.updateUserLoginFirebase(email);
        }

        if (window.trackSiteVisitFirebase) {
            await window.trackSiteVisitFirebase();
        }

        if(saved.status === "expired"){
            alert("Your trial or subscription has expired. Please renew your membership.");
            window.location.href = "upgrade.html";
            return;
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

    let user = JSON.parse(savedUser);
    user = updateLocalUserStatus(user);

    if(user.status === "expired"){
        window.location.href = "upgrade.html";
        return;
    }

    const photo = document.getElementById("dashboardPhoto");
    const name = document.getElementById("dashboardName");
    const title = document.getElementById("dashboardTitle");
    const email = document.getElementById("dashboardEmail");

    if(photo && user.photo){
        photo.src = user.photo;
    }

    if(name && user.name){
        name.innerHTML = user.name;
    }

    if(email && user.email){
        email.innerHTML = user.email;
    }

    if(title){
        if(user.email === "ahmedhussienhassouna@gmail.com"){
            title.innerHTML = "Founder & CEO";
        }else if(user.subscription === "trial"){
            const days = getDaysRemaining(user.trialEnd);
            title.innerHTML = `Trial Member - ${days} Days Left`;
        }else if(user.subscription === "vip"){
            title.innerHTML = "VIP Member";
        }else{
            title.innerHTML = "Expired Member";
        }
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