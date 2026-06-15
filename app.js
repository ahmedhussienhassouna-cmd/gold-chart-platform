let widget = null;

let currentAsset = "GOLD";

let strategyOn = false;
let liquidityOn = false;
let ibOn = false;
let vwapOn = false;

// =======================
// HELPERS
// =======================
function setText(id, value){
    const el = document.getElementById(id);
    if(el){
        el.innerHTML = value;
    }
}

function updatePanel(){
    setText("panelAsset", currentAsset);
    setText("panelStrategy", strategyOn ? "ON" : "OFF");
    setText("panelLiquidity", liquidityOn ? "ON" : "OFF");
    setText("panelIB", ibOn ? "ON" : "OFF");
    setText("panelVWAP", vwapOn ? "ON" : "OFF");
}

// =======================
// CREATE TRADINGVIEW CHART
// =======================
function createChart(symbol){

    const container = document.getElementById("chart");
    container.innerHTML = "";

    widget = new TradingView.widget({
        container_id: "chart",

        width: "100%",
        height: "100%",

        symbol: symbol,
        interval: "1",

        timezone: "Etc/UTC",

        theme: "dark",
        style: "1",
        locale: "en",

        allow_symbol_change: true,
        hide_top_toolbar: false,
        hide_side_toolbar: false,
        enable_publishing: false,
        withdateranges: true
    });
}

// =======================
// START CHART
// =======================
window.addEventListener("load", () => {
    createChart("OANDA:XAUUSD");
    updatePanel();
    updateSession();
});

// =======================
// CHANGE ASSET
// =======================
window.changeAsset = function(a){

    currentAsset = a;

    setText("activeAsset", a);
    setText("signal", "Asset changed to " + a);

    const map = {
        GOLD: "OANDA:XAUUSD",
        EURUSD: "FX:EURUSD",
        BTCUSD: "BINANCE:BTCUSDT"
    };

    if(map[a]){
        createChart(map[a]);
    }

    updatePanel();
};

// =======================
// SERVICES
// =======================
window.service = function(type){

    let msg = {
        daily: "📊 Daily Analysis Selected",
        support: "📍 Support Selected",
        settings: "⚙️ Settings Selected"
    };

    setText("signal", msg[type] || "Waiting...");
};

// =======================
// STRATEGY
// =======================
window.toggleStrategy = function(){

    strategyOn = !strategyOn;

    setText(
        "signal",
        strategyOn
        ? "🟢 Strategy ON - Waiting for real market data"
        : "🔴 Strategy OFF"
    );

    updatePanel();
};

// =======================
// LIQUIDITY TOOL
// =======================
window.toggleLiquidity = function(){

    liquidityOn = !liquidityOn;

    setText(
        "signal",
        liquidityOn
        ? "💧 Liquidity ON"
        : "💧 Liquidity OFF"
    );

    updatePanel();
};

// =======================
// IB ZONE TOOL
// =======================
window.toggleIB = function(){

    ibOn = !ibOn;

    setText(
        "signal",
        ibOn
        ? "📦 IB Zone ON"
        : "📦 IB Zone OFF"
    );

    updatePanel();
};

// =======================
// VWAP TOOL
// =======================
window.toggleVWAP = function(){

    vwapOn = !vwapOn;

    setText(
        "signal",
        vwapOn
        ? "📈 VWAP ON"
        : "📈 VWAP OFF"
    );

    updatePanel();
};

// =======================
// SESSION CLOCK
// =======================
function getCurrentSession(){

    const now = new Date();

    const cairoTime = new Date(
        now.toLocaleString("en-US", { timeZone: "Africa/Cairo" })
    );

    const hour = cairoTime.getHours();
    const minute = cairoTime.getMinutes();

    const current = hour + minute / 60;

    if(current >= 1 && current < 3){
        return "Sydney";
    }

    if(current >= 3 && current < 10){
        return "Asia";
    }

    if(current >= 10 && current < 15.5){
        return "London";
    }

    if(current >= 15.5 && current < 23){
        return "New York";
    }

    return "Closed";
}

function updateSession(){
    const session = getCurrentSession();
    setText("panelSession", session);
}

// =======================
// LIVE STATUS
// =======================
setInterval(() => {
    setText("priceBox", "🟢 Golden Trade Live");
    updateSession();
}, 1000);