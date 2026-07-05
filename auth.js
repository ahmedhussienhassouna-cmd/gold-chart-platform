// =======================
// HELPERS
// =======================
function normalizeEmail(email){
    return String(email || "").trim().toLowerCase();
}

function isSafariBrowser(){
    const ua = navigator.userAgent;
    return /^((?!chrome|android).)*safari/i.test(ua);
}

function isFirebaseOfflineError(error){
    const msg = String(error?.message || error || "").toLowerCase();

    return (
        msg.includes("client is offline") ||
        msg.includes("could not reach cloud firestore backend") ||
        msg.includes("code=unavailable") ||
        msg.includes("failed to get document") ||
        msg.includes("offline")
    );
}

function showConnectionMessage(){
    if(isSafariBrowser()){
        alert("Safari عنده مشكلة اتصال مؤقتة مع Firebase. سيتم المحاولة مرة أخرى تلقائيًا. لو استمرت المشكلة افتح المنصة من Google Chrome.");
    }else{
        alert("Connection error. Please refresh page and try again.");
    }
}

function waitForFirebase(){
    return new Promise((resolve) => {
        let count = 0;

        const timer = setInterval(() => {
if(
    window.getUserFromFirebase &&
    window.saveUserToFirebase &&
    window.updateUserLoginFirebase &&
    window.createAuthUserFirebase &&
    window.loginAuthUserFirebase &&
    window.getUserByPhoneFirebase
){
                clearInterval(timer);
                resolve(true);
            }

            count++;

            if(count > 100){
                clearInterval(timer);
                resolve(false);
            }
        }, 100);
    });
}

