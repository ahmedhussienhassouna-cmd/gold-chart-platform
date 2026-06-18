let currentUser = null;

function loadChatUser(){
    const savedUser = localStorage.getItem("golden_user");
    const logged = localStorage.getItem("golden_logged");

    if(logged !== "true" || !savedUser){
        window.location.href = "login.html";
        return;
    }

    currentUser = JSON.parse(savedUser);

    const userNameBox = document.getElementById("chatUserName");
    if(userNameBox){
        userNameBox.innerHTML = currentUser.name || "Client";
    }
}

function escapeHtml(text){
    const div = document.createElement("div");
    div.textContent = text;
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
    if(!createdAt) return "";

    try{
        const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);

        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }catch(e){
        return "";
    }
}

function renderChatMessages(messages){
    const box = document.getElementById("chatMessages");
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

async function sendChatMessage(){
    const input = document.getElementById("chatInput");
    if(!input || !currentUser) return;

    const message = input.value.trim();

    if(message === ""){
        return;
    }

    if(typeof window.sendChatMessageFirebase !== "function"){
        alert("Chat is still loading, try again in 2 seconds");
        return;
    }

    const ok = await window.sendChatMessageFirebase(message, currentUser);

    if(ok){
        input.value = "";
    }else{
        alert("Message not sent");
    }
}

function startChatWhenFirebaseReady(){
    const box = document.getElementById("chatMessages");

    let tries = 0;

    const timer = setInterval(() => {
        tries++;

        if(typeof window.listenChatMessagesFirebase === "function"){
            clearInterval(timer);

            window.listenChatMessagesFirebase((messages) => {
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
});