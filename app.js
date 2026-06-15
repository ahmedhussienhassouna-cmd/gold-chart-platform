let widget = null;
let strategyOn = false;

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
});

// =======================
// CHANGE ASSET
// =======================
window.changeAsset = function(a){

    document.getElementById("activeAsset").innerHTML = a;

    const map = {
        GOLD: "OANDA:XAUUSD",
        EURUSD: "FX:EURUSD",
        BTCUSD: "BINANCE:BTCUSDT"
    };

    if(map[a]){
        createChart(map[a]);
    }
};

// =======================
// SERVICES
// =======================
window.service = function(type){

    let msg = {
        daily: "📊 Daily Analysis",
        strategy: "💰 Strategy",
        support: "📍 Support",
        settings: "⚙️ Settings"
    };

    document.getElementById("signal").innerHTML = msg[type] || "Waiting...";

    if(type === "strategy"){
        toggleStrategy();
    }
};

// =======================
// STRATEGY ENGINE STATUS
// =======================
function toggleStrategy(){

    strategyOn = !strategyOn;

    document.getElementById("signal").innerHTML =
        strategyOn
        ? "🟢 Strategy ON - Waiting for real market data"
        : "🔴 Strategy OFF";
}

// =======================
// LIQUIDITY TOOL
// =======================
function toggleLiquidity(){

    document.getElementById("signal").innerHTML =
    "💧 Liquidity Tool Ready";

    alert("Liquidity tool added. الرسم الحقيقي على الشارت يحتاج Charting Library أو Lightweight Charts.");
}

// =======================
// IB ZONE TOOL
// =======================
function toggleIB(){

    document.getElementById("signal").innerHTML =
    "📦 IB Zone Tool Ready";

    alert("IB Zone tool added. الرسم الحقيقي على الشارت يحتاج Charting Library أو Lightweight Charts.");
}

// =======================
// VWAP TOOL
// =======================
function toggleVWAP(){

    document.getElementById("signal").innerHTML =
    "📈 VWAP Tool Ready";

    alert("VWAP tool added. الرسم الحقيقي على الشارت يحتاج Charting Library أو Lightweight Charts.");
}

// =======================
// LIVE STATUS
// =======================
setInterval(() => {
    const priceBox = document.getElementById("priceBox");

    if(priceBox){
        priceBox.innerHTML = "🟢 Golden Trade Live";
    }
}, 1000);