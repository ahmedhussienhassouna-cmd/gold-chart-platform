let currentUser = null;

// =======================
// LOAD USER
// =======================
function loadChatUser(){
    const savedUser = localStorage.getItem("golden_user");
    const logged = localStorage.getItem("golden_logged");

    if(logged !== "true"){
        window.location.href = "login.html";
        return;
    }

    if(!savedUser){
        window.location.href = "login.html";
        return;
    }

    currentUser = JSON.parse(savedUser);

    const userNameBox = document.getElementById("chatUserName");
    if(userNameBox){
        userNameBox.innerHTML = currentUser.name || "Client";
    }
}

// =======================
// FORMAT TIME
// =======================
function formatChatTime(createdAt){
    if(!createdAt){
        return "";
    }

    try{
        let date;

        if(createdAt.toDate){
            date = createdAt.toDate();
        }else{
            date = new Date(createdAt);
        }

        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit"
        });

    }catch(error){
        return "";
    }
}

// =======================
// RENDER MESSAGES
// =======================
function renderChatMessages(messages){
    const box = document.getElementById("chatMessages");
    if(!box) return;

    box.innerHTML = "";

    if(!messages.length){
        box.innerHTML = `<div class="chatLoading">No messages yet...</div>`;
        return;
    }

    messages.forEach(msg => {
        const isMe = currentUser && msg.email === currentUser.email;

        const row = document.createElement("div");
        row.className = isMe ? "chatMessageRow me" : "chatMessageRow";

        row.innerHTML = `
            <img 
                src="${msg.photo || "images/ahmed.jpg"}" 
                class="chatAvatar"
                onerror="this.src='images/ahmed.jpg'"
            >

            <div class="chatBubble">
                <div class="chatMeta">
                    <span>${msg.name || "Client"}</span>
                    <small>${formatChatTime(msg.createdAt)}</small>
                </div>

                <div class="chatText">${escapeHtml(msg.message || "")}</div>
            </div>
        `;

        box.appendChild(row);
    });

    box.scrollTop = box.scrollHeight;
}

// =======================
// SEND MESSAGE
// =======================
async function sendChatMessage(){
    const input = document.getElementById("chatInput");
    if(!input || !currentUser) return;

    const message = input.value.trim();

    if(message === ""){
        return;
    }

    input.value = "";

    if(typeof window.sendChatMessageFirebase !== "function"){
        alert("Chat Firebase not loaded");
        return;
    }

    const ok = await window.sendChatMessageFirebase(message, currentUser);

    if(!ok){
        alert("Message not sent");
    }
}

// =======================
// LISTEN MESSAGES
// =======================
function listenMessages(){
    if(typeof window.listenChatMessagesFirebase !== "function"){
        const box = document.getElementById("chatMessages");
        if(box){
            box.innerHTML = `<div class="chatLoading">Chat Firebase not loaded</div>`;
        }
        return;
    }

    window.listenChatMessagesFirebase((messages) => {
        renderChatMessages(messages);
    });
}

// =======================
// SECURITY ESCAPE
// =======================
function escapeHtml(text){
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// =======================
// LOAD
// =======================
window.addEventListener("load", () => {
    loadChatUser();

    setTimeout(() => {
        listenMessages();
    }, 500);
});
