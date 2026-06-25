let journalDate = new Date();
let journalTrades = JSON.parse(localStorage.getItem("gt_journal_trades")) || [];

function openJournal(){
    document.getElementById("journalModal").classList.add("active");
    renderJournal();
}

function closeJournal(){
    document.getElementById("journalModal").classList.remove("active");
}

function openAddTradeForm(){
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
    document.getElementById("tradeResult").value = value;
}

function saveTradeManual(){
    const tradeNumber = document.getElementById("tradeNumber").value.trim();
    const tradeDate = document.getElementById("tradeDate").value;
    const tradeAsset = document.getElementById("tradeAsset").value;
    const tradeResult = Number(document.getElementById("tradeResult").value);
    const tradeNotes = document.getElementById("tradeNotes").value.trim();

    if (!tradeNumber || !tradeDate || isNaN(tradeResult)) {
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

    journalTrades.push(trade);
    localStorage.setItem("gt_journal_trades", JSON.stringify(journalTrades));

    closeAddTradeForm();
    renderJournal();
}

function changeJournalMonth(step){
    journalDate.setMonth(journalDate.getMonth() + step);
    renderJournal();
}

function renderJournal(){
    const calendar = document.getElementById("journalCalendar");
    const title = document.getElementById("journalMonthTitle");

    if (!calendar || !title) return;

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
dayBox.onclick = function(){
    openEditDay(dateKey);
};
calendar.appendChild(dayBox);
    }
}

document.addEventListener("DOMContentLoaded", function(){
    renderJournal();
});

function openEditDay(dateKey){
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

    journalTrades = journalTrades.filter(t => t.date !== dateKey);

    newText.split("\n").forEach(line => {
        const parts = line.trim().split(" ");
        if(parts.length < 2) return;

        journalTrades.push({
            id: Date.now() + Math.random(),
            number: parts[0],
            date: dateKey,
            asset: "GOLD",
            result: Number(parts[1]),
            notes: ""
        });
    });

    localStorage.setItem("gt_journal_trades", JSON.stringify(journalTrades));
    renderJournal();
}