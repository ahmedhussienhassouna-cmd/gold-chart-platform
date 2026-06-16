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
let lastChartUpdate = 0;
let lastStrategyRunTime = 0;

const API_KEY = "2ad0666474114f7787a45ccacffdaf44";

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
    }catch(e){}
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
    }catch(e){}
}

function setMarkersSafe(markers){
    try{
        if(candleSeries && typeof candleSeries.setMarkers === "function"){
            candleSeries.setMarkers(markers);
        }
    }catch(e){}
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
        }catch(e){}
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
    if(currentInterval === "1min") return 300;
    if(currentInterval === "5min") return 300;
    if(currentInterval === "15min") return 300;
    if(currentInterval === "30min") return 250;
    if(currentInterval === "1h") return 200;
    if(currentInterval === "4h") return 150;
    if(currentInterval === "1day") return 120;
    return 300;
}

function roundPrice(price){
    return Number(Number(price).toFixed(2));
}

function createChart(){

    const container = document.getElementById("chart");
    if(!container) return;

    stopWebSocket();
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
            secondsVisible: false,
            borderColor: "#333"
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal
        },
        rightPriceScale: {
            borderColor: "#333",
            autoScale: true
        }
    });

    const candleOptions = {
        upColor: "#26a69a",
        downColor: "#ef5350",
        borderUpColor: "#26a69a",
        borderDownColor: "#ef5350",
        wickUpColor: "#26a69a",
        wickDownColor: "#ef5350",
        priceFormat: {
            type: "price",
            precision: 2,
            minMove: 0.01
        }
    };

    if(chart.addCandlestickSeries){
        candleSeries = chart.addCandlestickSeries(candleOptions);
    } else {
        candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, candleOptions);
    }

    firstLoad = true;
    candlesData = [];

    loadMarketData();
    startWebSocket();
}

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
            open: roundPrice(c.open),
            high: roundPrice(c.high),
            low: roundPrice(c.low),
            close: roundPrice(c.close)
        }));

        candleSeries.setData(candlesData);

        const last = candlesData[candlesData.length - 1];

        setText("priceBox", `${currentAsset} ${last.close.toFixed(2)} | ${currentInterval}`);
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

            const price = roundPrice(msg.price);
            const now = Math.floor(Date.now() / 1000);
            const minuteTime = Math.floor(now / 60) * 60;

            updateLiveCandle(price, minuteTime);

        }catch(error){}
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

    price = roundPrice(price);

    let last = candlesData[candlesData.length - 1];
    let isNewCandle = false;

    if(last.time === time){
        last.close = price;
        last.high = Math.max(last.high, price);
        last.low = Math.min(last.low, price);
    }
    else if(time > last.time){
        last = {
            time: time,
            open: price,
            high: price,
            low: price,
            close: price
        };

        candlesData.push(last);
        isNewCandle = true;

        if(candlesData.length > getOutputSize()){
            candlesData.shift();
        }
    }
    else {
        return;
    }

    const now = Date.now();

    if(now - lastChartUpdate > 700 || isNewCandle){
        candleSeries.update(last);
        setText("priceBox", `${currentAsset} ${price.toFixed(2)} | ${currentInterval}`);
        lastChartUpdate = now;
    }

    if(strategyOn && isNewCandle && time !== lastStrategyRunTime){
        lastStrategyRunTime = time;
        runGoldenStrategy(candlesData);
    }
}

window.changeTimeframe = function(tf){

    currentInterval = tf;

    setText("signal", "Loading timeframe: " + tf);

    clearVWAP();
    clearLines();
    clearStrategy();

    firstLoad = true;
    candlesData = [];

    loadMarketData();
    startWebSocket();
};

function redrawTools(){

    clearLines();
    clearStrategy();
    clearVWAP();

    if(strategyOn) runGoldenStrategy(candlesData);
    if(liquidityOn) drawLiquidity(candlesData);
    if(ibOn) drawIB(candlesData);
    if(vwapOn) drawVWAP(candlesData);
}

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
};

window.service = function(type){

    let msg = {
        daily: "📊 Daily Analysis Selected",
        support: "📍 Support Selected",
        settings: "⚙️ Settings Selected"
    };

    setText("signal", msg[type] || "Waiting...");
};

