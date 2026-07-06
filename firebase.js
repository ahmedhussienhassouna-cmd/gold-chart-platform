import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    initializeFirestore,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    collection,
    addDoc,
    query,
    where,
    limit,
    orderBy,
    onSnapshot,
    serverTimestamp,
    increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    signOut,
    RecaptchaVerifier,
    signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
const firebaseConfig = {
    apiKey: "AIzaSyBRpdJ72pV8t2KyVpSyaRc9WDihDa2d4HU",
    authDomain: "golden-trade-levels.firebaseapp.com",
    projectId: "golden-trade-levels",
    storageBucket: "golden-trade-levels.firebasestorage.app",
    messagingSenderId: "449735025504",
    appId: "1:449735025504:web:93f4ddae6ca2830977f405"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    useFetchStreams: false
});

function cleanEmail(email){
    return String(email || "").trim().toLowerCase();
}

window.cleanEmail = cleanEmail;

// =======================
// FIREBASE AUTH
// =======================

window.createAuthUserFirebase = async function(email, password){

    const userCredential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail(email),
        String(password || "").trim()
    );

    await sendEmailVerification(userCredential.user);

    return userCredential.user;
};

window.loginAuthUserFirebase = async function(email, password){

    const userCredential = await signInWithEmailAndPassword(
        auth,
        cleanEmail(email),
        String(password || "").trim()
    );

    return userCredential.user;
};

window.logoutAuthFirebase = async function(){

    await signOut(auth);

};

window.isEmailVerifiedFirebase = function(){

    if(!auth.currentUser) return false;

    return auth.currentUser.emailVerified;

};

window.reloadCurrentUserFirebase = async function(){

    if(auth.currentUser){
        await auth.currentUser.reload();
    }

};
function formatEgyptPhone(phone){
    let p = String(phone || "").trim().replace(/\s+/g, "");

    if(p.startsWith("+")) return p;
    if(p.startsWith("20")) return "+" + p;
    if(p.startsWith("0")) return "+20" + p.slice(1);

    return "+20" + p;
}

window.setupRecaptchaFirebase = async function(){
    if(window.recaptchaVerifier){
        try{
            window.recaptchaVerifier.clear();
        }catch(error){}
        window.recaptchaVerifier = null;
    }

    const recaptchaBox = document.getElementById("recaptcha-container");

    if(!recaptchaBox){
        throw new Error("recaptcha-container is missing in register.html");
    }

    recaptchaBox.innerHTML = "";

    window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
            size: "normal"
        }
    );

    await window.recaptchaVerifier.render();

    return window.recaptchaVerifier;
};

window.sendPhoneOtpFirebase = async function(phone){
    try{
        const appVerifier = await window.setupRecaptchaFirebase();
        const egyptPhone = formatEgyptPhone(phone);

        console.log("Sending OTP to:", egyptPhone);

        window.confirmationResult = await signInWithPhoneNumber(
            auth,
            egyptPhone,
            appVerifier
        );

        return true;

    }catch(error){
        console.error("OTP send error:", error);
        throw error;
    }
};

window.verifyPhoneOtpFirebase = async function(code){
    if(!window.confirmationResult){
        throw new Error("OTP was not sent yet");
    }

    const result = await window.confirmationResult.confirm(code);

    return result.user;
};

// =======================
// GET USER BY EMAIL
// =======================
window.getUserFromFirebase = async function(email){
    try{
        const userEmail = cleanEmail(email);

        if(!userEmail){
            console.log("❌ Empty email");
            return null;
        }

        const docRef = doc(db, "users", userEmail);
        const docSnap = await getDoc(docRef);

        if(docSnap.exists()){
            console.log("✅ User found by document ID:", userEmail);

            return {
                id: docSnap.id,
                ...docSnap.data(),
                email: userEmail
            };
        }

        const q = query(
            collection(db, "users"),
            where("email", "==", userEmail),
            limit(1)
        );

        const snap = await getDocs(q);

        if(!snap.empty){
            const oldDoc = snap.docs[0];
            const data = oldDoc.data();

            await setDoc(doc(db, "users", userEmail), {
                ...data,
                email: userEmail,
                migratedAt: serverTimestamp()
            }, { merge: true });

            console.log("✅ User found by email field and migrated:", userEmail);

            return {
                id: userEmail,
                ...data,
                email: userEmail
            };
        }

        console.log("❌ User not found:", userEmail);
        return null;

    }catch(error){
        console.error("Get user error:", error);
        alert("Firebase Error: " + error.message);
        return null;
    }
};

