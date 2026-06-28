let journalDate = new Date();
let journalTrades = [];
let unsubscribeJournal = null;

function isMasterJournalUser(){
    try{
        const user = JSON.parse(localStorage.getItem("golden_user") || "{}");
        const email = String(user.email || "").trim().toLowerCase();

        return email === "ahmedhussienhassouna@gmail.com";
    }catch(e){
        return false;
    }
}

function requireJournalMaster(){
    if(!isMasterJournalUser()){
        alert("غير مسموح لك بالتعديل");
        return false;
    }
    return true;
}

function updateJournalPermissions(){
    const addBtn = document.getElementById("journalAddBtn");
    if(addBtn){
        addBtn.style.display = isMasterJournalUser() ? "inline-flex" : "none";
    }
}

function startJournalFirebase(){
    if(typeof window.listenJournalTradesFirebase !== "function"){
        console.log("Journal Firebase not ready");
        return;
    }

    if(unsubscribeJournal) return;

    unsubscribeJournal = window.listenJournalTradesFirebase((trades) => {
        journalTrades = trades || [];
        renderJournal();
    });
}

function openJournal(){
    document.getElementById("journalModal").classList.add("active");
    updateJournalPermissions();
    startJournalFirebase();
    renderJournal();
}

function closeJournal(){
    document.getElementById("journalModal").classList.remove("active");
}

function openAddTradeForm(){
    if(!requireJournalMaster()) return;

    document.getElementById("tradeFormModal").classList.add("active");

    const today = new Date().toISOString().split("T")[0];
    document.getElementById("tradeDate").value = today;
    document.getElementById("tradeNumber").value = "TR" + (journalTrades.length + 1);
    document.getElementById("tradeResult").value = "";
    document.getElementById("tradeNotes").value = "";
}

function closeAddTradeForm(){
    document.getElementById("tradeFormModal").classList.remove("active");
}

function setTradeResult(value){
    if(!requireJournalMaster()) return;
    document.getElementById("tradeResult").value = value;
}

async function saveTradeManual(){
    if(!requireJournalMaster()) return;

    const tradeNumber = document.getElementById("tradeNumber").value.trim();
    const tradeDate = document.getElementById("tradeDate").value;
    const tradeAsset = document.getElementById("tradeAsset").value;
    const tradeResult = Number(document.getElementById("tradeResult").value);
    const tradeNotes = document.getElementById("tradeNotes").value.trim();

    if(!tradeNumber || !tradeDate || isNaN(tradeResult)){
        alert("Please fill trade number, date and result");
        return;
    }

    const trade = {
        id: Date.now(),
        number: tradeNumber,
        date: tradeDate,
        asset: tradeAsset,
        result: tradeResult,
        notes: tradeNotes
    };

    if(typeof window.saveJournalTradeFirebase !== "function"){
        alert("Journal Firebase not loaded");
        return;
    }

    await window.saveJournalTradeFirebase(trade);

    closeAddTradeForm();
}

function changeJournalMonth(step){
    journalDate.setMonth(journalDate.getMonth() + step);
    renderJournal();
}

function renderJournal(){
    updateJournalPermissions();

    const calendar = document.getElementById("journalCalendar");
    const title = document.getElementById("journalMonthTitle");

    if(!calendar || !title) return;

    calendar.innerHTML = "";

    const year = journalDate.getFullYear();
    const month = journalDate.getMonth();

    const monthName = journalDate.toLocaleString("en-US", { month: "long" });
    title.innerText = `${monthName} ${year}`;

    const monthTrades = journalTrades.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === year && d.getMonth() === month;
    });

    const totalPips = monthTrades.reduce((sum, t) => sum + Number(t.result), 0);
    const wins = monthTrades.filter(t => Number(t.result) > 0).length;
    const losses = monthTrades.filter(t => Number(t.result) < 0).length;

    document.getElementById("journalTotalPips").innerText = totalPips > 0 ? `+${totalPips}` : totalPips;
    document.getElementById("journalTotalTrades").innerText = monthTrades.length;
    document.getElementById("journalWins").innerText = wins;
    document.getElementById("journalLosses").innerText = losses;

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for(let day = 1; day <= daysInMonth; day++){
        const dateKey = `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

        const dayTrades = monthTrades.filter(t => t.date === dateKey);
        const dayTotal = dayTrades.reduce((sum, t) => sum + Number(t.result), 0);

        const dayBox = document.createElement("div");
        dayBox.className = "journalDay";

        if(dayTrades.length === 0){
            dayBox.classList.add("empty");
        }else if(dayTotal > 0){
            dayBox.classList.add("profit");
        }else if(dayTotal < 0){
            dayBox.classList.add("loss");
        }

        let html = `<div class="journalDayNumber">${day}</div>`;

        dayTrades.forEach(t => {
            const cls = Number(t.result) >= 0 ? "win" : "loss";
            const sign = Number(t.result) > 0 ? "+" : "";

            html += `
                <div class="journalTrade ${cls}">
                    ${t.number} ${sign}${t.result} pip
                </div>
            `;
        });

        if(dayTrades.length > 0){
            const sign = dayTotal > 0 ? "+" : "";

            html += `
                <div class="journalTotal">
                    Total = ${sign}${dayTotal} pip
                </div>
            `;
        }

        dayBox.innerHTML = html;

        if(isMasterJournalUser()){
            dayBox.onclick = function(){
                openEditDay(dateKey);
            };
        }

        calendar.appendChild(dayBox);
    }
}

async function openEditDay(dateKey){
    if(!requireJournalMaster()) return;

    const dayTrades = journalTrades.filter(t => t.date === dateKey);

    let text = dayTrades.map(t => {
        const sign = Number(t.result) > 0 ? "+" : "";
        return `${t.number} ${sign}${t.result}`;
    }).join("\n");

    const newText = prompt(
        "Edit trades for " + dateKey + "\nExample:\nTR1 +200\nTR2 -100",
        text
    );

    if(newText === null) return;

    if(typeof window.deleteJournalTradeFirebase !== "function" ||
       typeof window.saveJournalTradeFirebase !== "function"){
        alert("Journal Firebase not loaded");
        return;
    }

    for(const trade of dayTrades){
        await window.deleteJournalTradeFirebase(trade.id);
    }

    const lines = newText.split("\n");

    for(const line of lines){
        const parts = line.trim().split(" ");
        if(parts.length < 2) continue;

        const result = Number(parts[1]);
        if(isNaN(result)) continue;

        await window.saveJournalTradeFirebase({
            id: Date.now() + "_" + Math.random().toString(36).slice(2),
            number: parts[0],
            date: dateKey,
            asset: "GOLD",
            result: result,
            notes: ""
        });
    }
}

document.addEventListener("DOMContentLoaded", function(){
    updateJournalPermissions();

    setTimeout(() => {
        startJournalFirebase();
        renderJournal();
    }, 1000);
});