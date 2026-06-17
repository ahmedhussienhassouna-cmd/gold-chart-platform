import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore,
    doc,
    setDoc
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