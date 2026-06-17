let widget = null;

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
}

function createChart(){

    const container = document.getElementById("chart");
    if(!container) return;

    container.innerHTML = "";

    widget = new TradingView.widget({
        container_id: "chart",
        autosize: true,
        symbol: currentTVSymbol,
        interval: "1",
        timezone: "Africa/Cairo",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#0b0b0b",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        save_image: false,
        studies: [],
        withdateranges: true
    });

    setText("priceBox", `${currentAsset} Live Chart`);
    setText("signal", "✅ TradingView Chart Loaded");
}

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
        const levels = await window.loadStrategyLevels();

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
    createChart();
    updatePanel();
    updateSession();
});

setInterval(() => {
    updateSession();
}, 1000);

window.addEventListener("resize", () => {
    createChart();
});