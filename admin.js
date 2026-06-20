import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getFirestore,
    doc,
    setDoc,
    updateDoc,
    collection,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
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

function calcVipDate(plan){
    const now = new Date();

    if(plan === "month") return addDays(now, 30).toISOString();
    if(plan === "3months") return addDays(now, 90).toISOString();
    if(plan === "year") return addDays(now, 365).toISOString();
    if(plan === "lifetime") return "lifetime";

    return "";
}

// =======================
// SAVE LEVELS
// =======================
window.saveLevels = async function(){

    try{
        await setDoc(doc(db, "strategy", "GOLD"), {
            high: Number(document.getElementById("goldHigh").value),
            low: Number(document.getElementById("goldLow").value),
            message: "Gold Liquidity"
        });

        await setDoc(doc(db, "strategy", "EURUSD"), {
            high: Number(document.getElementById("eurHigh").value),
            low: Number(document.getElementById("eurLow").value),
            message: "EURUSD Liquidity"
        });

        await setDoc(doc(db, "strategy", "BTCUSD"), {
            high: Number(document.getElementById("btcHigh").value),
            low: Number(document.getElementById("btcLow").value),
            message: "Bitcoin Liquidity"
        });

        alert("✅ Levels Saved Successfully");

    }catch(error){
        console.error(error);
        alert("❌ Save Error");
    }
};

// =======================
// SEND CHANNEL MESSAGE
// =======================
window.sendChannelMessage = async function(){

    try{
        const title = document.getElementById("channelTitle").value;
        const message = document.getElementById("channelMessage").value;

        await setDoc(doc(db, "channel", "welcome"), {
            title: title,
            message: message,
            createdAt: new Date().toLocaleString(),
            type: "public"
        });

        alert("✅ Channel Message Sent");

    }catch(error){
        console.error(error);
        alert("❌ Channel Error");
    }
};

// =======================
// LOAD USERS TABLE
// =======================
function loadUsersTable(){

    const usersTable = document.getElementById("usersTable");
    const totalUsersBox = document.getElementById("totalUsers");
    const vipUsersBox = document.getElementById("vipUsers");
    const freeUsersBox = document.getElementById("freeUsers");

    if(!usersTable) return;

    const q = query(
        collection(db, "users"),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snapshot) => {

        let html = "";
        let totalUsers = 0;
        let vipUsers = 0;
        let trialUsers = 0;
        let expiredUsers = 0;

        snapshot.forEach((docSnap) => {

            const user = docSnap.data();
            totalUsers++;

            let subscription = user.subscription || "trial";
            let status = user.status || "active";
            let remainingDays = "-";

            if(subscription === "trial"){
                remainingDays = getDaysRemaining(user.trialEnd);

                if(remainingDays <= 0){
                    subscription = "expired";
                    status = "expired";
                }
            }

            if(subscription === "vip"){
                if(user.vipUntil === "lifetime"){
                    remainingDays = "Lifetime";
                }else{
                    remainingDays = getDaysRemaining(user.vipUntil);

                    if(remainingDays <= 0){
                        subscription = "expired";
                        status = "expired";
                    }
                }
            }

            if(subscription === "vip") vipUsers++;
            else if(subscription === "trial") trialUsers++;
            else expiredUsers++;

            const statusClass =
                subscription === "vip" ? "vip" :
                subscription === "trial" ? "free" :
                "expired";

            html += `
                <tr>
                    <td>${user.name || "-"}</td>
                    <td>${user.email || docSnap.id}</td>
                    <td class="${statusClass}">${subscription.toUpperCase()}</td>
                    <td>${status}</td>
                    <td>${remainingDays}</td>
                    <td>${user.visits || 0}</td>
                    <td>
                        <button onclick="makeVip('${docSnap.id}', 'month')">1 Month</button>
                        <button onclick="makeVip('${docSnap.id}', '3months')">3 Months</button>
                        <button onclick="makeVip('${docSnap.id}', 'year')">1 Year</button>
                        <button onclick="makeVip('${docSnap.id}', 'lifetime')">Lifetime</button>
                        <button onclick="makeExpired('${docSnap.id}')">Stop</button>
                    </td>
                </tr>
            `;
        });

        if(html === ""){
            html = `
                <tr>
                    <td colspan="7">No users registered yet</td>
                </tr>
            `;
        }

        usersTable.innerHTML = html;

        if(totalUsersBox) totalUsersBox.innerHTML = totalUsers;
        if(vipUsersBox) vipUsersBox.innerHTML = vipUsers;
        if(freeUsersBox) freeUsersBox.innerHTML = trialUsers + expiredUsers;
    });
}

// =======================
// MAKE VIP
// =======================
window.makeVip = async function(email, plan){

    try{
        const vipUntil = calcVipDate(plan);

        await updateDoc(doc(db, "users", email), {
            subscription: "vip",
            role: "VIP Member",
            status: "active",
            vipPlan: plan,
            vipUntil: vipUntil,
            updatedAt: serverTimestamp()
        });

        alert("✅ User upgraded to VIP");

    }catch(error){
        console.error(error);
        alert("❌ VIP Update Error");
    }
};

// =======================
// MAKE EXPIRED
// =======================
window.makeExpired = async function(email){

    try{
        await updateDoc(doc(db, "users", email), {
            subscription: "expired",
            role: "Expired Member",
            status: "expired",
            vipUntil: "",
            updatedAt: serverTimestamp()
        });

        alert("✅ User stopped");

    }catch(error){
        console.error(error);
        alert("❌ Stop Error");
    }
};

// =======================
// START
// =======================
window.addEventListener("load", () => {
    loadUsersTable();
});