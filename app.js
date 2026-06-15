let chart = null;
let candleSeries = null;
let vwapSeries = null;

let currentAsset = "GOLD";
let currentSymbol = "XAU/USD";

let strategyOn = false;
let liquidityOn = false;
let ibOn = false;
let vwapOn = false;

const API_KEY = "47d321948be348c68c998b1b08dbecea";

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
// CREATE GOLDEN CHART
// =======================
function createChart(){

    const container = document.getElementById("chart");
    container.innerHTML = "";

    chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight,
        layout: {
            background: { color: "#0b0b0b" },
            textColor: "#d1d4dc"
        },
        grid: {
            vertLines: { color: "#1f1f1f" },
            horzLines: { color: "#1f1f1f" }
        },
        timeScale: {
            timeVisible: true,
            secondsVisible: false
        },
        rightPriceScale: {
            borderColor: "#333"
        }
    });

    candleSeries = chart.addCandlestickSeries({
        upColor: "#26a69a",
        downColor: "#ef5350",
        borderUpColor: "#26a69a",
        borderDownColor: "#ef5350",
        wickUpColor: "#26a69a",
        wickDownColor: "#ef5350"
    });

    loadMarketData();
}

// =======================
// LOAD MARKET DATA
// =======================
async function loadMarketData(){

    setText("signal", "Loading real market data...");

    const url =
        `https://api.twelvedata.com/time_series?symbol=${currentSymbol}&interval=1min&outputsize=200&apikey=${API_KEY}`;

    try{
        const response = await fetch(url);
        const data = await response.json();

        if(!data.values){
            setText("signal", "Data error: Check API Key or symbol");
            console.log(data);
            return;
        }

        const candles = data.values.reverse().map(c => ({
            time: Math.floor(new Date(c.datetime).getTime() / 1000),
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close)
        }));

        candleSeries.setData(candles);

        const last = candles[candles.length - 1];
        setText("priceBox", `${currentAsset} ${last.close}`);
        setText("signal", "Real chart loaded");

        if(vwapOn){
            drawVWAP(candles);
        }

        if(liquidityOn){
            drawLiquidity(candles);
        }

        if(ibOn){
            drawIB(candles);
        }

    }catch(error){
        console.error(error);
        setText("signal", "Connection error");
    }
}

// =======================
// CHANGE ASSET
// =======================
window.changeAsset = function(a){

    currentAsset = a;

    const map = {
        GOLD: "XAU/USD",
        EURUSD: "EUR/USD",
        BTCUSD: "BTC/USD"
    };

    currentSymbol = map[a] || "XAU/USD";

    setText("activeAsset", a);
    setText("signal", "Asset changed to " + a);

    updatePanel();
    createChart();
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

    setText("signal", strategyOn ? "🟢 Strategy ON" : "🔴 Strategy OFF");

    updatePanel();
};

// =======================
// LIQUIDITY
// =======================
window.toggleLiquidity = function(){

    liquidityOn = !liquidityOn;

    setText("signal", liquidityOn ? "💧 Liquidity ON" : "💧 Liquidity OFF");

    updatePanel();
    loadMarketData();
};

function drawLiquidity(candles){

    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    const highLevel = Math.max(...highs);
    const lowLevel = Math.min(...lows);

    candleSeries.createPriceLine({
        price: highLevel,
        color: "#ffd700",
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: "Liquidity High"
    });

    candleSeries.createPriceLine({
        price: lowLevel,
        color: "#ffd700",
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: "Liquidity Low"
    });
}

// =======================
// IB ZONE
// =======================
window.toggleIB = function(){

    ibOn = !ibOn;

    setText("signal", ibOn ? "📦 IB Zone ON" : "📦 IB Zone OFF");

    updatePanel();
    loadMarketData();
};

function drawIB(candles){

    const ibCandles = candles.slice(0, 12);

    const ibHigh = Math.max(...ibCandles.map(c => c.high));
    const ibLow = Math.min(...ibCandles.map(c => c.low));

    candleSeries.createPriceLine({
        price: ibHigh,
        color: "#00d4ff",
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Solid,
        axisLabelVisible: true,
        title: "IB High"
    });

    candleSeries.createPriceLine({
        price: ibLow,
        color: "#00d4ff",
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Solid,
        axisLabelVisible: true,
        title: "IB Low"
    });
}

// =======================
// VWAP
// =======================
window.toggleVWAP = function(){

    vwapOn = !vwapOn;

    setText("signal", vwapOn ? "📈 VWAP ON" : "📈 VWAP OFF");

    updatePanel();
    loadMarketData();
};

function drawVWAP(candles){

    if(vwapSeries){
        chart.removeSeries(vwapSeries);
    }

    vwapSeries = chart.addLineSeries({
        color: "#ffd700",
        lineWidth: 2
    });

    let cumulativePV = 0;
    let cumulativeVolume = 0;

    const vwapData = candles.map(c => {

        const typical = (c.high + c.low + c.close) / 3;
        const volume = 1;

        cumulativePV += typical * volume;
        cumulativeVolume += volume;

        return {
            time: c.time,
            value: cumulativePV / cumulativeVolume
        };
    });

    vwapSeries.setData(vwapData);
}

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
// START
// =======================
window.addEventListener("load", () => {
    createChart();
    updatePanel();
    updateSession();
});

setInterval(() => {
    loadMarketData();
    updateSession();
}, 60000);

window.addEventListener("resize", () => {
    if(chart){
        const container = document.getElementById("chart");
        chart.applyOptions({
            width: container.clientWidth,
            height: container.clientHeight
        });
    }
});