// =======================
// USERS / REGISTRATION
// =======================
window.getUserByPhoneFirebase = async function(phone){
    try{
        const phoneValue = String(phone || "").trim();

        if(!phoneValue) return null;

        const q = query(
            collection(db, "users"),
            where("phone", "==", phoneValue),
            limit(1)
        );

        const snap = await getDocs(q);

        if(!snap.empty){
            const docSnap = snap.docs[0];

            return {
                id: docSnap.id,
                ...docSnap.data()
            };
        }

        return null;

    }catch(error){
        console.error("Get user by phone error:", error);
        return null;
    }
};
window.saveUserToFirebase = async function(user){
    try{
        if(!user || !user.email) return false;

        const userEmail = cleanEmail(user.email);

        if(!userEmail) return false;

        await setDoc(doc(db, "users", userEmail), {
            name: String(user.name || "Client").trim(),
  email: userEmail,
phone: String(user.phone || "").trim(),
phoneVerified: user.phoneVerified === true,
password: String(user.password || "").trim(),
photo: user.photo || "",

 role: user.role || "Trial Member",
subscription: user.subscription || "trial",
status: user.status || "active",

authCreated: user.authCreated === true,
emailVerified: user.emailVerified === true,

            trialDays: user.trialDays || 14,
            trialStart: user.trialStart || new Date().toISOString(),
            trialEnd: user.trialEnd || "",

            vipPlan: user.vipPlan || "",
            vipUntil: user.vipUntil || "",

            createdAt: user.createdAt || new Date().toISOString(),
            createdAtServer: serverTimestamp(),
            lastLogin: serverTimestamp()
        }, { merge: true });

        console.log("✅ User saved:", userEmail);
        return true;

    }catch(error){
        console.error("Save user error:", error);
        alert("Save User Error: " + error.message);
        return false;
    }
};

// =======================
// UPDATE LOGIN
// =======================
window.updateUserLoginFirebase = async function(email){
    try{
        const userEmail = cleanEmail(email);
        if(!userEmail) return false;

        await setDoc(doc(db, "users", userEmail), {
            lastLogin: serverTimestamp(),
            visits: increment(1)
        }, { merge: true });

        return true;

    }catch(error){
        console.error("Update login error:", error);
        return false;
    }
};

// =======================
// UPDATE USER STATUS
// =======================
window.updateUserStatusFirebase = async function(email, data){
    try{
        const userEmail = cleanEmail(email);
        if(!userEmail) return false;

        await setDoc(doc(db, "users", userEmail), {
            subscription: data.subscription || "expired",
            role: data.role || "Expired Member",
            status: data.status || "expired",
            updatedAt: serverTimestamp()
        }, { merge: true });

        return true;

    }catch(error){
        console.error("Update user status error:", error);
        return false;
    }
};

// =======================
// SITE VISITS
// =======================
window.trackSiteVisitFirebase = async function(){
    try{
        const today = new Date().toISOString().split("T")[0];

        await setDoc(doc(db, "analytics", "site"), {
            totalVisits: increment(1),
            lastVisit: serverTimestamp()
        }, { merge: true });

        await setDoc(doc(db, "analytics_daily", today), {
            date: today,
            visits: increment(1),
            lastVisit: serverTimestamp()
        }, { merge: true });

        return true;

    }catch(error){
        console.error("Track visit error:", error);
        return false;
    }
};

