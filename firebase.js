import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBRpdJ72pV8t2KyVpSyaRc9WDihDa2d4HU",
    authDomain: "golden-trade-levels.firebaseapp.com",
    projectId: "golden-trade-levels",
    storageBucket: "golden-trade-levels.firebasestorage.app",
    messagingSenderId: "449735025504",
    appId: "1:449735025504:web:93f4ddae6ca2830977f405"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// =======================
// GET USER BY EMAIL
// =======================
window.getUserFromFirebase = async function(email){
    try{
        if(!email) return null;

        const docRef = doc(db, "users", email);
        const docSnap = await getDoc(docRef);

        if(!docSnap.exists()){
            return null;
        }

        return {
            id: docSnap.id,
            ...docSnap.data()
        };

    }catch(error){
        console.error("Get user error:", error);
        return null;
    }
};

// =======================
// USERS / REGISTRATION
// =======================
window.saveUserToFirebase = async function(user){
    try{
        if(!user || !user.email) return false;

        await setDoc(doc(db, "users", user.email), {
            name: user.name || "Client",
            email: user.email,
            password: user.password || "",
            photo: user.photo || "",

            role: user.role || "Trial Member",
            subscription: user.subscription || "trial",
            status: user.status || "active",

            trialDays: user.trialDays || 14,
            trialStart: user.trialStart || new Date().toISOString(),
            trialEnd: user.trialEnd || "",

            vipPlan: user.vipPlan || "",
            vipUntil: user.vipUntil || "",

            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
        }, { merge: true });

        return true;

    }catch(error){
        console.error("Save user error:", error);
        return false;
    }
};

// =======================
// UPDATE LOGIN
// =======================
window.updateUserLoginFirebase = async function(email){
    try{
        if(!email) return false;

        await setDoc(doc(db, "users", email), {
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
        if(!email) return false;

        await updateDoc(doc(db, "users", email), {
            subscription: data.subscription || "expired",
            role: data.role || "Expired Member",
            status: data.status || "expired",
            updatedAt: serverTimestamp()
        });

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
        orderBy("createdAt", "desc")
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
    });
};

// =======================
// ADMIN UPDATE SUBSCRIPTION
// =======================
window.updateUserSubscriptionFirebase = async function(email, data){
    try{
        if(!email) return false;

        await updateDoc(doc(db, "users", email), {
            subscription: data.subscription || "trial",
            role: data.role || "Trial Member",
            status: data.status || "active",
            vipPlan: data.vipPlan || "",
            vipUntil: data.vipUntil || "",
            updatedAt: serverTimestamp()
        });

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
        console.error(error);
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
        console.error(error);
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
        console.error(error);
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
            email: user.email || "",
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
    });
};