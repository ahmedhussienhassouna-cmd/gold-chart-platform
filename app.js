let chart = null;
let candleSeries = null;
let vwapSeries = null;
let socket = null;

let liquidityLines = [];
let ibLines = [];
let candlesData = [];

let currentAsset = "GOLD";
let currentSymbol = "XAU/USD";

let strategyOn = false;
let liquidityOn = false;
let ibOn = false;
let vwapOn = false;

let firstLoad = true;
let isLoading = false;

const API_KEY = "2ad0666474114f7787a45ccacffdaf44";
const CURRENT_INTERVAL = "1min";

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
}

function clearLines(){
    liquidityLines.forEach(line => candleSeries.removePriceLine(line));
    ibLines.forEach(line => candleSeries.removePriceLine(line));
    liquidityLines = [];
    ibLines = [];
}

function clearVWAP(){
    if(vwapSeries){
        chart.removeSeries(vwapSeries);
        vwapSeries = null;
    }
}

// =======================
// CREATE CHART
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
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal
        },
        rightPriceScale: {
            borderColor: "#333"
        }
    });

    const candleOptions = {
        upColor: "#26a69a",
        downColor: "#ef5350",
        borderUpColor: "#26a69a",
        borderDownColor: "#ef5350",
        wickUpColor: "#26a69a",
        wickDownColor: "#ef5350"
    };

    if(chart.addCandlestickSeries){
        candleSeries = chart.addCandlestickSeries(candleOptions);
    } else {
        candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, candleOptions);
    }

    firstLoad = true;
    loadMarketData();
}

// =======================
// LOAD HISTORICAL DATA
// =======================
async function loadMarketData(){

    if(!candleSeries || isLoading) return;

    isLoading = true;

    const symbol = encodeURIComponent(currentSymbol);

    const url =
    `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${CURRENT_INTERVAL}&outputsize=1000&apikey=${API_KEY}`;

    try{
        const response = await fetch(url);
        const data = await response.json();

        if(!data.values){
            console.log(data);
            setText("signal", "Data error: Check API Key / Symbol");
            isLoading = false;
            return;
        }

        candlesData = data.values.reverse().map(c => ({
            time: Math.floor(new Date(c.datetime).getTime() / 1000),
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close)
        }));

        candleSeries.setData(candlesData);

        const last = candlesData[candlesData.length - 1];

        setText("priceBox", `${currentAsset} ${last.close}`);
        setText("signal", "✅ Chart loaded");

        if(firstLoad){
            chart.timeScale().fitContent();
            firstLoad = false;
        }

        redrawTools();

    }catch(error){
        console.error(error);
        setText("signal", "Connection error");
    }

    isLoading = false;
}

// =======================
// WEBSOCKET LIVE PRICE
// =======================
function startWebSocket(){

    if(socket){
        socket.close();
        socket = null;
    }

    const wsUrl = `wss://ws.twelvedata.com/v1/quotes/price?apikey=${API_KEY}`;
    socket = new WebSocket(wsUrl);

    socket.onopen = function(){
        socket.send(JSON.stringify({
            action: "subscribe",
            params: {
                symbols: currentSymbol
            }
        }));

        setText("signal", "🟢 WebSocket connected");
    };

    socket.onmessage = function(event){

        try{
            const msg = JSON.parse(event.data);

            if(!msg.price) return;

            const price = parseFloat(msg.price);
            const now = Math.floor(Date.now() / 1000);
            const minuteTime = Math.floor(now / 60) * 60;

            updateLiveCandle(price, minuteTime);

        }catch(error){
            console.log("WS message:", event.data);
        }
    };

    socket.onerror = function(error){
        console.error("WebSocket error:", error);
        setText("signal", "WebSocket error");
    };

    socket.onclose = function(){
        setText("signal", "WebSocket closed - reconnecting...");
        setTimeout(startWebSocket, 5000);
    };
}

function updateLiveCandle(price, time){

    if(!candlesData.length) return;

    let last = candlesData[candlesData.length - 1];

    if(last.time === time){
        last.close = price;
        last.high = Math.max(last.high, price);
        last.low = Math.min(last.low, price);
    } else if(time > last.time){
        last = {
            time: time,
            open: price,
            high: price,
            low: price,
            close: price
        };

        candlesData.push(last);

        if(candlesData.length > 1000){
            candlesData.shift();
        }
    } else {
        return;
    }

    candleSeries.update(last);

    setText("priceBox", `${currentAsset} ${price}`);
    setText("signal", "🟢 Live price updated");

    if(strategyOn) runSimpleStrategy(candlesData);
}

