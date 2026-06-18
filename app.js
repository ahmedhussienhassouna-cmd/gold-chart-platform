let currentTheme = localStorage.getItem("theme") || "dark";

let currentAsset = "GOLD";

let strategyOn = false;
let liquidityOn = false;
let ibOn = false;
let vwapOn = false;

let lastPrice = null;

let oandaChart = null;
let candleSeries = null;
let resizeTimer = null;

// =======================
// HELPERS
// =======================
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

// =======================
// OANDA LIVE PRICE
// =======================
async function loadOandaPrice(){
    try{
        const res = await fetch("/api/price");
        const data = await res.json();

        if(!data.prices || !data.prices[0]){
            setText("priceBox", "OANDA price error");
            return;
        }

        const priceData = data.prices[0];
        const bid = Number(priceData.bids[0].price);
        const ask = Number(priceData.asks[0].price);
        const mid = ((bid + ask) / 2).toFixed(2);

        lastPrice = Number(mid);

        setText("priceBox", `🥇 XAUUSD Live: ${mid}`);

    }catch(error){
        console.error(error);
        setText("priceBox", "OANDA disconnected");
    }
}

// =======================
// OANDA CANDLES
// =======================
async function loadOandaCandles(){
    try{
        const res = await fetch("/api/candles");
        const data = await res.json();

        if(!data.candles){
            setText("signal", "OANDA candles error");
            return [];
        }

        return data.candles
            .filter(c => c.complete && c.mid)
            .map(c => ({
                time: Math.floor(new Date(c.time).getTime() / 1000),
                open: Number(c.mid.o),
                high: Number(c.mid.h),
                low: Number(c.mid.l),
                close: Number(c.mid.c)
            }));

    }catch(error){
        console.error(error);
        setText("signal", "OANDA candles disconnected");
        return [];
    }
}

// =======================
// CHART
// =======================
async function createChart(){

    const container = document.getElementById("chart");
    if(!container) return;

    container.innerHTML = `<div id="oandaChart"></div>`;

    const chartBox = document.getElementById("oandaChart");

    chartBox.style.width = "100%";
    chartBox.style.height = "100%";

    if(typeof LightweightCharts === "undefined"){
        setText("signal", "Lightweight Charts library not loaded");
        return;
    }

    const rect = container.getBoundingClientRect();
    const width = Math.max(rect.width, 600);
    const height = Math.max(rect.height, 400);

    oandaChart = LightweightCharts.createChart(chartBox, {
        width: width,
        height: height,
        layout: {
            background: { color: "#0b0b0b" },
            textColor: "#d1d4dc"
        },
        grid: {
            vertLines: { color: "#1f1f1f" },
            horzLines: { color: "#1f1f1f" }
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal
        },
        rightPriceScale: {
            borderColor: "#333"
        },
        timeScale: {
            borderColor: "#333",
            timeVisible: true,
            secondsVisible: false
        }
    });

    candleSeries = oandaChart.addCandlestickSeries({
        upColor: "#00ff99",
        downColor: "#ff4d4d",
        borderUpColor: "#00ff99",
        borderDownColor: "#ff4d4d",
        wickUpColor: "#00ff99",
        wickDownColor: "#ff4d4d"
    });

    const candles = await loadOandaCandles();

    if(candles.length){
        candleSeries.setData(candles);
        oandaChart.timeScale().fitContent();

        setText("signal", `✅ GOLD OANDA Chart Loaded`);
    }else{
        setText("signal", "No OANDA candles found");
    }
}

// =======================
// UPDATE LAST CANDLE
// =======================
async function updateLastCandle(){
    if(currentAsset !== "GOLD" || !candleSeries) return;

    const candles = await loadOandaCandles();
    if(!candles.length) return;

    candleSeries.update(candles[candles.length - 1]);
}

// =======================
// BUTTONS
// =======================
window.toggleTheme = function(){
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", currentTheme);

    applyPageTheme();
    createChart();
    updatePanel();
};

window.changeAsset = function(a){

    currentAsset = a;

    setText("activeAsset", a);
    setText("signal", "Loading " + a + " chart...");
    setText("priceBox", `${a} Live Chart`);

    if(a === "GOLD"){
        createChart();
        loadOandaPrice();
    }else{
        setText("signal", "OANDA chart is active for GOLD only now");
    }

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
            `✅ ${message}<br>High: ${high}<br>Low: ${low}<br>Live Price: ${lastPrice || "Loading..."}`
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

// =======================
// SESSION
// =======================
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

// =======================
// LOAD
// =======================
window.addEventListener("load", () => {
    applyPageTheme();

    setTimeout(() => {
        createChart();
        loadOandaPrice();
    }, 300);

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

setInterval(() => {
    if(currentAsset === "GOLD"){
        loadOandaPrice();
        updateLastCandle();
    }
}, 3000);

window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        createChart();
    }, 500);
});