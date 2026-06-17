let currentTheme = localStorage.getItem("theme") || "dark";

let currentAsset = "GOLD";
let currentTVSymbol = "OANDA:XAUUSD";

let strategyOn = false;
let liquidityOn = false;
let ibOn = false;
let vwapOn = false;

function setText(id, value){
    const el = document.getElementById(id);
    if(el) el.innerHTML = value;
}

function updatePanel(){
    setText("panelAsset", currentAsset);
    setText("panelStrategy", strategyOn ? "ON" : "OFF");
    setText("panelLiquidity", liquidityOn ? "ON" : "OFF");
    setText("panelIB", ibOn ? "ON" : "OFF");
    setText("panelVWAP", vwapOn ? "ON" : "OFF");

    const btn = document.getElementById("strategyBtn");
    if(btn){
        btn.innerHTML = strategyOn ? "✅ Strategy ON" : "💰 Strategy";
    }

    const themeBtn = document.getElementById("themeBtn");
    if(themeBtn){
        themeBtn.innerHTML = currentTheme === "dark"
            ? "☀️ Light Mode"
            : "🌙 Dark Mode";
    }
}

function applyPageTheme(){
    document.body.classList.remove("darkTheme", "lightTheme");
    document.body.classList.add(currentTheme === "dark" ? "darkTheme" : "lightTheme");
}

function createChart(){

    const container = document.getElementById("chart");
    if(!container) return;

    container.innerHTML = "";

    if(typeof TradingView === "undefined"){
        setText("signal", "TradingView library not loaded");
        return;
    }

    new TradingView.widget({
        container_id: "chart",
        autosize: true,
        symbol: currentTVSymbol,
        interval: "1",
        timezone: "Africa/Cairo",
        theme: currentTheme,
        style: "1",
        locale: "en",
        toolbar_bg: currentTheme === "dark" ? "#111111" : "#f1f3f6",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        save_image: false,
        withdateranges: true,
        studies: []
    });

    setText("priceBox", `${currentAsset} Live Chart`);
    setText("signal", `✅ ${currentAsset} TradingView Chart Loaded`);
}

window.toggleTheme = function(){

    currentTheme = currentTheme === "dark" ? "light" : "dark";

    localStorage.setItem("theme", currentTheme);

    applyPageTheme();
    createChart();
    updatePanel();
};

window.changeAsset = function(a){

    currentAsset = a;

    const map = {
        GOLD: "OANDA:XAUUSD",
        EURUSD: "OANDA:EURUSD",
        BTCUSD: "BINANCE:BTCUSDT"
    };

    currentTVSymbol = map[a] || "OANDA:XAUUSD";

    setText("activeAsset", a);
    setText("signal", "Loading " + a + " chart...");
    setText("priceBox", `${a} Live Chart`);

    createChart();
    updatePanel();
};

window.service = function(type){

    const msg = {
        daily: "📊 Daily Analysis Selected",
        support: "📍 Support Selected",
        settings: "⚙️ Settings Selected"
    };

    setText("signal", msg[type] || "Waiting...");
};

window.toggleStrategy = async function(){

    strategyOn = !strategyOn;
    updatePanel();

    if(!strategyOn){
        setText("signal", "🔴 Strategy OFF");
        return;
    }

    if(typeof window.loadStrategyLevels !== "function"){
        setText("signal", "Firebase not loaded");
        return;
    }

    try{
        const levels = await window.loadStrategyLevels(currentAsset);

        if(!levels){
            setText("signal", "No strategy levels found");
            return;
        }

        const high = Number(levels.high);
        const low = Number(levels.low);
        const message = levels.message || "Golden Trade Strategy";

        setText(
            "signal",
            `✅ ${message}<br>High: ${high}<br>Low: ${low}`
        );

    }catch(error){
        console.error(error);
        setText("signal", "Strategy Firebase Error");
    }
};

window.toggleLiquidity = function(){
    liquidityOn = !liquidityOn;
    updatePanel();
    setText("signal", liquidityOn ? "💧 Liquidity ON" : "💧 Liquidity OFF");
};

window.toggleIB = function(){
    ibOn = !ibOn;
    updatePanel();
    setText("signal", ibOn ? "📦 IB Zone ON" : "📦 IB Zone OFF");
};

window.toggleVWAP = function(){
    vwapOn = !vwapOn;
    updatePanel();
    setText("signal", vwapOn ? "📈 VWAP ON" : "📈 VWAP OFF");
};

// =======================
// CHANNEL
// =======================
async function loadChannel(){

    const box = document.getElementById("channelBox");

    if(!box) return;

    if(typeof window.loadChannelMessage !== "function"){
        box.innerHTML = "Channel not loaded";
        return;
    }

    try{
        const data = await window.loadChannelMessage();

        if(!data){
            box.innerHTML = "No channel message";
            return;
        }

        box.innerHTML = `
            <div style="background:#1b1b1b;border:1px solid #333;border-radius:8px;padding:10px;margin-top:8px;">
                <b style="color:#ffd700;">${data.title || "Golden Trade"}</b>
                <p style="margin-top:8px;line-height:1.5;">${data.message || ""}</p>
                <small style="color:#888;">${data.createdAt || ""}</small>
            </div>
        `;

    }catch(error){
        console.error(error);
        box.innerHTML = "Channel error";
    }
}

function getCurrentSession(){

    const now = new Date();

    const cairoTime = new Date(
        now.toLocaleString("en-US", { timeZone: "Africa/Cairo" })
    );

    const hour = cairoTime.getHours();
    const minute = cairoTime.getMinutes();

    const current = hour + minute / 60;

    if(current >= 1 && current < 3) return "Sydney";
    if(current >= 3 && current < 10) return "Asia";
    if(current >= 10 && current < 15.5) return "London";
    if(current >= 15.5 && current < 23) return "New York";

    return "Closed";
}

function updateSession(){
    setText("panelSession", getCurrentSession());
}

window.addEventListener("load", () => {
    applyPageTheme();
    createChart();
    updatePanel();
    updateSession();

    setTimeout(() => {
        loadChannel();
    }, 1000);
});

setInterval(() => {
    updateSession();
}, 1000);

setInterval(() => {
    loadChannel();
}, 30000);

let resizeTimer = null;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        createChart();
    }, 500);
});