// =======================
// REDRAW TOOLS
// =======================
function redrawTools(){
    clearLines();

    if(liquidityOn) drawLiquidity(candlesData);
    if(ibOn) drawIB(candlesData);
    if(vwapOn) drawVWAP(candlesData);
    if(strategyOn) runSimpleStrategy(candlesData);
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

    clearVWAP();

    updatePanel();
    createChart();
    startWebSocket();
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

    if(!strategyOn){
        candleSeries.setMarkers([]);
    }

    setText("signal", strategyOn ? "🟢 Strategy ON" : "🔴 Strategy OFF");

    updatePanel();
    redrawTools();
};

function runSimpleStrategy(candles){

    const last = candles[candles.length - 1];

    let marker;

    if(last.close > last.open){
        marker = {
            time: last.time,
            position: "belowBar",
            color: "#26a69a",
            shape: "arrowUp",
            text: "BUY"
        };

        setText("signal", "🟢 BUY marker on chart");
    } else {
        marker = {
            time: last.time,
            position: "aboveBar",
            color: "#ef5350",
            shape: "arrowDown",
            text: "SELL"
        };

        setText("signal", "🔴 SELL marker on chart");
    }

    candleSeries.setMarkers([marker]);
}

// =======================
// LIQUIDITY
// =======================
window.toggleLiquidity = function(){

    liquidityOn = !liquidityOn;

    setText("signal", liquidityOn ? "💧 Liquidity ON" : "💧 Liquidity OFF");

    updatePanel();
    redrawTools();
};

function drawLiquidity(candles){

    const highLevel = Math.max(...candles.map(c => c.high));
    const lowLevel = Math.min(...candles.map(c => c.low));

    liquidityLines.push(
        candleSeries.createPriceLine({
            price: highLevel,
            color: "#ffd700",
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Dashed,
            axisLabelVisible: true,
            title: "Liquidity High"
        })
    );

    liquidityLines.push(
        candleSeries.createPriceLine({
            price: lowLevel,
            color: "#ffd700",
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Dashed,
            axisLabelVisible: true,
            title: "Liquidity Low"
        })
    );
}

// =======================
// IB ZONE
// =======================
window.toggleIB = function(){

    ibOn = !ibOn;

    setText("signal", ibOn ? "📦 IB Zone ON" : "📦 IB Zone OFF");

    updatePanel();
    redrawTools();
};

function drawIB(candles){

    const ibCandles = candles.slice(0, 12);

    const ibHigh = Math.max(...ibCandles.map(c => c.high));
    const ibLow = Math.min(...ibCandles.map(c => c.low));

    ibLines.push(
        candleSeries.createPriceLine({
            price: ibHigh,
            color: "#00d4ff",
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Solid,
            axisLabelVisible: true,
            title: "IB High"
        })
    );

    ibLines.push(
        candleSeries.createPriceLine({
            price: ibLow,
            color: "#00d4ff",
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Solid,
            axisLabelVisible: true,
            title: "IB Low"
        })
    );
}

// =======================
// VWAP
// =======================
window.toggleVWAP = function(){

    vwapOn = !vwapOn;

    if(!vwapOn){
        clearVWAP();
    }

    setText("signal", vwapOn ? "📈 VWAP ON" : "📈 VWAP OFF");

    updatePanel();
    redrawTools();
};

function drawVWAP(candles){

    clearVWAP();

    const lineOptions = {
        color: "#ffd700",
        lineWidth: 2
    };

    if(chart.addLineSeries){
        vwapSeries = chart.addLineSeries(lineOptions);
    } else {
        vwapSeries = chart.addSeries(LightweightCharts.LineSeries, lineOptions);
    }

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
// START
// =======================
window.addEventListener("load", () => {
    createChart();
    updatePanel();
    updateSession();
    startWebSocket();
});

setInterval(() => {
    updateSession();
}, 1000);

window.addEventListener("resize", () => {
    if(chart){
        const container = document.getElementById("chart");
        chart.applyOptions({
            width: container.clientWidth,
            height: container.clientHeight
        });
    }
});