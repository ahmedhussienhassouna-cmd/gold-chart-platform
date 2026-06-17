import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
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
// STRATEGY
// =======================
window.loadStrategyLevels = async function(asset){

    try{

        const docRef = doc(db, "strategy", asset);
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

        await setDoc(
            doc(db, "channel", "welcome"),
            {
                title: title,
                message: message,
                createdAt: new Date().toLocaleString(),
                type: "public"
            }
        );

        return true;

    }catch(error){

        console.error(error);
        return false;
    }
};