// =======================
// ADMIN USERS LIST
// =======================
window.listenUsersFirebase = function(callback){
    const q = query(
        collection(db, "users"),
        orderBy("createdAtServer", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        const users = [];

        snapshot.forEach(docSnap => {
            users.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        callback(users);
    }, (error) => {
        console.error("Listen users error:", error);
    });
};

// =======================
// ADMIN UPDATE SUBSCRIPTION
// =======================
window.updateUserSubscriptionFirebase = async function(email, data){
    try{
        const userEmail = cleanEmail(email);
        if(!userEmail) return false;

        await setDoc(doc(db, "users", userEmail), {
            subscription: data.subscription || "trial",
            role: data.role || "Trial Member",
            status: data.status || "active",
            vipPlan: data.vipPlan || "",
            vipUntil: data.vipUntil || "",
            updatedAt: serverTimestamp()
        }, { merge: true });

        return true;

    }catch(error){
        console.error("Update subscription error:", error);
        return false;
    }
};

// =======================
// STRATEGY
// =======================
window.loadStrategyLevels = async function(asset){
    try{
        const docRef = doc(db, "strategy", asset);
        const docSnap = await getDoc(docRef);

        if(!docSnap.exists()) return null;

        return docSnap.data();

    }catch(error){
        console.error("Load strategy error:", error);
        return null;
    }
};

// =======================
// CHANNEL READ
// =======================
window.loadChannelMessage = async function(){
    try{
        const docRef = doc(db, "channel", "welcome");
        const docSnap = await getDoc(docRef);

        if(!docSnap.exists()){
            return null;
        }

        return docSnap.data();

    }catch(error){
        console.error("Load channel message error:", error);
        return null;
    }
};

// =======================
// CHANNEL REALTIME LISTEN
// =======================
window.listenChannelMessage = function(callback){
    try{
        return onSnapshot(
            doc(db, "channel", "welcome"),
            (docSnap) => {
                if(docSnap.exists()){
                    callback(docSnap.data());
                }else{
                    callback(null);
                }
            },
            (error) => {
                console.error("Channel listen error:", error);
            }
        );
    }catch(error){
        console.error("Start channel listener error:", error);
        return null;
    }
};

// =======================
// CHANNEL SAVE
// =======================
window.saveChannelMessage = async function(title, message){
    try{
        await setDoc(doc(db, "channel", "welcome"), {
            title: title,
            message: message,
            createdAt: new Date().toLocaleString(),
            type: "public"
        });

        return true;

    }catch(error){
        console.error("Save channel message error:", error);
        return false;
    }
};

// =======================
// CHAT SEND MESSAGE
// =======================
window.sendChatMessageFirebase = async function(message, user){
    try{
        await addDoc(collection(db, "chatMessages"), {
            message: message,
            name: user.name || "Client",
            email: cleanEmail(user.email),
            role: user.role || "Golden Trade Client",
            createdAt: serverTimestamp()
        });

        return true;

    }catch(error){
        console.error("Firebase chat send error:", error);
        return false;
    }
};

// =======================
// CHAT LIVE LISTEN
// =======================
window.listenChatMessagesFirebase = function(callback){
    const q = query(
        collection(db, "chatMessages"),
        orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snapshot) => {
        const messages = [];

        snapshot.forEach(docSnap => {
            messages.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        callback(messages);
    }, (error) => {
        console.error("Listen chat messages error:", error);
    });
};

// =======================
// TRADING JOURNAL FIREBASE
// =======================

window.saveJournalTradeFirebase = async function(trade){
    try{
        const tradeId = String(trade.id || Date.now());

        await setDoc(doc(db, "tradingJournal", tradeId), {
            ...trade,
            id: tradeId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });

        return true;

    }catch(error){
        console.error("Save journal trade error:", error);
        alert("Journal Save Error: " + error.message);
        return false;
    }
};

window.listenJournalTradesFirebase = function(callback){
    const q = query(
        collection(db, "tradingJournal"),
        orderBy("date", "asc")
    );

    return onSnapshot(q, (snapshot) => {
        const trades = [];

        snapshot.forEach(docSnap => {
            trades.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        callback(trades);

    }, (error) => {
        console.error("Listen journal trades error:", error);
    });
};

window.deleteJournalTradeFirebase = async function(id){
    try{
        await deleteDoc(doc(db, "tradingJournal", String(id)));
        return true;
    }catch(error){
        console.error("Delete journal trade error:", error);
        return false;
    }
};