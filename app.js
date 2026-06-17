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
    if(currentTheme === "light"){
        document.body.style.background = "#f4f4f4";
        document.body.style.color = "#111";
    }else{
        document.body.style.background = "#0b0b0b";
        document.body.style.color = "white";
    }
}

function createChart(){

    const container = document.getElementById("chart");
    if(!container) return;

    container.innerHTML = "";

    const tvSymbol = encodeURIComponent(currentTVSymbol);
    const theme = currentTheme === "light" ? "Light" : "Dark";

    container.innerHTML = `
        <iframe
            src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${tvSymbol}&interval=1&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=f1f3f6&studies=[]&theme=${theme}&style=1&timezone=Africa%2FCairo&withdateranges=1&hideideas=1"
            style="width:100%; height:100%; border:0;"
            allowtransparency="true"
            scrolling="no"
            allowfullscreen>
        </iframe>
    `;

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
});

setInterval(() => {
    updateSession();
}, 1000);

let resizeTimer = null;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        createChart();
    }, 500);
});