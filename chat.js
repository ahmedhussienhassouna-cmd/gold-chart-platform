let currentUser = null;
let unsubscribeChat = null;

function loadChatUser(){
    const savedUser = localStorage.getItem("golden_user");
    const logged = localStorage.getItem("golden_logged");

    if(logged !== "true" || !savedUser){
        window.location.href = "login.html";
        return;
    }

    currentUser = JSON.parse(savedUser);

    const badge = document.getElementById("chatUserBadge");
    if(badge){
        badge.innerHTML = currentUser.name || "Client";
    }
}

function escapeHtml(text){
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
}

function getInitials(name){
    if(!name) return "GT";

    return name
        .split(" ")
        .map(word => word.charAt(0))
        .join("")
        .substring(0, 2)
        .toUpperCase();
}

function formatChatTime(createdAt){
    if(!createdAt) return "Now";

    try{
        const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);

        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }catch(e){
        return "Now";
    }
}

function renderChatMessages(messages){
    const box = document.getElementById("chatFullMessages");
    if(!box) return;

    box.innerHTML = "";

    if(!messages || messages.length === 0){
        box.innerHTML = `<div class="chatLoading">No messages yet...</div>`;
        return;
    }

    messages.forEach(msg => {
        const isMe = currentUser && msg.email === currentUser.email;

        const row = document.createElement("div");
        row.className = isMe ? "chatMessageRow me" : "chatMessageRow";

        const initials = getInitials(msg.name || "Client");

        row.innerHTML = `
            <div class="chatAvatarText">${initials}</div>

            <div class="chatBubble">
                <div class="chatMeta">
                    <span>${escapeHtml(msg.name || "Client")}</span>
                    <small>${formatChatTime(msg.createdAt)}</small>
                </div>

                <div class="chatText">${escapeHtml(msg.message || "")}</div>
            </div>
        `;

        box.appendChild(row);
    });

    box.scrollTop = box.scrollHeight;
}

window.sendFullChatMessage = async function(){
    const input = document.getElementById("chatFullInput");
    if(!input || !currentUser) return;

    const message = input.value.trim();
    if(message === "") return;

    if(typeof window.sendChatMessageFirebase !== "function"){
        alert("Chat is still loading, try again");
        return;
    }

    input.value = "";

    const ok = await window.sendChatMessageFirebase(message, currentUser);

    if(!ok){
        alert("Message not sent");
    }
};

function startChatWhenFirebaseReady(){
    const box = document.getElementById("chatFullMessages");

    let tries = 0;

    const timer = setInterval(() => {
        tries++;

        if(typeof window.listenChatMessagesFirebase === "function"){
            clearInterval(timer);

            if(unsubscribeChat) unsubscribeChat();

            unsubscribeChat = window.listenChatMessagesFirebase((messages) => {
                renderChatMessages(messages);
            });

            return;
        }

        if(tries > 20){
            clearInterval(timer);

            if(box){
                box.innerHTML = `<div class="chatLoading">Firebase chat not loaded</div>`;
            }
        }
    }, 300);
}

window.addEventListener("load", () => {
    loadChatUser();
    startChatWhenFirebaseReady();

    const input = document.getElementById("chatFullInput");
    if(input){
        input.addEventListener("keydown", e => {
            if(e.key === "Enter"){
                window.sendFullChatMessage();
            }
        });
    }
});