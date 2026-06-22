let lastChatMessageId = null;
let firstNotifyLoad = true;
let notifyUnsubscribe = null;

function getNotifyCurrentUser(){
    try{
        return JSON.parse(localStorage.getItem("golden_user")) || {};
    }catch(e){
        return {};
    }
}

// 🔔 صوت الرنة
function playNotifySound(){
    const audio = new Audio(
        "https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg"
    );

    audio.volume = 0.8;
    audio.play().catch(() => {});
}

function showChatNotification(message){
    const box = document.getElementById("chatNotification");
    if(!box) return;

    const sender = message.name || "Client";
    const text = message.message || "";

    box.innerHTML = `
        <strong>🔔 رسالة جديدة من ${sender}</strong>
        <small>${text.substring(0,45)}</small>
    `;

    box.classList.add("show");

    // تشغيل الرنة
    playNotifySound();

    setTimeout(() => {
        box.classList.remove("show");
    }, 7000);
}

function startChatNotifications(){
    let tries = 0;

    const timer = setInterval(() => {
        tries++;

        if(typeof window.listenChatMessagesFirebase === "function"){
            clearInterval(timer);

            if(notifyUnsubscribe) notifyUnsubscribe();

            const currentUser = getNotifyCurrentUser();

            notifyUnsubscribe = window.listenChatMessagesFirebase((messages) => {

                if(!messages || messages.length === 0) return;

                const lastMessage = messages[messages.length - 1];

                if(firstNotifyLoad){
                    lastChatMessageId = lastMessage.id || null;
                    firstNotifyLoad = false;
                    return;
                }

                if(lastMessage.id !== lastChatMessageId){

                    lastChatMessageId = lastMessage.id || null;

                    if(lastMessage.email !== currentUser.email){
                        showChatNotification(lastMessage);
                    }
                }
            });

            return;
        }

        if(tries > 30){
            clearInterval(timer);
            console.log("Chat notifications not loaded");
        }

    }, 300);
}

window.addEventListener("load", () => {
    startChatNotifications();
});