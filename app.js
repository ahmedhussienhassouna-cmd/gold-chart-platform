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
// SERVICES (UI ONLY)
// =======================
window.service = function(type){

    let msg = {
        daily:"📊 Daily Analysis",
        strategy:"💰 Strategy",
        support:"📍 Support",
        settings:"⚙️ Settings"
    };

    document.getElementById("signal").innerHTML = msg[type];

    if(type === "strategy"){
        toggleStrategy(); // 🔥 تشغيل الاستراتيجية من الزر
    }
};

// =======================
// STRATEGY ENGINE (IB V3)
// =======================
let ib = {
    high: null,
    low: null,
    count: 0,
    brokeHigh: false,
    brokeLow: false,
    buyBreak: null,
    sellBreak: null
};

const barsIB = 12;
const moveMin = 7;
const moveMax = 10;

function toggleStrategy(){

    strategyOn = !strategyOn;

    document.getElementById("signal").innerHTML =
        strategyOn ? "🟢 Strategy ON" : "🔴 Strategy OFF";

    if(strategyOn){
        runStrategy();
    }
}

// =======================
// FAKE PRICE (لاحقًا هنربطه بسوق حقيقي)
// =======================
function getPrice(){
    return 2400 + (Math.random() * 10 - 5);
}

// =======================
// STRATEGY LOOP
// =======================
function runStrategy(){

    if(!strategyOn) return;

    setTimeout(() => {

        let price = getPrice();

        // reset بسيط
        if(ib.count > 200){
            ib = {
                high:null,
                low:null,
                count:0,
                brokeHigh:false,
                brokeLow:false,
                buyBreak:null,
                sellBreak:null
            };
        }

        // ================= IB BUILD
        if(ib.count < barsIB){

            ib.high = ib.high === null ? price : Math.max(ib.high, price);
            ib.low  = ib.low === null ? price : Math.min(ib.low, price);

            ib.count++;
        }

        // ================= BREAKOUT
        if(!ib.brokeHigh && price > ib.high){
            ib.brokeHigh = true;
            ib.buyBreak = price;
        }

        if(!ib.brokeLow && price < ib.low){
            ib.brokeLow = true;
            ib.sellBreak = price;
        }

        // ================= MOMENTUM
        let buyMove = ib.buyBreak ? (price - ib.buyBreak) : null;
        let sellMove = ib.sellBreak ? (ib.sellBreak - price) : null;

        // ================= SIGNALS
        let buySignal =
            buyMove !== null &&
            buyMove >= moveMin &&
            buyMove <= moveMax;

        let sellSignal =
            sellMove !== null &&
            sellMove >= moveMin &&
            sellMove <= moveMax;

        if(buySignal){
            document.getElementById("signal").innerHTML = "🟢 BUY V3 CONFIRMED";
        }

        if(sellSignal){
            document.getElementById("signal").innerHTML = "🔴 SELL V3 CONFIRMED";
        }

        runStrategy();

    }, 1000);
}