window.toggleStrategy = function(){

    strategyOn = !strategyOn;

    updatePanel();

    if(!strategyOn){
        clearStrategy();
        setText("signal", "🔴 Strategy OFF");
        return;
    }

    setText("signal", "🟢 Strategy ON");
    runGoldenStrategy(candlesData);
};

function runGoldenStrategy(candles){

    if(!candles || candles.length < 20){
        setText("signal", "Waiting for candles...");
        return;
    }

    clearStrategy();

    const nowCairo = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" })
    );

    if(nowCairo.getHours() < 14){
        setText("signal", "⏳ Strategy appears after 2:00 PM Cairo");
        return;
    }

    const lastCandle = candles[candles.length - 1];

    const lastCairo = new Date(
        new Date(lastCandle.time * 1000).toLocaleString("en-US", {
            timeZone: "Africa/Cairo"
        })
    );

    const targetYear = lastCairo.getFullYear();
    const targetMonth = lastCairo.getMonth();
    const targetDay = lastCairo.getDate();

    const zoneCandles = candles.filter(c => {

        const cairoDate = new Date(
            new Date(c.time * 1000).toLocaleString("en-US", {
                timeZone: "Africa/Cairo"
            })
        );

        return (
            cairoDate.getFullYear() === targetYear &&
            cairoDate.getMonth() === targetMonth &&
            cairoDate.getDate() === targetDay &&
            cairoDate.getHours() === 13
        );
    });

    if(zoneCandles.length < 1){
        setText("signal", "No data from 1:00 PM to 2:00 PM Cairo");
        return;
    }

    const zoneHigh = roundPrice(Math.max(...zoneCandles.map(c => c.high)));
    const zoneLow  = roundPrice(Math.min(...zoneCandles.map(c => c.low)));

    strategyLines.push(
        candleSeries.createPriceLine({
            price: zoneHigh,
            color: "#00ff66",
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Solid,
            axisLabelVisible: true,
            title: "1-2 PM High"
        })
    );

    strategyLines.push(
        candleSeries.createPriceLine({
            price: zoneLow,
            color: "#ff3333",
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Solid,
            axisLabelVisible: true,
            title: "1-2 PM Low"
        })
    );

    setText("signal", `✅ Strategy | 1-2 PM Cairo | High: ${zoneHigh} | Low: ${zoneLow}`);
}

window.toggleLiquidity = function(){

    liquidityOn = !liquidityOn;

    setText("signal", liquidityOn ? "💧 Liquidity ON" : "💧 Liquidity OFF");

    updatePanel();
    redrawTools();
};

function drawLiquidity(candles){

    if(!candles.length) return;

    const lastCandle = candles[candles.length - 1];
    const lastDate = new Date(lastCandle.time * 1000).toDateString();

    const todayCandles = candles.filter(c => {
        return new Date(c.time * 1000).toDateString() === lastDate;
    });

    const usedCandles = todayCandles.length ? todayCandles : candles;

    const highLevel = roundPrice(Math.max(...usedCandles.map(c => c.high)));
    const lowLevel = roundPrice(Math.min(...usedCandles.map(c => c.low)));

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

window.toggleIB = function(){

    ibOn = !ibOn;

    setText("signal", ibOn ? "📦 IB Zone ON" : "📦 IB Zone OFF");

    updatePanel();
    redrawTools();
};

function drawIB(candles){

    if(candles.length < 20) return;

    const lastCandle = candles[candles.length - 1];
    const lastDate = new Date(lastCandle.time * 1000).toDateString();

    const todayCandles = candles.filter(c => {
        return new Date(c.time * 1000).toDateString() === lastDate;
    });

    if(todayCandles.length < 12) return;

    const ibCandles = todayCandles.slice(0, 12);

    const ibHigh = roundPrice(Math.max(...ibCandles.map(c => c.high)));
    const ibLow = roundPrice(Math.min(...ibCandles.map(c => c.low)));

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
        lineWidth: 2,
        priceFormat: {
            type: "price",
            precision: 2,
            minMove: 0.01
        }
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
            value: roundPrice(cumulativePV / cumulativeVolume)
        };
    });

    vwapSeries.setData(vwapData);
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
    createChart();
    updatePanel();
    updateSession();
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
