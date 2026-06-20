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
// DATE FORMAT
// =======================
function formatDate(value){
    if(!value) return "-";

    try{
        if(value.toDate){
            return value.toDate().toLocaleString();
        }

        return value;
    }catch(error){
        return "-";
    }
}

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
        let freeUsers = 0;

        snapshot.forEach((docSnap) => {

            const user = docSnap.data();

            totalUsers++;

            const subscription = user.subscription || "free";

            if(subscription === "vip"){
                vipUsers++;
            }else{
                freeUsers++;
            }

            const statusClass = subscription === "vip" ? "vip" : "free";

            const nextSubscription = subscription === "vip" ? "free" : "vip";
            const buttonText = subscription === "vip" ? "Make Free" : "Make VIP";

            html += `
                <tr>
                    <td>${user.name || "-"}</td>
                    <td>${user.email || docSnap.id}</td>
                    <td class="${statusClass}">${subscription.toUpperCase()}</td>
                    <td>${user.status || "active"}</td>
                    <td>${user.vipUntil || "-"}</td>
                    <td>${user.visits || 0}</td>
                    <td>
                        <button onclick="changeUserSubscription('${docSnap.id}', '${nextSubscription}')">
                            ${buttonText}
                        </button>
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
        if(freeUsersBox) freeUsersBox.innerHTML = freeUsers;
    });
}

// =======================
// CHANGE USER SUBSCRIPTION
// =======================
window.changeUserSubscription = async function(email, subscription){

    try{

        const vipUntil = subscription === "vip"
            ? prompt("Enter VIP end date, example: 2026-07-21")
            : "";

        await updateDoc(doc(db, "users", email), {
            subscription: subscription,
            role: subscription === "vip" ? "VIP Member" : "Free Member",
            status: "active",
            vipUntil: vipUntil || "",
            updatedAt: serverTimestamp()
        });

        alert("✅ Subscription Updated");

    }catch(error){
        console.error(error);
        alert("❌ Subscription Update Error");
    }
};

// =======================
// START
// =======================
window.addEventListener("load", () => {
    loadUsersTable();
});