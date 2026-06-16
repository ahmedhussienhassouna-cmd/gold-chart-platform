let chart = null;
let candleSeries = null;
let vwapSeries = null;
let socket = null;

let liquidityLines = [];
let ibLines = [];
let strategyLines = [];
let candlesData = [];

let currentAsset = "GOLD";
let currentSymbol = "XAU/USD";
let currentInterval = "1min";

let strategyOn = false;
let liquidityOn = false;
let ibOn = false;
let vwapOn = false;

let firstLoad = true;
let isLoading = false;

const API_KEY = "2ad0666474114f7787a45ccacffdaf44";

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
}

function safeRemovePriceLine(line){
    try{
        if(candleSeries && line){
            candleSeries.removePriceLine(line);
        }
    }catch(e){
        console.log("Remove line error:", e);
    }
}

function clearLines(){
    liquidityLines.forEach(line => safeRemovePriceLine(line));
    ibLines.forEach(line => safeRemovePriceLine(line));
    liquidityLines = [];
    ibLines = [];
}

function clearMarkers(){
    try{
        if(candleSeries && typeof candleSeries.setMarkers === "function"){
            candleSeries.setMarkers([]);
        }
    }catch(e){
        console.log("Clear markers error:", e);
    }
}

function setMarkersSafe(markers){
    try{
        if(candleSeries && typeof candleSeries.setMarkers === "function"){
            candleSeries.setMarkers(markers);
        }else{
            console.log("setMarkers not supported in this version");
        }
    }catch(e){
        console.log("Set markers error:", e);
    }
}

function clearStrategy(){
    clearMarkers();

    strategyLines.forEach(line => safeRemovePriceLine(line));
    strategyLines = [];
}

function clearVWAP(){
    if(vwapSeries && chart){
        try{
            chart.removeSeries(vwapSeries);
        }catch(e){
            console.log("VWAP remove error:", e);
        }
        vwapSeries = null;
    }
}

function stopWebSocket(){
    if(socket){
        socket.close();
        socket = null;
    }
}

function getOutputSize(){
    if(currentInterval === "1min") return 1000;
    if(currentInterval === "5min") return 1000;
    if(currentInterval === "15min") return 1000;
    if(currentInterval === "30min") return 1000;
    if(currentInterval === "1h") return 1000;
    if(currentInterval === "4h") return 700;
    if(currentInterval === "1day") return 500;
    return 1000;
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
    const outputsize = getOutputSize();

    const url =
    `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${currentInterval}&outputsize=${outputsize}&apikey=${API_KEY}`;

    try{
        const response = await fetch(url);
        const data = await response.json();

        if(!data.values){
            console.log(data);
            setText("signal", "Data error: Check API Key / Symbol / Timeframe");
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

        setText("priceBox", `${currentAsset} ${last.close} | ${currentInterval}`);
        setText("signal", "✅ Chart loaded - " + currentInterval);

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

    stopWebSocket();

    if(currentInterval !== "1min"){
        setText("signal", "WebSocket active only on 1M");
        return;
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
        if(currentInterval === "1min"){
            setText("signal", "WebSocket closed - reconnecting...");
            setTimeout(startWebSocket, 5000);
        }
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

    setText("priceBox", `${currentAsset} ${price} | ${currentInterval}`);

    if(strategyOn){
        runGoldenStrategy(candlesData);
    }
}

// =======================
// TIMEFRAMES
// =======================
window.changeTimeframe = function(tf){

    currentInterval = tf;

    setText("signal", "Loading timeframe: " + tf);

    clearVWAP();
    clearLines();
    clearStrategy();

    firstLoad = true;

    loadMarketData();
    startWebSocket();
};

// =======================
// REDRAW TOOLS
// =======================
function redrawTools(){

    clearLines();

    if(strategyOn) runGoldenStrategy(candlesData);
    if(liquidityOn) drawLiquidity(candlesData);
    if(ibOn) drawIB(candlesData);
    if(vwapOn) drawVWAP(candlesData);
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
    clearLines();
    clearStrategy();

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
// STRATEGY - Golden Trade IB Pro V3
// =======================
window.toggleStrategy = function(){

    strategyOn = !strategyOn;

    updatePanel();

    if(!strategyOn){
        clearStrategy();
        setText("signal", "🔴 Strategy OFF");
        return;
    }

    setText("signal", "🟢 Strategy ON");

    try{
        runGoldenStrategy(candlesData);
    }catch(error){
        console.error("Strategy Error:", error);
        setText("signal", "Strategy Error - check app.js");
    }
};

function runGoldenStrategy(candles){

    if(!candles || candles.length < 20){
        setText("signal", "Waiting for candles...");
        return;
    }

    clearStrategy();

    const barsIB = 12;
    const moveMin = 7.0;
    const moveMax = 10.0;

    const lastCandle = candles[candles.length - 1];
    const lastDate = new Date(lastCandle.time * 1000).toDateString();

    const todayCandles = candles.filter(c => {
        return new Date(c.time * 1000).toDateString() === lastDate;
    });

    if(todayCandles.length < barsIB + 5){
        setText("signal", "Waiting for IB candles...");
        return;
    }

    const ibCandles = todayCandles.slice(0, barsIB);

    const ibHigh = Math.max(...ibCandles.map(c => c.high));
    const ibLow  = Math.min(...ibCandles.map(c => c.low));

    strategyLines.push(
        candleSeries.createPriceLine({
            price: ibHigh,
            color: "#00ff66",
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Solid,
            axisLabelVisible: true,
            title: "GT IB High"
        })
    );

    strategyLines.push(
        candleSeries.createPriceLine({
            price: ibLow,
            color: "#ff3333",
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Solid,
            axisLabelVisible: true,
            title: "GT IB Low"
        })
    );

    let brokeHigh = false;
    let brokeLow = false;

    let buyBreakPrice = null;
    let sellBreakPrice = null;

    let markers = [];

    for(let i = barsIB; i < todayCandles.length; i++){

        const c = todayCandles[i];

        if(!brokeHigh && c.close > ibHigh){
            brokeHigh = true;
            buyBreakPrice = c.close;
        }

        if(!brokeLow && c.close < ibLow){
            brokeLow = true;
            sellBreakPrice = c.close;
        }

        const buyMove = buyBreakPrice ? c.close - buyBreakPrice : null;
        const sellMove = sellBreakPrice ? sellBreakPrice - c.close : null;

        if(buyMove !== null && buyMove >= moveMin && buyMove <= moveMax){
            markers.push({
                time: c.time,
                position: "belowBar",
                color: "#00ff66",
                shape: "arrowUp",
                text: "BUY V3"
            });

            buyBreakPrice = null;
        }

        if(sellMove !== null && sellMove >= moveMin && sellMove <= moveMax){
            markers.push({
                time: c.time,
                position: "aboveBar",
                color: "#ff3333",
                shape: "arrowDown",
                text: "SELL V3"
            });

            sellBreakPrice = null;
        }
    }

    setMarkersSafe(markers);

    setText("signal", `✅ Golden Strategy Active | Signals: ${markers.length}`);
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

    if(!candles.length) return;

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

    if(candles.length < 12) return;

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

    if(!candles.length) return;

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