async function firebaseRetry(operation, tries = 3){
    let lastError = null;

    for(let i = 0; i < tries; i++){
        try{
            return await operation();
        }catch(error){
            lastError = error;
            console.error("Firebase retry error:", error);

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    throw lastError;
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

            try{
                if(window.updateUserStatusFirebase){
                    await window.updateUserStatusFirebase(user.email, {
                        subscription: "expired",
                        status: "expired",
                        role: "Expired Member"
                    });
                }
            }catch(error){
                console.error("Status update skipped:", error);
            }
        }
    }

    if(user.subscription === "vip" && user.vipUntil && user.vipUntil !== "lifetime"){
        const vipEnd = new Date(user.vipUntil);

        if(isNaN(vipEnd.getTime()) || today > vipEnd){
            user.subscription = "expired";
            user.status = "expired";
            user.role = "Expired Member";

            try{
                if(window.updateUserStatusFirebase){
                    await window.updateUserStatusFirebase(user.email, {
                        subscription: "expired",
                        status: "expired",
                        role: "Expired Member"
                    });
                }
            }catch(error){
                console.error("VIP status update skipped:", error);
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
// =======================
// REGISTER
// =======================
async function registerUser(){

    const nameInput = document.getElementById("registerName");
    const emailInput = document.getElementById("registerEmail");
    const passwordInput = document.getElementById("registerPassword");
    const phoneInput = document.getElementById("registerPhone");

    if(!nameInput || !emailInput || !passwordInput){
        alert("Register form error");
        return;
    }

    const name = String(nameInput.value || "").trim();
    const email = normalizeEmail(emailInput.value);
    const password = String(passwordInput.value || "").trim();
    const phone = String(phoneInput.value || "").trim();
    const otpInput = document.getElementById("registerOtp");
const otpCode = String(otpInput?.value || "").trim();

    if(name === "" || email === "" || phone === "" || password === ""){
    alert("Please fill all fields");
    return;
}
if(otpCode === ""){
    alert("Please enter OTP code.");
    return;
}
    const firebaseReady = await waitForFirebase();

    if(!firebaseReady){
        showConnectionMessage();
        return;
    }

    let existingUser = null;

    try{
        existingUser = await firebaseRetry(() => window.getUserFromFirebase(email), 3);
    }catch(error){
        console.error("Register get user error:", error);
        showConnectionMessage();
        return;
    }

    if(existingUser){
        alert("This email already has an account. Please login.");
        window.location.href = "login.html";
        return;
        
    }
    let existingPhoneUser = null;

try{
    existingPhoneUser = await firebaseRetry(
        () => window.getUserByPhoneFirebase(phone),
        3
    );
}catch(error){
    console.error("Register get phone error:", error);
    showConnectionMessage();
    return;
}

if(existingPhoneUser){
    alert("تم استخدام هذا الرقم من قبل في فترة تجريبية. يرجى الاشتراك لتفعيل الحساب.");
    window.location.href = "upgrade.html";
    return;
}
try{
    await window.verifyPhoneOtpFirebase(otpCode);
}catch(error){
    console.error("OTP verify error:", error);
    alert("OTP code is wrong or expired.");
    return;
}

    const now = new Date();
    const trialEnd = addDays(now, 14);

    const user = {
        name: name,
        email: email,
        phone: phone,
phoneVerified: true,
        password: password,
        photo: "images/ahmed.jpg",

role: "Trial Member",
subscription: "trial",
status: "active",

authCreated: true,
emailVerified: false,

        trialDays: 14,
        trialStart: now.toISOString(),
        trialEnd: trialEnd.toISOString(),

        vipPlan: "",
        vipUntil: "",
        createdAt: now.toISOString(),
        lastLogin: ""
    };

let saved = false;

try{

    // إنشاء حساب Authentication
    await window.createAuthUserFirebase(email, password);

    // حفظ بيانات العميل في Firestore
    saved = await firebaseRetry(
        () => window.saveUserToFirebase(user),
        3
    );

}catch(error){

    console.error(error);

    alert(error.message);

    return;
}

    if(!saved){
        alert("Account save failed. Please try again.");
        return;
    }

    localStorage.setItem("golden_user", JSON.stringify(user));
    localStorage.removeItem("golden_logged");

alert(
`✅ تم إنشاء الحساب.

تم إرسال رسالة تأكيد إلى بريدك الإلكتروني.

يرجى فتح البريد والضغط على Verify Email ثم تسجيل الدخول.`
);

window.location.href = "login.html";
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
        showConnectionMessage();
        return;
    }

    let user = null;

    try{
        user = await firebaseRetry(() => window.getUserFromFirebase(email), 3);
    }catch(error){
        console.error("Login get user error:", error);

        const savedUser = localStorage.getItem("golden_user");

        if(savedUser){
            try{
                const localUser = JSON.parse(savedUser);

                if(
                    normalizeEmail(localUser.email) === email &&
                    String(localUser.password || "").trim() === password
                ){
                    user = localUser;
                    console.log("✅ Login from local cache because Firebase is unavailable");
                }
            }catch(e){
                console.error("Local login parse error:", e);
            }
        }

        if(!user){
            showConnectionMessage();
            return;
        }
    }

    if(!user){
        alert("No account found. Please create account first.");
        return;
    }

    user.email = normalizeEmail(user.email || email);

    if(String(user.password || "").trim() !== password){
        alert("Wrong Email or Password");
        return;
    }
try{
    const authUser = await window.loginAuthUserFirebase(email, password);

    if(!authUser.emailVerified){
        alert("يرجى تأكيد بريدك الإلكتروني أولاً، ثم حاول تسجيل الدخول مرة أخرى.");
        return;
    }

}catch(error){
    console.error("Auth login error:", error);
    alert(error.message);
    return;
}
    user = await updateLocalUserStatus(user);

    localStorage.setItem("golden_user", JSON.stringify(user));
    localStorage.setItem("golden_logged", "true");

    try{
        if(window.updateUserLoginFirebase){
            await window.updateUserLoginFirebase(user.email);
        }
    }catch(error){
        console.error("Login update skipped:", error);
    }

    try{
        if(window.trackSiteVisitFirebase){
            await window.trackSiteVisitFirebase();
        }
    }catch(error){
        console.error("Visit tracking skipped:", error);
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
        try{
            const freshUser = await firebaseRetry(() => window.getUserFromFirebase(user.email), 2);

            if(freshUser){
                user = freshUser;
                user.email = normalizeEmail(user.email);
            }
        }catch(error){
            console.error("Dashboard fresh user skipped:", error);
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