// =======================
// HELPERS
// =======================
function normalizeEmail(email){
    return String(email || "").trim().toLowerCase();
}

function waitForFirebase(){
    return new Promise((resolve) => {
        let count = 0;

        const timer = setInterval(() => {
            if(
                window.getUserFromFirebase &&
                window.saveUserToFirebase &&
                window.updateUserLoginFirebase
            ){
                clearInterval(timer);
                resolve(true);
            }

            count++;

            if(count > 80){
                clearInterval(timer);
                resolve(false);
            }
        }, 100);
    });
}

function addDays(date, days){
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function getDaysRemaining(endDate){
    if(!endDate) return 0;

    const now = new Date();
    const end = new Date(endDate);

    if(isNaN(end.getTime())) return 0;

    const diff = end - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

async function updateLocalUserStatus(user){
    if(!user) return user;

    user.email = normalizeEmail(user.email);

    const today = new Date();

    if(user.subscription === "trial"){
        const trialEnd = new Date(user.trialEnd);

        if(!user.trialEnd || isNaN(trialEnd.getTime()) || today > trialEnd){
            user.subscription = "expired";
            user.status = "expired";
            user.role = "Expired Member";

            if(window.updateUserStatusFirebase){
                await window.updateUserStatusFirebase(user.email, {
                    subscription: "expired",
                    status: "expired",
                    role: "Expired Member"
                });
            }
        }
    }

    if(user.subscription === "vip" && user.vipUntil && user.vipUntil !== "lifetime"){
        const vipEnd = new Date(user.vipUntil);

        if(isNaN(vipEnd.getTime()) || today > vipEnd){
            user.subscription = "expired";
            user.status = "expired";
            user.role = "Expired Member";

            if(window.updateUserStatusFirebase){
                await window.updateUserStatusFirebase(user.email, {
                    subscription: "expired",
                    status: "expired",
                    role: "Expired Member"
                });
            }
        }
    }

    localStorage.setItem("golden_user", JSON.stringify(user));
    return user;
}

function goToUpgrade(){
    window.location.replace("upgrade.html");
}

// =======================
// REGISTER
// =======================
async function registerUser(){

    const nameInput = document.getElementById("registerName");
    const emailInput = document.getElementById("registerEmail");
    const passwordInput = document.getElementById("registerPassword");
    const photoInput = document.getElementById("registerPhoto");

    if(!nameInput || !emailInput || !passwordInput){
        alert("Register form error");
        return;
    }

    const name = String(nameInput.value || "").trim();
    const email = normalizeEmail(emailInput.value);
    const password = String(passwordInput.value || "").trim();

    if(name === "" || email === "" || password === ""){
        alert("Please fill all fields");
        return;
    }

    if(!photoInput || !photoInput.files || !photoInput.files[0]){
        alert("Please select profile photo");
        return;
    }

    const firebaseReady = await waitForFirebase();

    if(!firebaseReady){
        alert("Connection error. Please refresh page and try again.");
        return;
    }

    const existingUser = await window.getUserFromFirebase(email);

    if(existingUser){
        alert("This email already has an account. Please login.");
        window.location.href = "login.html";
        return;
    }

    const now = new Date();
    const trialEnd = addDays(now, 14);

    const file = photoInput.files[0];
    const reader = new FileReader();

    reader.onload = async function(){

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

            vipPlan: "",
            vipUntil: "",
            createdAt: now.toISOString(),
            lastLogin: ""
        };

        const saved = await window.saveUserToFirebase(user);

        if(!saved){
            alert("Account save failed. Please try again.");
            return;
        }

        localStorage.setItem("golden_user", JSON.stringify(user));
        localStorage.removeItem("golden_logged");

        alert("Account Created Successfully - 14 Days Free Trial Started");
        window.location.href = "login.html";
    };

    reader.onerror = function(){
        alert("Photo upload error. Please choose another photo.");
    };

    reader.readAsDataURL(file);
}

// =======================
// LOGIN
// =======================
async function loginUser(){

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");

    if(!emailInput || !passwordInput){
        alert("Login form error");
        return;
    }

    const email = normalizeEmail(emailInput.value);
    const password = String(passwordInput.value || "").trim();

    if(email === "" || password === ""){
        alert("Please fill all fields");
        return;
    }

    const firebaseReady = await waitForFirebase();

    if(!firebaseReady){
        alert("Connection error. Please refresh page and try again.");
        return;
    }

    let user = await window.getUserFromFirebase(email);

    if(!user){
        alert("No account found. Please create account first.");
        return;
    }

    user.email = normalizeEmail(user.email || email);

    if(String(user.password || "").trim() !== password){
        alert("Wrong Email or Password");
        return;
    }

    user = await updateLocalUserStatus(user);

    localStorage.setItem("golden_user", JSON.stringify(user));
    localStorage.setItem("golden_logged", "true");

    if(window.updateUserLoginFirebase){
        await window.updateUserLoginFirebase(user.email);
    }

    if(window.trackSiteVisitFirebase){
        await window.trackSiteVisitFirebase();
    }

    if(user.subscription === "expired" || user.status === "expired"){
        alert("Your trial or subscription has expired. Please renew your membership.");
        goToUpgrade();
        return;
    }

    window.location.replace("dashboard.html");
}

// =======================
// LOGOUT
// =======================
function logout(){
    localStorage.removeItem("golden_logged");
    window.location.href = "login.html";
}

// =======================
// LOAD DASHBOARD USER
// =======================
async function loadDashboardUser(){

    const logged = localStorage.getItem("golden_logged");
    const savedUser = localStorage.getItem("golden_user");

    if(logged !== "true" || !savedUser){
        window.location.href = "login.html";
        return;
    }

    let user;

    try{
        user = JSON.parse(savedUser);
    }catch(error){
        localStorage.removeItem("golden_user");
        localStorage.removeItem("golden_logged");
        window.location.href = "login.html";
        return;
    }

    user.email = normalizeEmail(user.email);

    const firebaseReady = await waitForFirebase();

    if(firebaseReady && window.getUserFromFirebase && user.email){
        const freshUser = await window.getUserFromFirebase(user.email);

        if(freshUser){
            user = freshUser;
            user.email = normalizeEmail(user.email);
        }
    }

    user = await updateLocalUserStatus(user);

    if(user.subscription === "expired" || user.status === "expired"){
        goToUpgrade();
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
if(window.location.pathname.includes("dashboard.html")){
    const logged = localStorage.getItem("golden_logged");

    if(logged !== "true"){
        window.location.href = "login.html";
    }
}

// =======================
// AUTO LOAD USER
// =======================
window.addEventListener("load", () => {
    if(window.location.pathname.includes("dashboard.html")){
        loadDashboardUser();
    }
});