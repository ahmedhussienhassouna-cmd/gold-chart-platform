let currentTheme = localStorage.getItem("theme") || "dark";
let currentAsset = "GOLD";
let currentGranularity = "M1";

let strategyOn = false;
let liquidityOn = false;
let ibOn = false;

let asiaSessionOn = false;
let europeSessionOn = false;
let americaSessionOn = false;
let vwapOn = false;
let sessionProfileOn = false;

let lastPrice = null;
let currentLiveCandle = null;

let oandaChart = null;
let candleSeries = null;
let vwapSeries = null;
let resizeTimer = null;

let drawingMode = "cursor";
let drawings = [];
let priceLineDrawings = [];
let strategyLines = [];
let candlesData = [];

let pendingPoint = null;
let drawingsLocked = false;
let drawingsVisible = true;
let magnetMode = false;
let drawingSvg = null;
let sessionSvg = null;

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
    const asiaBtn = document.getElementById("asiaSessionBtn");
if(asiaBtn){
    asiaBtn.innerHTML = asiaSessionOn ? "✅ Session Asia ON" : "🟢 Session Asia";
}

const europeBtn = document.getElementById("europeSessionBtn");
if(europeBtn){
    europeBtn.innerHTML = europeSessionOn ? "✅ Session Europe ON" : "🔵 Session Europe";
}

const americaBtn = document.getElementById("americaSessionBtn");
if(americaBtn){
    americaBtn.innerHTML = americaSessionOn ? "✅ Session America ON" : "🔴 Session America";
}
    setText("panelVWAP", vwapOn ? "ON" : "OFF");

    const btn = document.getElementById("strategyBtn");
    if(btn){
        btn.innerHTML = strategyOn ? "✅ Strategy ON" : "💰 Strategy";
    }

    const themeBtn = document.getElementById("themeBtn");
    if(themeBtn){
        themeBtn.innerHTML = currentTheme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
    }
}

function applyPageTheme(){
    document.body.classList.remove("darkTheme", "lightTheme");
    document.body.classList.add(currentTheme === "dark" ? "darkTheme" : "lightTheme");
}

function setActiveTimeframeButton(){
    ["M1","M5","M15","H1","H4","D"].forEach(tf => {
        const btn = document.getElementById("tf-" + tf);
        if(btn) btn.classList.toggle("active", tf === currentGranularity);
    });
}

function setActiveToolButton(){
["cursor","trend","horizontal","vertical","rectangle","arrow","text","fib","elliott"].forEach(tool => {
        const btn = document.getElementById("tool-" + tool);
        if(btn) btn.classList.toggle("active", tool === drawingMode);
    });

    const magnet = document.getElementById("tool-magnet");
    if(magnet) magnet.classList.toggle("active", magnetMode);

    const lock = document.getElementById("tool-lock");
    if(lock) lock.classList.toggle("active", drawingsLocked);

    const eye = document.getElementById("tool-eye");
    if(eye) eye.classList.toggle("active", drawingsVisible);
}

function svgEl(type, attrs){
    const el = document.createElementNS("http://www.w3.org/2000/svg", type);
    Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k, v));
    return el;
}

// =======================
// VWAP
// =======================
function calculateVWAP(candles){
    let cumulativePV = 0;
    let cumulativeVolume = 0;
    const vwapData = [];

    candles.forEach(c => {
        const typicalPrice = (c.high + c.low + c.close) / 3;
        const volume = c.volume || 1;

        cumulativePV += typicalPrice * volume;
        cumulativeVolume += volume;

        vwapData.push({
            time: c.time,
            value: cumulativePV / cumulativeVolume
        });
    });

    return vwapData;
}

// =======================
// STRATEGY LINES
// =======================
function clearStrategyLines(){
    if(!candleSeries) return;

    strategyLines.forEach(line => {
        candleSeries.removePriceLine(line);
    });

    strategyLines = [];
}
let activeStrategySetup = null;
let strategySignalDrawings = [];
function drawStrategyZone(high, low, buyTp1, buyTp2, sellTp1, sellTp2){
    if(!candleSeries) return;

    clearStrategyLines();

    const styleSolid = LightweightCharts.LineStyle.Solid;

    const highLine = candleSeries.createPriceLine({
        price: high,
color: "#008cff",
        lineWidth: 4,
        lineStyle: styleSolid,
        axisLabelVisible: true,
        title: "HIGH - بعد كسر وثبات المستوى"
    });

    const buyTp1Line = candleSeries.createPriceLine({
        price: buyTp1,
color: "#00ff88",
        lineWidth: 4,
        lineStyle: styleSolid,
        axisLabelVisible: true,
        title: "🎯 هدف أول BUY TP1"
    });

    const buyTp2Line = candleSeries.createPriceLine({
        price: buyTp2,
color: "#00ff88",
        lineWidth: 4,
        lineStyle: styleSolid,
        axisLabelVisible: true,
        title: "🎯 هدف ثاني BUY TP2"
    });

    const lowLine = candleSeries.createPriceLine({
        price: low,
color: "#ff2d2d",
        lineWidth: 4,
        lineStyle: styleSolid,
        axisLabelVisible: true,
        title: "LOW - بعد كسر وثبات المستوى"
    });

    const sellTp1Line = candleSeries.createPriceLine({
        price: sellTp1,
color: "#00ff88",
        lineWidth: 4,
        lineStyle: styleSolid,
        axisLabelVisible: true,
        title: "🎯 هدف أول SELL TP1"
    });

    const sellTp2Line = candleSeries.createPriceLine({
        price: sellTp2,
color: "#00ff88",
        lineWidth: 4,
        lineStyle: styleSolid,
        axisLabelVisible: true,
        title: "🎯 هدف ثاني SELL TP2"
    });

    strategyLines.push(
        highLine,
        buyTp1Line,
        buyTp2Line,
        lowLine,
        sellTp1Line,
        sellTp2Line
    );
document.querySelectorAll(".strategyArea").forEach(el => el.remove());

drawStrategyArea(high, "rgba(0,140,255,0.18)", "منطقة شراء");
drawStrategyArea(low, "rgba(255,45,45,0.18)", "منطقة بيع");
    setText(
        "signal",
        `✅ Strategy Zone Drawn<br><br>
        🔴 HIGH: ${high}<br>
        بعد كسر وثبات المستوى<br>
        🎯 هدف أول: ${buyTp1}<br>
        🎯 هدف ثاني: ${buyTp2}<br><br>

        🔵 LOW: ${low}<br>
        بعد كسر وثبات المستوى<br>
        🎯 هدف أول: ${sellTp1}<br>
        🎯 هدف ثاني: ${sellTp2}`
    );
}
function drawStrategyArea(price, color, text){
    if(!drawingSvg || !candleSeries) return;

    const chartBox = document.getElementById("oandaChart");
    if(!chartBox) return;

    const y = candleSeries.priceToCoordinate(price);
    if(y == null) return;

    const height = 34;
    const top = y - height / 2;

    const rect = svgEl("rect", {
        class: "strategyArea",
        x: 0,
        y: top,
        width: chartBox.clientWidth,
        height: height,
        fill: color,
        stroke: color.replace("0.18", "0.95"),
        "stroke-width": 2,
        rx: 6
    });

    const label = svgEl("text", {
        class: "strategyArea",
        x: chartBox.clientWidth / 2,
        y: y + 6,
        fill: "#ffffff",
        "font-size": "16",
        "font-weight": "bold",
        "text-anchor": "middle"
    });

    label.textContent = text;

    drawingSvg.insertBefore(rect, drawingSvg.firstChild);
    drawingSvg.appendChild(label);
}
function redrawStrategyAreas(){
    if(!strategyOn || !activeStrategySetup) return;

    document.querySelectorAll(".strategyArea").forEach(el => el.remove());

    drawStrategyArea(activeStrategySetup.high, "rgba(0,140,255,0.18)", "منطقة شراء");
    drawStrategyArea(activeStrategySetup.low, "rgba(255,45,45,0.18)", "منطقة بيع");
}

function drawStrategySignal(type, entry, stop){
    if(!drawingSvg || !oandaChart || !candleSeries) return;

    const lastTime = currentLiveCandle ? currentLiveCandle.time : null;
    if(!lastTime) return;

    const x = oandaChart.timeScale().timeToCoordinate(lastTime);
    const y = candleSeries.priceToCoordinate(entry);

    if(x == null || y == null) return;

    const label = svgEl("text", {
        x: x - 40,
        y: y - 18,
        fill: type === "BUY" ? "#00ff88" : "#ff4d4d",
        "font-size": "20",
        "font-weight": "bold"
    });

    label.textContent = type === "BUY"
        ? `BUY | SL ${stop}`
        : `SELL | SL ${stop}`;

    drawingSvg.appendChild(label);
    strategySignalDrawings.push(label);
}
function checkBreakRetestSignal(price){
    if(!activeStrategySetup || !price) return;

    const high = activeStrategySetup.high;
    const low = activeStrategySetup.low;

    const moveMin = 7;
    const moveMax = 10;
    const retestGap = 0.50;

    if(activeStrategySetup.buyDone !== true){

        if(price >= high + moveMin && price <= high + moveMax){
            activeStrategySetup.buyReady = true;
        }

        if(activeStrategySetup.buyReady && Math.abs(price - high) <= retestGap){
            activeStrategySetup.buyDone = true;

            drawStrategySignal("BUY", high, low);

            setText(
                "signal",
                `✅ BUY Signal<br>
                Entry Retest: ${high}<br>
                Stop Loss: ${low}<br>
                شرط الدخول تحقق: كسر HIGH + حركة 7$ إلى 10$ + رجوع لإعادة الاختبار`
            );
        }
    }

    if(activeStrategySetup.sellDone !== true){

        if(price <= low - moveMin && price >= low - moveMax){
            activeStrategySetup.sellReady = true;
        }

        if(activeStrategySetup.sellReady && Math.abs(price - low) <= retestGap){
            activeStrategySetup.sellDone = true;

            drawStrategySignal("SELL", low, high);

            setText(
                "signal",
                `✅ SELL Signal<br>
                Entry Retest: ${low}<br>
                Stop Loss: ${high}<br>
                شرط الدخول تحقق: كسر LOW + حركة 7$ إلى 10$ + رجوع لإعادة الاختبار`
            );
        }
    }
}
function scanPastBreakRetest(){
    if(!activeStrategySetup || !candlesData.length) return;

    const high = activeStrategySetup.high;
    const low = activeStrategySetup.low;

    const moveMin = 7;
    const moveMax = 10;
    const retestGap = 0.80;

    let buyReady = false;
    let sellReady = false;

    const recentCandles = candlesData.slice(-300);

    recentCandles.forEach(c => {

        if(!activeStrategySetup.buyDone){
            if(c.high >= high + moveMin && c.high <= high + moveMax){
                buyReady = true;
            }

            if(buyReady && c.low <= high + retestGap && c.high >= high - retestGap){
                activeStrategySetup.buyDone = true;
                drawStrategySignal("BUY", high, low);
            }
        }

        if(!activeStrategySetup.sellDone){
            if(c.low <= low - moveMin && c.low >= low - moveMax){
                sellReady = true;
            }

            if(sellReady && c.high >= low - retestGap && c.low <= low + retestGap){
                activeStrategySetup.sellDone = true;
                drawStrategySignal("SELL", low, high);
            }
        }
    });
}
// =======================
// LIVE PRICE
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
        const mid = Number(((bid + ask) / 2).toFixed(2));

        lastPrice = mid;
        setText("priceBox", `🥇 XAUUSD Live: ${mid}`);

        updateLiveCandle(mid);

    }catch(error){
        console.error(error);
        setText("priceBox", "OANDA disconnected");
    }
}

function getCurrentCandleTime(){
    const now = Date.now();

    const map = {
        M1: 60 * 1000,
        M5: 5 * 60 * 1000,
        M15: 15 * 60 * 1000,
        H1: 60 * 60 * 1000,
        H4: 4 * 60 * 60 * 1000,
        D: 24 * 60 * 60 * 1000
    };

    const frameMs = map[currentGranularity] || 60 * 1000;
    return Math.floor(now / frameMs) * frameMs / 1000;
}

function updateLiveCandle(price){
    if(!candleSeries) return;

    const candleTime = getCurrentCandleTime();

    if(!currentLiveCandle || currentLiveCandle.time !== candleTime){
        currentLiveCandle = {
            time: candleTime,
            open: price,
            high: price,
            low: price,
            close: price
        };
    }else{
        currentLiveCandle.high = Math.max(currentLiveCandle.high, price);
        currentLiveCandle.low = Math.min(currentLiveCandle.low, price);
        currentLiveCandle.close = price;
    }

    candleSeries.update(currentLiveCandle);
    checkBreakRetestSignal(price);
}

// =======================
// CANDLES
// =======================
async function loadOandaCandles(){
    try{
        const url = `/api/candles?granularity=${currentGranularity}&count=5000`;
        const res = await fetch(url);
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
                close: Number(c.mid.c),
                volume: Number(c.volume || 1)
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

    const chartBox = document.getElementById("oandaChart");
    if(!chartBox) return;

    chartBox.innerHTML = "";
    chartBox.style.width = "100%";
    chartBox.style.height = "100%";
    chartBox.style.position = "relative";

    strategyLines = [];
    priceLineDrawings = [];
    vwapSeries = null;
    drawingSvg = null;
    sessionSvg = null;
    candlesData = [];

    if(typeof LightweightCharts === "undefined"){
        setText("signal", "Lightweight Charts library not loaded");
        return;
    }

    const container = document.getElementById("chart");
    const rect = container.getBoundingClientRect();

    oandaChart = LightweightCharts.createChart(chartBox, {
        width: Math.max(rect.width, 600),
        height: Math.max(rect.height, 400),
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
            borderColor: "#333",
            autoScale: true
        },
        timeScale: {
            borderColor: "#333",
            timeVisible: true,
            secondsVisible: false,
rightOffset: 60,
barSpacing: 16,
fixRightEdge: false
        },
        handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: true
        },
        handleScale: {
            axisPressedMouseMove: true,
            mouseWheel: true,
            pinch: true
        }
    });

    candleSeries = oandaChart.addCandlestickSeries({
        upColor: "#00ff99",
        downColor: "#ff4d4d",
        borderUpColor: "#00ff99",
        borderDownColor: "#ff4d4d",
        wickUpColor: "#00ff99",
        wickDownColor: "#ff4d4d",
        priceLineVisible: true,
        lastValueVisible: true
    });

    vwapSeries = oandaChart.addLineSeries({
        color: "#ffd700",
        lineWidth: 2,
        title: "VWAP",
        visible: vwapOn,
        priceLineVisible: false,
        lastValueVisible: true
    });

    createSessionProfileLayer();
    createDrawingLayer();

    const candles = await loadOandaCandles();

    if(candles.length){
        candlesData = candles;

        candleSeries.setData(candles);

        const vwapData = calculateVWAP(candles);
        vwapSeries.setData(vwapData);

        renderSessionProfile();


        const lastCandle = candles[candles.length - 1];

        currentLiveCandle = {
            time: getCurrentCandleTime(),
            open: lastCandle.close,
            high: lastCandle.close,
            low: lastCandle.close,
            close: lastCandle.close
        };

oandaChart.timeScale().applyOptions({
    barSpacing: 18,
    rightOffset: 60,
    fixRightEdge: false
});

oandaChart.timeScale().setVisibleLogicalRange({
    from: candles.length - 120,
    to: candles.length + 60
});

        setText("signal", `✅ GOLD OANDA Chart Loaded | TF: ${currentGranularity}`);
    }else{
        setText("signal", "No OANDA candles found");
    }

    setupContextMenu();
    setupDrawingEvents();
    setActiveTimeframeButton();
    setActiveToolButton();

oandaChart.timeScale().subscribeVisibleTimeRangeChange(() => {
    renderSessionProfile();
    redrawSessionIBFill();
    renderDrawings();
    refreshStrategyAreasLive();
});
}

// =======================
// SESSION PROFILE
// =======================
function createSessionProfileLayer(){
    const chartBox = document.getElementById("oandaChart");
    if(!chartBox) return;

    sessionSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    sessionSvg.setAttribute("id", "sessionSvg");
    sessionSvg.style.position = "absolute";
    sessionSvg.style.left = "0";
    sessionSvg.style.top = "0";
    sessionSvg.style.width = "100%";
    sessionSvg.style.height = "100%";
    sessionSvg.style.zIndex = "20";
    sessionSvg.style.pointerEvents = "none";

    chartBox.appendChild(sessionSvg);
}

function getCairoParts(unixTime){
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Cairo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });

    const parts = formatter.formatToParts(new Date(unixTime * 1000));
    const obj = {};

    parts.forEach(p => {
        obj[p.type] = p.value;
    });

    return {
        year: obj.year,
        month: obj.month,
        day: obj.day,
        hour: Number(obj.hour),
        minute: Number(obj.minute)
    };
}

function getSessionNameFromTime(unixTime){
    const p = getCairoParts(unixTime);
    const current = p.hour + p.minute / 60;

    if(current >= 1 && current < 3) return "Sydney";
    if(current >= 3 && current < 10) return "Asia";
    if(current >= 10 && current < 15.5) return "London";
    if(current >= 15.5 && current < 23) return "New York";

    return "Closed";
}

function getSessionColor(name){
    if(name === "Asia") return "rgba(33,150,243,0.12)";
    if(name === "London") return "rgba(76,175,80,0.12)";
    if(name === "New York") return "rgba(255,152,0,0.12)";
    if(name === "Sydney") return "rgba(156,39,176,0.12)";
    return "rgba(255,215,0,0.08)";
}

function getSessionLineColor(name){
    if(name === "Asia") return "#2196f3";
    if(name === "London") return "#4caf50";
    if(name === "New York") return "#ff9800";
    if(name === "Sydney") return "#9c27b0";
    return "#ffd700";
}

function buildSessionGroups(candles){
    const groups = [];
    let current = null;

    candles.forEach(c => {
        const name = getSessionNameFromTime(c.time);
        if(name === "Closed") return;

        const p = getCairoParts(c.time);
        const key = `${p.year}-${p.month}-${p.day}-${name}`;

        if(!current || current.key !== key){
            current = {
                key,
                name,
                start: c.time,
                end: c.time,
                high: c.high,
                low: c.low,
                candles: []
            };
            groups.push(current);
        }

        current.end = c.time;
        current.high = Math.max(current.high, c.high);
        current.low = Math.min(current.low, c.low);
        current.candles.push(c);
    });

    return groups;
}

function calculateSessionPOC(group){
    const rows = 40;
    const min = group.low;
    const max = group.high;
    const step = (max - min) / rows;

    if(step <= 0) return null;

    const dist = new Array(rows).fill(0);

    group.candles.forEach(c => {
        const volume = c.volume || 1;
        let lowIndex = Math.floor((c.low - min) / step);
        let highIndex = Math.floor((c.high - min) / step);

        lowIndex = Math.max(0, Math.min(rows - 1, lowIndex));
        highIndex = Math.max(0, Math.min(rows - 1, highIndex));

        const count = highIndex - lowIndex + 1;
        const part = volume / count;

        for(let i = lowIndex; i <= highIndex; i++){
            dist[i] += part;
        }
    });

    let maxVol = -1;
    let index = 0;

    dist.forEach((v, i) => {
        if(v > maxVol){
            maxVol = v;
            index = i;
        }
    });

    return min + (index + 0.5) * step;
}

function renderSessionProfile(){
    if(!sessionSvg || !oandaChart || !candleSeries) return;

    sessionSvg.innerHTML = "";

    if(!sessionProfileOn || !candlesData.length) return;

    const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Africa/Cairo"
    });

    const groups = buildSessionGroups(candlesData).filter(g => {
        return g.key.startsWith(today);
    });

    groups.forEach(g => {
        const x1 = oandaChart.timeScale().timeToCoordinate(g.start);
        const x2 = oandaChart.timeScale().timeToCoordinate(g.end);
        const yHigh = candleSeries.priceToCoordinate(g.high);
        const yLow = candleSeries.priceToCoordinate(g.low);

        if(x1 == null || x2 == null || yHigh == null || yLow == null) return;

        const left = Math.min(x1, x2);
        const width = Math.max(10, Math.abs(x2 - x1));
        const top = Math.min(yHigh, yLow);
        const height = Math.abs(yLow - yHigh);

        const fillColor = getSessionColor(g.name);
        const lineColor = getSessionLineColor(g.name);

        sessionSvg.appendChild(svgEl("rect", {
            x: left,
            y: top,
            width: width,
            height: height,
            fill: fillColor,
            stroke: lineColor,
            "stroke-width": 1
        }));

        sessionSvg.appendChild(svgEl("line", {
            x1: left,
            y1: yHigh,
            x2: left + width,
            y2: yHigh,
            stroke: lineColor,
            "stroke-width": 1
        }));

        sessionSvg.appendChild(svgEl("line", {
            x1: left,
            y1: yLow,
            x2: left + width,
            y2: yLow,
            stroke: lineColor,
            "stroke-width": 1
        }));

        const pocPrice = calculateSessionPOC(g);
        const yPOC = pocPrice ? candleSeries.priceToCoordinate(pocPrice) : null;

        if(yPOC != null){
            sessionSvg.appendChild(svgEl("line", {
                x1: left,
                y1: yPOC,
                x2: left + width,
                y2: yPOC,
                stroke: "#ffd700",
                "stroke-width": 2,
                "stroke-dasharray": "5 5"
            }));
        }

        const text = svgEl("text", {
            x: left + 5,
            y: top + 16,
            fill: lineColor,
            "font-size": "12",
            "font-weight": "bold"
        });

        text.textContent = g.name;
        sessionSvg.appendChild(text);
    });
}

window.toggleSessionProfile = function(){
    sessionProfileOn = !sessionProfileOn;
    renderSessionProfile();

    setText(
        "signal",
        sessionProfileOn ? "📊 Session Profile ON" : "📊 Session Profile OFF"
    );
};

// =======================
// DRAWING LAYER
// =======================
function createDrawingLayer(){
    const chartBox = document.getElementById("oandaChart");
    if(!chartBox) return;

    drawingSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    drawingSvg.setAttribute("id", "drawingSvg");
    drawingSvg.style.position = "absolute";
    drawingSvg.style.left = "0";
    drawingSvg.style.top = "0";
    drawingSvg.style.width = "100%";
    drawingSvg.style.height = "100%";
    drawingSvg.style.zIndex = "30";
drawingSvg.style.pointerEvents = "none";
    drawingSvg.style.display = drawingsVisible ? "block" : "none";

    chartBox.appendChild(drawingSvg);

    renderDrawings();
}

function chartPointFromMouse(e){
    const chartBox = document.getElementById("oandaChart");
    const rect = chartBox.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const price = candleSeries.coordinateToPrice(y);
    const logical = oandaChart.timeScale().coordinateToLogical(x);

    if(price == null || logical == null) return null;

    return {
        x,
        y,
        price: Number(price),
        logical: Number(logical),
        time: oandaChart.timeScale().coordinateToTime(x)
    };
}

function coordinateFromPoint(point){
    if(!oandaChart || !candleSeries || !point) return null;

    let x = null;

    if(point.logical != null && typeof oandaChart.timeScale().logicalToCoordinate === "function"){
        x = oandaChart.timeScale().logicalToCoordinate(point.logical);
    }

    if(x == null && point.time != null){
        x = oandaChart.timeScale().timeToCoordinate(point.time);
    }

    const y = candleSeries.priceToCoordinate(point.price);

    if(x == null || y == null) return null;

    return { x, y };
}

function renderDrawings(){
    if(!drawingSvg) return;

    drawingSvg.innerHTML = "";

    if(!drawingsVisible) return;

    drawings.forEach(d => {
        if(d.type === "trend" || d.type === "arrow"){
            const p1 = coordinateFromPoint(d.points[0]);
            const p2 = coordinateFromPoint(d.points[1]);
            if(!p1 || !p2) return;

            drawingSvg.appendChild(svgEl("line", {
                x1:p1.x, y1:p1.y,
                x2:p2.x, y2:p2.y,
                stroke:d.color || "#ffd700",
                "stroke-width":2,
                "stroke-linecap":"round"
            }));

            if(d.type === "arrow"){
                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                const size = 10;
                const a1 = angle - Math.PI / 6;
                const a2 = angle + Math.PI / 6;

                drawingSvg.appendChild(svgEl("line", {
                    x1:p2.x, y1:p2.y,
                    x2:p2.x - size * Math.cos(a1),
                    y2:p2.y - size * Math.sin(a1),
                    stroke:d.color || "#ffd700",
                    "stroke-width":2
                }));

                drawingSvg.appendChild(svgEl("line", {
                    x1:p2.x, y1:p2.y,
                    x2:p2.x - size * Math.cos(a2),
                    y2:p2.y - size * Math.sin(a2),
                    stroke:d.color || "#ffd700",
                    "stroke-width":2
                }));
            }
        }

        if(d.type === "vertical"){
            const p = coordinateFromPoint(d.points[0]);
            if(!p) return;

            drawingSvg.appendChild(svgEl("line", {
                x1:p.x, y1:0,
                x2:p.x, y2:"100%",
                stroke:d.color || "#ffd700",
                "stroke-width":2,
                "stroke-dasharray":"6 6"
            }));
        }

        if(d.type === "rectangle"){
            const p1 = coordinateFromPoint(d.points[0]);
            const p2 = coordinateFromPoint(d.points[1]);
            if(!p1 || !p2) return;

            drawingSvg.appendChild(svgEl("rect", {
                x: Math.min(p1.x, p2.x),
                y: Math.min(p1.y, p2.y),
                width: Math.abs(p2.x - p1.x),
                height: Math.abs(p2.y - p1.y),
                fill:"rgba(255,215,0,.12)",
                stroke:"#ffd700",
                "stroke-width":2
            }));
        }

        if(d.type === "text"){
            const p = coordinateFromPoint(d.points[0]);
            if(!p) return;

            const text = svgEl("text", {
                x:p.x,
                y:p.y,
                fill:"#ffd700",
                "font-size":"16",
                "font-weight":"bold"
            });

            text.textContent = d.text || "Text";
            drawingSvg.appendChild(text);
                }
    });

    redrawStrategyAreas();
}

// =======================
// TOOLS
// =======================
window.setDrawingTool = function(tool){
    drawingMode = tool;
    pendingPoint = null;

    setActiveToolButton();

    const menu = document.getElementById("chartContextMenu");
    if(menu) menu.style.display = "none";

    setText("signal", tool === "cursor" ? "Cursor Mode" : `Tool Selected: ${tool}`);
};

window.enableHorizontalLine = function(){
    window.setDrawingTool("horizontal");
};

window.toggleMagnet = function(){
    magnetMode = !magnetMode;
    setActiveToolButton();
    setText("signal", magnetMode ? "Magnet ON" : "Magnet OFF");
};

window.toggleLockDrawings = function(){
    drawingsLocked = !drawingsLocked;
    setActiveToolButton();
    setText("signal", drawingsLocked ? "Drawings Locked" : "Drawings Unlocked");
};

window.toggleDrawingsVisibility = function(){
    drawingsVisible = !drawingsVisible;

    if(drawingSvg){
        drawingSvg.style.display = drawingsVisible ? "block" : "none";
    }

    setActiveToolButton();
    setText("signal", drawingsVisible ? "Drawings Visible" : "Drawings Hidden");
};

function addHorizontalLine(price){
    if(!candleSeries) return;

    const line = candleSeries.createPriceLine({
        price: price,
        color: "#ffd700",
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Solid,
        axisLabelVisible: true,
        title: "Golden Line"
    });

    priceLineDrawings.push(line);
    setText("signal", `Horizontal Line Added: ${price.toFixed(2)}`);
}

window.clearDrawings = function(){
    if(candleSeries){
        priceLineDrawings.forEach(line => {
            candleSeries.removePriceLine(line);
        });
    }

    priceLineDrawings = [];
    drawings = [];
    pendingPoint = null;

    renderDrawings();

    const menu = document.getElementById("chartContextMenu");
    if(menu) menu.style.display = "none";

    setText("signal", "All Drawings Cleared");
};

function setupDrawingEvents(){
    const chartBox = document.getElementById("oandaChart");
    if(!chartBox) return;

    chartBox.onmousedown = function(e){
        if(drawingsLocked) return;
        if(drawingMode === "cursor") return;

        e.preventDefault();
        e.stopPropagation();

        const point = chartPointFromMouse(e);
        if(!point){
            setText("signal", "Drawing point error");
            return;
        }

        if(drawingMode === "horizontal"){
            addHorizontalLine(point.price);
            drawingMode = "cursor";
            setActiveToolButton();
            return;
        }

        if(drawingMode === "vertical"){
            drawings.push({
                type:"vertical",
                points:[point],
                color:"#ffd700"
            });

            renderDrawings();
            drawingMode = "cursor";
            setActiveToolButton();
            return;
        }

        if(drawingMode === "text"){
            const text = prompt("Write text on chart:");
            if(text){
                drawings.push({
                    type:"text",
                    points:[point],
                    text,
                    color:"#ffd700"
                });
                renderDrawings();
            }

            drawingMode = "cursor";
            setActiveToolButton();
            return;
        }

        if(["trend","rectangle","arrow"].includes(drawingMode)){
            if(!pendingPoint){
                pendingPoint = point;
                setText("signal", "Select second point...");
                return;
            }

            drawings.push({
                type:drawingMode,
                points:[pendingPoint, point],
                color:"#ffd700"
            });

            pendingPoint = null;
            renderDrawings();

            drawingMode = "cursor";
            setActiveToolButton();
        }
    };
}

function setupContextMenu(){
    const chartArea = document.getElementById("chart");
    const chartBox = document.getElementById("oandaChart");
    const menu = document.getElementById("chartContextMenu");

    if(!chartArea || !chartBox || !menu) return;

    menu.style.display = "none";

    chartArea.oncontextmenu = function(e){
        e.preventDefault();
        e.stopPropagation();

        const rect = chartArea.getBoundingClientRect();

        menu.style.display = "block";
        menu.style.position = "absolute";
        menu.style.left = (e.clientX - rect.left) + "px";
        menu.style.top = (e.clientY - rect.top) + "px";
        menu.style.zIndex = "999999";

        return false;
    };

    menu.onclick = function(e){
        e.stopPropagation();
    };

    document.addEventListener("click", function(e){
        if(menu.style.display === "block" && !menu.contains(e.target)){
            menu.style.display = "none";
        }
    });

    document.addEventListener("keydown", function(e){
        if(e.key === "Escape"){
            menu.style.display = "none";
        }
    });
}

// =======================
// TIMEFRAMES
// =======================
window.changeTimeframe = async function(tf){
    currentGranularity = tf;
    currentLiveCandle = null;

    setActiveTimeframeButton();
    setText("signal", `Loading timeframe ${tf}...`);

  await createChart();
await loadOandaPrice();

if(strategyOn && activeStrategySetup){
    drawStrategyZone(
        activeStrategySetup.high,
        activeStrategySetup.low,
        activeStrategySetup.buyTp1,
        activeStrategySetup.buyTp2,
        activeStrategySetup.sellTp1,
        activeStrategySetup.sellTp2
    );
}
};

// =======================
// ZOOM
// =======================
window.zoomIn = function(){
    if(!oandaChart) return;
    const timeScale = oandaChart.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if(!range) return;

    const center = (range.from + range.to) / 2;
    const size = (range.to - range.from) * 0.7;

    timeScale.setVisibleLogicalRange({
        from: center - size / 2,
        to: center + size / 2
    });
};

window.zoomOut = function(){
    if(!oandaChart) return;
    const timeScale = oandaChart.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if(!range) return;

    const center = (range.from + range.to) / 2;
    const size = (range.to - range.from) * 1.4;

    timeScale.setVisibleLogicalRange({
        from: center - size / 2,
        to: center + size / 2
    });
};

window.resetChart = function(){
    if(oandaChart){
        oandaChart.timeScale().fitContent();
    }

    const menu = document.getElementById("chartContextMenu");
    if(menu) menu.style.display = "none";
};

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
        clearStrategyLines();
        activeStrategySetup = null;
strategySignalDrawings = [];
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

        const buyTp1 = Number(levels.buyTp1 || levels.tp1);
const buyTp2 = Number(levels.buyTp2 || levels.tp2);

const sellTp1 = Number(levels.sellTp1 || levels.tp3);
const sellTp2 = Number(levels.sellTp2 || levels.tp4);

        const message = levels.message || "Golden Trade Strategy";

drawStrategyZone(high, low, buyTp1, buyTp2, sellTp1, sellTp2);
activeStrategySetup = {
    high,
    low,
    buyTp1,
    buyTp2,
    sellTp1,
    sellTp2,
    buyReady:false,
    sellReady:false,
    buyDone:false,
    sellDone:false
};
scanPastBreakRetest();

setText(
    "signal",
    `✅ ${message}<br><br>

    🔴 HIGH: ${high}<br>
    بعد كسر وثبات المستوى<br>
    🎯 هدف أول: ${buyTp1}<br>
    🎯 هدف ثاني: ${buyTp2}<br><br>

    🔵 LOW: ${low}<br>
    بعد كسر وثبات المستوى<br>
    🎯 هدف أول: ${sellTp1}<br>
    🎯 هدف ثاني: ${sellTp2}<br><br>

    Live Price: ${lastPrice || "Loading..."}`
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

// =======================
// LIGHT SESSION IB - NO LAG
// =======================

let sessionIBLines = [];
let sessionIBFillDrawings = [];

function clearSessionIB(){
    if(candleSeries){
        sessionIBLines.forEach(line => {
            try{
                candleSeries.removePriceLine(line);
            }catch(e){}
        });
    }

    sessionIBLines = [];

    if(drawingSvg){
        sessionIBFillDrawings.forEach(el => {
            try{
                el.remove();
            }catch(e){}
        });
    }

    sessionIBFillDrawings = [];
}

function getSessionIBConfig(name){
    if(name === "Asia"){
        return {
            name: "Asia",
            startHour: 3,
            endHour: 4,
            color: "#2196f3",
            fill: "rgba(33,150,243,0.10)"
        };
    }

    if(name === "Europe"){
        return {
            name: "Europe",
            startHour: 10,
            endHour: 11,
            color: "#4caf50",
            fill: "rgba(76,175,80,0.10)"
        };
    }

    if(name === "America"){
        return {
            name: "America",
            startHour: 15.5,
            endHour: 16.5,
            color: "#ff3333",
            fill: "rgba(255,51,51,0.10)"
        };
    }

    return null;
}

function getLastSessionIBCandles(sessionName){
    const config = getSessionIBConfig(sessionName);
    if(!config || !candlesData.length) return [];

    const grouped = {};

    candlesData.forEach(c => {
        const p = getCairoParts(c.time);
        const current = p.hour + p.minute / 60;

        if(current >= config.startHour && current < config.endHour){
            const key = `${p.year}-${p.month}-${p.day}`;
            if(!grouped[key]) grouped[key] = [];
            grouped[key].push(c);
        }
    });

    const keys = Object.keys(grouped).sort();

    if(!keys.length) return [];

    return grouped[keys[keys.length - 1]];
}

function drawSessionIBFill(sessionName, ibCandles, high, low){
    if(!drawingSvg || !oandaChart || !candleSeries || !ibCandles.length) return;

    const config = getSessionIBConfig(sessionName);
    if(!config) return;

    const startTime = ibCandles[0].time;
    const endTime = ibCandles[ibCandles.length - 1].time;

    const x1 = oandaChart.timeScale().timeToCoordinate(startTime);
    const x2 = oandaChart.timeScale().timeToCoordinate(endTime);
    const yHigh = candleSeries.priceToCoordinate(high);
    const yLow = candleSeries.priceToCoordinate(low);

    if(x1 == null || x2 == null || yHigh == null || yLow == null) return;

    const rect = svgEl("rect", {
        x: Math.min(x1, x2),
        y: Math.min(yHigh, yLow),
        width: Math.max(20, Math.abs(x2 - x1)),
        height: Math.abs(yLow - yHigh),
        fill: config.fill,
        stroke: config.color,
        "stroke-width": 1.5,
        "data-light-ib-fill": sessionName
    });

    drawingSvg.insertBefore(rect, drawingSvg.firstChild);
    sessionIBFillDrawings.push(rect);
}

function redrawSessionIBFill(){
    if(!activeSessionIB) return;

    sessionIBFillDrawings.forEach(el => {
        try{
            el.remove();
        }catch(e){}
    });

    sessionIBFillDrawings = [];

    drawSessionIBFill(
        activeSessionIB.name,
        activeSessionIB.candles,
        activeSessionIB.high,
        activeSessionIB.low
    );
}

let activeSessionIB = null;

function drawLightSessionIB(sessionName){
    if(!candleSeries || !candlesData.length){
        setText("signal", "Chart not ready");
        return;
    }

    const config = getSessionIBConfig(sessionName);
    if(!config) return;

    clearSessionIB();

    const ibCandles = getLastSessionIBCandles(sessionName);

    if(!ibCandles.length){
        setText("signal", `⚠️ No candles found for ${sessionName} IB`);
        return;
    }

    const high = Math.max(...ibCandles.map(c => c.high));
    const low = Math.min(...ibCandles.map(c => c.low));
    const range = high - low;

    const mid = high - range / 2;

    const ext50Up = high + range * 0.5;
    const ext50Down = low - range * 0.5;

    const ext100Up = high + range;
    const ext100Down = low - range;

    const ext200Up = high + range * 2;
    const ext200Down = low - range * 2;

    activeSessionIB = {
        name: sessionName,
        candles: ibCandles,
        high,
        low
    };

    function addLine(price, title, color, width, style){
        const line = candleSeries.createPriceLine({
            price: price,
            color: color,
            lineWidth: width,
            lineStyle: style,
            axisLabelVisible: true,
            title: title
        });

        sessionIBLines.push(line);
    }

    addLine(high, `${sessionName} Buy`, "#008cff", 3, LightweightCharts.LineStyle.Solid);
addLine(low, `${sessionName} Sell`, "#ff3333", 3, LightweightCharts.LineStyle.Solid);

addLine(mid, `Mid`, "#ffd700", 1, LightweightCharts.LineStyle.Dashed);

addLine(ext50Up, `TP1`, "#ffffff", 1, LightweightCharts.LineStyle.Dashed);
addLine(ext50Down, `TP1`, "#ffffff", 1, LightweightCharts.LineStyle.Dashed);

addLine(ext100Up, `TP2`, "#00ff88", 2, LightweightCharts.LineStyle.Solid);
addLine(ext100Down, `TP2`, "#00ff88", 2, LightweightCharts.LineStyle.Solid);

addLine(ext200Up, `TP3`, "#00aa55", 2, LightweightCharts.LineStyle.Solid);
addLine(ext200Down, `TP3`, "#00aa55", 2, LightweightCharts.LineStyle.Solid);

    drawSessionIBFill(sessionName, ibCandles, high, low);

    setText(
        "signal",
        `✅ ${sessionName} IB Drawn<br>
        High: ${high.toFixed(2)}<br>
        Low: ${low.toFixed(2)}<br>
        Mid: ${mid.toFixed(2)}<br>
        Range: ${range.toFixed(2)}`
    );
}

window.toggleAsiaSession = function(){
    asiaSessionOn = !asiaSessionOn;

    europeSessionOn = false;
    americaSessionOn = false;

    if(asiaSessionOn){
        drawLightSessionIB("Asia");
    }else{
        clearSessionIB();
        activeSessionIB = null;
        setText("signal", "🟢 Session Asia OFF");
    }

    ibOn = asiaSessionOn || europeSessionOn || americaSessionOn;
    updatePanel();
};

window.toggleEuropeSession = function(){
    europeSessionOn = !europeSessionOn;

    asiaSessionOn = false;
    americaSessionOn = false;

    if(europeSessionOn){
        drawLightSessionIB("Europe");
    }else{
        clearSessionIB();
        activeSessionIB = null;
        setText("signal", "🔵 Session Europe OFF");
    }

    ibOn = asiaSessionOn || europeSessionOn || americaSessionOn;
    updatePanel();
};

window.toggleAmericaSession = function(){
    americaSessionOn = !americaSessionOn;

    asiaSessionOn = false;
    europeSessionOn = false;

    if(americaSessionOn){
        drawLightSessionIB("America");
    }else{
        clearSessionIB();
        activeSessionIB = null;
        setText("signal", "🔴 Session America OFF");
    }

    ibOn = asiaSessionOn || europeSessionOn || americaSessionOn;
    updatePanel();
};

window.toggleVWAP = function(){
    vwapOn = !vwapOn;

    if(vwapSeries){
        vwapSeries.applyOptions({
            visible: vwapOn
        });
    }

    updatePanel();
    setText("signal", vwapOn ? "📈 VWAP ON" : "📈 VWAP OFF");
};

// =======================
// CHANNEL REALTIME
// =======================
function formatChannelText(text){
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
}

let lastChannelMessage = "";
let channelFirstLoad = true;
let unsubscribeChannel = null;

function playChannelAlert(){
    try{
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(950, audioCtx.currentTime);

        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();

        setTimeout(() => {
            oscillator.stop();
            audioCtx.close();
        }, 900);

    }catch(error){
        console.log("Sound blocked until user interacts with page");
    }
}

function renderTelegramPost(post){
    const div = document.createElement("div");
    div.className = "telegramPost";

    const text = formatChannelText(post.text || "");
    const time = post.date ? new Date(post.date).toLocaleString() : "";

    let imageHtml = "";

    if(post.imageFileId){
        imageHtml = `
            <img 
                src="/api/telegram/photo/${post.imageFileId}" 
                class="telegramImage"
                alt="Telegram image">
        `;
    }

    div.innerHTML = `
        <div class="telegramPostHeader">
            <b>${post.channelTitle || "Golden Trade"}</b>
            <small>${time}</small>
        </div>

        ${imageHtml}

        <div class="telegramText">
            ${text || ""}
        </div>
    `;

    return div;
}

async function startChannelListener(){

    const box = document.getElementById("telegramChannelBox");
    if(!box) return;

    try{

        const response = await fetch("/api/telegram/posts");
        const data = await response.json();

        if(!data.posts || data.posts.length === 0){
            box.innerHTML = `
                <div class="telegramEmpty">
                    No Telegram posts yet
                </div>
            `;

            setTimeout(startChannelListener, 1000);
            return;
        }

        box.innerHTML = "";

        data.posts.forEach(post => {

            const div = document.createElement("div");
            div.className = "telegramPost";

            let imageHtml = "";

            if(post.imageFileId){
                imageHtml = `
                    <img
                        src="/api/telegram/photo/${post.imageFileId}"
                        class="telegramImage"
                    >
                `;
            }

            const time = post.date
                ? new Date(post.date).toLocaleString()
                : "";

            div.innerHTML = `
                <div class="telegramPostHeader">
                    <b style="color:#ffd700;">
                        ${post.channelTitle || "Golden Trade"}
                    </b>

                    <small style="color:#888;">
                        ${time}
                    </small>
                </div>

                ${imageHtml}

                <div class="telegramText">
                    ${formatChannelText(post.text || "")}
                </div>
            `;

            box.appendChild(div);

        });

    }catch(error){

        console.error(error);

        box.innerHTML = `
            <div class="telegramEmpty">
                Telegram loading error
            </div>
        `;
    }

    setTimeout(startChannelListener, 1000);
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
    setActiveTimeframeButton();
    setActiveToolButton();

setTimeout(() => {
    startChannelListener();
}, 1000);
});

setInterval(() => {
    updateSession();
}, 1000);



setInterval(() => {
    if(currentAsset === "GOLD"){
        loadOandaPrice();
    }
}, 1000);

window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        createChart();
    }, 500);
});


// =======================
// DASHBOARD UI UPGRADE - PART 1
// Floating Chat + User Cards
// =======================

function getLoggedUser(){
    try{
        return JSON.parse(localStorage.getItem("golden_user")) || null;
    }catch(e){
        return null;
    }
}

function calculateDaysLeft(dateValue){
    if(!dateValue || dateValue === "lifetime") return "Lifetime";

    const now = new Date();
    const end = new Date(dateValue);
    const diff = end - now;

    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function updateDashboardUserUI(){
    const user = getLoggedUser();
    if(!user) return;

    const name = user.name || "Golden Trade Client";
    const email = user.email || "";
    const subscription = user.subscription || "trial";
    const status = user.status || "active";

    setText("topUserName", name);
    setText("miniName", name);
    setText("dashboardName", name);
    setText("dashboardEmail", email);

    const badge = document.getElementById("topUserBadge");
    if(badge){
        badge.innerHTML = subscription.toUpperCase();
    }

    setText("accountStatus", status.toUpperCase());
    setText("accountMembership", subscription.toUpperCase());

    let remaining = "-";

    if(subscription === "trial"){
        remaining = calculateDaysLeft(user.trialEnd) + " days";
    }else if(subscription === "vip"){
        remaining = calculateDaysLeft(user.vipUntil);
        if(remaining !== "Lifetime") remaining += " days";
    }else{
        remaining = "Expired";
    }

    setText("accountDays", remaining);
    setText("sideSubscription", `${subscription.toUpperCase()} - ${remaining}`);

    const title = document.getElementById("dashboardTitle");
    if(title){
        if(subscription === "trial"){
            title.innerHTML = `Trial Member - ${remaining}`;
        }else if(subscription === "vip"){
            title.innerHTML = "VIP Member";
        }else{
            title.innerHTML = "Expired Member";
        }
    }
}

// =======================
// FLOATING CHAT
// =======================
window.toggleFloatingChat = function(){
    const chat = document.getElementById("floatingChat");
    if(!chat) return;

    chat.classList.remove("closed");
    chat.classList.toggle("minimized");
};

window.minimizeFloatingChat = function(){
    const chat = document.getElementById("floatingChat");
    if(!chat) return;

    chat.classList.toggle("minimized");
};

window.closeFloatingChat = function(){
    const chat = document.getElementById("floatingChat");
    if(!chat) return;

    chat.classList.add("closed");
};

window.sendFloatingChatMessage = function(){
    const input = document.getElementById("floatingChatInput");
    const body = document.getElementById("floatingChatBody");

    if(!input || !body) return;

    const message = input.value.trim();

    if(message === "") return;

    const div = document.createElement("div");
    div.className = "floatingMsg userMsg";
    div.innerHTML = `
        <b>You</b>
        <p>${message}</p>
    `;

    body.appendChild(div);
    input.value = "";
    body.scrollTop = body.scrollHeight;

    setText("signal", "💬 Message added to floating chat");
};

// =======================
// DASHBOARD UI AUTO UPDATE
// =======================
window.addEventListener("load", () => {
    setTimeout(() => {
        updateDashboardUserUI();
    }, 800);
});


// =======================
// DASHBOARD UI UPGRADE - PART 2
// =======================

// فتح الشات من زر Clients Chat
window.openFloatingChat = function(){
    const chat = document.getElementById("floatingChat");
    if(!chat) return;

    chat.classList.remove("closed");
    chat.classList.remove("minimized");

    const body = document.getElementById("floatingChatBody");

    if(body && body.children.length === 0){

        const msg = document.createElement("div");
        msg.className = "floatingMsg adminMsg";

        msg.innerHTML = `
            <b>Admin</b>
            <p>
            Welcome to Golden Trade 👋<br>
            How can we help you today?
            </p>
        `;

        body.appendChild(msg);
    }
};

// إرسال بالضغط Enter
window.addEventListener("load",()=>{

    const input = document.getElementById("floatingChatInput");

    if(input){

        input.addEventListener("keydown",(e)=>{

            if(e.key === "Enter"){
                sendFloatingChatMessage();
            }

        });

    }

});

// تحديث الوقت أعلى الصفحة
function updateServerClock(){

    const box = document.getElementById("serverTime");

    if(!box) return;

    const now = new Date();

    box.innerHTML =
        now.toLocaleTimeString();
}

setInterval(updateServerClock,1000);


// تحديث سعر الذهب في الماركت ستريب
function updateMarketStrip(){

    if(!lastPrice) return;

    setText("marketGoldPrice",lastPrice);

}

setInterval(updateMarketStrip,1000);


// تحديث Account Card
function updateAccountCard(){

    const user = getLoggedUser();

    if(!user) return;

    setText(
        "accountType",
        (user.subscription || "TRIAL").toUpperCase()
    );

    if(user.subscription === "trial"){
        setText(
            "accountExpire",
            calculateDaysLeft(user.trialEnd) + " Days"
        );
    }

    if(user.subscription === "vip"){
        if(user.vipUntil === "lifetime"){
            setText(
                "accountExpire",
                "Lifetime"
            );
        }else{
            setText(
                "accountExpire",
                calculateDaysLeft(user.vipUntil) + " Days"
            );
        }
    }

}

setInterval(updateAccountCard,3000);


// إشعار عند استقبال رسالة جديدة
window.showChatNotification = function(){

    const badge = document.getElementById("chatNotification");

    if(!badge) return;

    badge.style.display = "flex";

};


// إزالة الإشعار
window.clearChatNotification = function(){

    const badge = document.getElementById("chatNotification");

    if(!badge) return;

    badge.style.display = "none";

};


// تحميل كل عناصر الداشبورد الجديدة
window.addEventListener("load",()=>{

    setTimeout(()=>{

        updateDashboardUserUI();
        updateServerClock();
        updateMarketStrip();
        updateAccountCard();

    },1000);

});


// =======================
// PRO DASHBOARD TOGGLES FINAL
// =======================

function resizeGoldenChart(){
    setTimeout(() => {
        const box = document.getElementById("oandaChart");

        if(oandaChart && box){
            oandaChart.resize(
                box.clientWidth,
                box.clientHeight
            );
        }

        if(typeof renderSessionProfile === "function"){
            renderSessionProfile();
        }

        if(typeof renderDrawings === "function"){
            renderDrawings();
        }

    }, 350);
}

window.toggleRightPanel = function(){
    document.body.classList.toggle("rightPanelClosed");

    const btn = document.getElementById("rightPanelToggle");
    if(btn){
        btn.innerHTML = document.body.classList.contains("rightPanelClosed") ? "‹" : "›";
    }

    if(typeof forceChartResize === "function"){
        forceChartResize();
    }else if(typeof resizeGoldenChart === "function"){
        resizeGoldenChart();
    }
};

window.toggleBottomCards = function(){
    document.body.classList.toggle("bottomCardsOpen");
    resizeGoldenChart();
};

window.addEventListener("load", () => {
document.body.classList.remove("rightPanelClosed");
    document.body.classList.remove("bottomCardsOpen");

    resizeGoldenChart();
});

// =======================
// FIX FLOATING CHAT BUTTON
// =======================

window.toggleFloatingChat = function(){
    const chat = document.getElementById("floatingChat");
    if(!chat) return;

    document.body.classList.add("bottomCardsOpen");

    chat.classList.remove("closed");
    chat.classList.remove("minimized");
    chat.style.display = "flex";

    resizeGoldenChart();
};

window.openFloatingChat = function(){
    window.toggleFloatingChat();
};

window.closeFloatingChat = function(){
    const chat = document.getElementById("floatingChat");
    if(!chat) return;

    chat.classList.add("closed");
    chat.style.display = "none";
};

window.minimizeFloatingChat = function(){
    const chat = document.getElementById("floatingChat");
    if(!chat) return;

    chat.classList.toggle("minimized");
};


// =======================
// FINAL CHAT + BOTTOM DRAWER FIX
// =======================

function resizeGoldenChartFinal(){
    setTimeout(() => {
        const box = document.getElementById("oandaChart");

        if(oandaChart && box){
            oandaChart.resize(box.clientWidth, box.clientHeight);
        }

        if(typeof renderSessionProfile === "function") renderSessionProfile();
        if(typeof renderDrawings === "function") renderDrawings();

    }, 350);
}

window.toggleBottomCards = function(){
    document.body.classList.toggle("bottomCardsOpen");
    resizeGoldenChartFinal();
};

window.toggleFloatingChat = function(){
    const chat = document.getElementById("floatingChat");
    if(!chat) return;

    document.body.classList.add("bottomCardsOpen");
    chat.classList.remove("closed");
    chat.classList.remove("minimized");
    chat.classList.add("chatOpen");

    resizeGoldenChartFinal();
};

window.openFloatingChat = function(){
    window.toggleFloatingChat();
};

window.closeFloatingChat = function(){
    const chat = document.getElementById("floatingChat");
    if(!chat) return;

    chat.classList.remove("chatOpen");
    chat.classList.add("closed");
};

window.minimizeFloatingChat = function(){
    const chat = document.getElementById("floatingChat");
    if(!chat) return;

    chat.classList.toggle("minimized");
};

window.addEventListener("load", () => {
    document.body.classList.remove("bottomCardsOpen");

    const chat = document.getElementById("floatingChat");
    if(chat){
        chat.classList.remove("chatOpen");
    }

    resizeGoldenChartFinal();
});

// =======================
// FINAL FORCE CHAT OPEN FIX
// =======================
window.toggleFloatingChat = function(){
    const chat = document.getElementById("floatingChat");
    if(!chat) return;

    chat.classList.remove("closed");
    chat.classList.remove("minimized");
    chat.classList.add("chatOpen");
    chat.style.display = "flex";

    document.body.classList.add("bottomCardsOpen");

    if(typeof resizeGoldenChartFinal === "function"){
        resizeGoldenChartFinal();
    }
};

window.openFloatingChat = function(){
    window.toggleFloatingChat();
};

window.closeFloatingChat = function(){
    const chat = document.getElementById("floatingChat");
    if(!chat) return;

    chat.classList.remove("chatOpen");
    chat.classList.add("closed");
    chat.style.display = "none";
};

window.minimizeFloatingChat = function(){
    const chat = document.getElementById("floatingChat");
    if(!chat) return;

    chat.classList.toggle("minimized");
};

// =======================
// FORCE CHART RESIZE FIX
// =======================
function refreshStrategyAreasLive(){
    if(!strategyOn || !activeStrategySetup) return;

    requestAnimationFrame(() => {
        redrawStrategyAreas();
    });
}
function forceChartResize(){
    setTimeout(() => {
        const box = document.getElementById("oandaChart");

        if(oandaChart && box){
            oandaChart.resize(
                box.clientWidth,
                box.clientHeight
            );

            oandaChart.applyOptions({
                rightPriceScale:{
                    visible:true,
                    borderVisible:true,
                    borderColor:"#ffd700"
                }
            });
        }

        if(typeof renderSessionProfile === "function") renderSessionProfile();
if(typeof redrawSessionIBFill === "function") redrawSessionIBFill();
        if(typeof renderDrawings === "function") renderDrawings();

    }, 250);
}

window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        forceChartResize();
    }, 300);
});

window.addEventListener("orientationchange", () => {
    forceChartResize();
});

document.addEventListener("fullscreenchange", () => {
    forceChartResize();
});

setInterval(() => {
    forceChartResize();
}, 3000);

setInterval(() => {
    refreshStrategyAreasLive();
}, 100);
// =======================
// FORCE CLIENTS CHAT OPEN
// =======================
window.openFloatingChat = function(){
    const chat = document.getElementById("floatingChat");
    if(!chat) return;

    document.body.classList.add("bottomCardsOpen");

    chat.classList.remove("closed");
    chat.classList.remove("minimized");
    chat.classList.add("chatOpen");
    chat.style.display = "flex";

    if(typeof resizeGoldenChartFinal === "function"){
        resizeGoldenChartFinal();
    }
};

window.toggleFloatingChat = function(){
    window.openFloatingChat();
};

window.closeFloatingChat = function(){
    const chat = document.getElementById("floatingChat");
    if(!chat) return;

    chat.classList.remove("chatOpen");
    chat.classList.add("closed");
    chat.style.display = "none";
};

// CHAT PRO FINAL
window.openFloatingChat = function(){
    const chat = document.getElementById("floatingChat");
    if(!chat) return;

    chat.classList.remove("closed");
    chat.classList.remove("minimized");
    chat.classList.add("chatOpen");
    chat.style.display = "flex";
};

window.toggleFloatingChat = function(){
    window.openFloatingChat();
};

window.closeFloatingChat = function(){
    const chat = document.getElementById("floatingChat");
    if(!chat) return;

    chat.classList.remove("chatOpen");
    chat.classList.add("closed");
    chat.style.display = "none";
};

window.minimizeFloatingChat = function(){
    const chat = document.getElementById("floatingChat");
    if(!chat) return;

    chat.classList.toggle("minimized");
};

window.sendFloatingChatMessage = function(){
    const input = document.getElementById("floatingChatInput");
    const body = document.getElementById("floatingChatBody");

    if(!input || !body) return;

    const msg = input.value.trim();
    if(msg === "") return;

    const row = document.createElement("div");
    row.className = "chatBubbleRow userBubble";

    row.innerHTML = `
        <div class="chatMiniAvatar">YOU</div>
        <div class="chatBubbleText">
            <b>You</b>
            <p>${msg}</p>
            <small>Now</small>
        </div>
    `;

    body.appendChild(row);
    input.value = "";
    body.scrollTop = body.scrollHeight;
};

window.addEventListener("load", () => {
    const input = document.getElementById("floatingChatInput");
    if(input){
        input.addEventListener("keydown", e => {
            if(e.key === "Enter"){
                sendFloatingChatMessage();
            }
        });
    }
});

// =======================
// SAFE THEME FIX FINAL
// Dark = Black/Gold
// Light = Blue Mode
// =======================

function getChartThemeOptions(){
    if(currentTheme === "light"){
        return {
            layout: {
                background: { color: "#eaf4ff" },
                textColor: "#003b8f"
            },
            grid: {
                vertLines: { color: "#c9def5" },
                horzLines: { color: "#c9def5" }
            },
            rightPriceScale: {
                borderColor: "#0b63ce"
            },
            timeScale: {
                borderColor: "#0b63ce"
            }
        };
    }

    return {
        layout: {
            background: { color: "#0b0b0b" },
            textColor: "#d1d4dc"
        },
        grid: {
            vertLines: { color: "#1f1f1f" },
            horzLines: { color: "#1f1f1f" }
        },
        rightPriceScale: {
            borderColor: "#333"
        },
        timeScale: {
            borderColor: "#333"
        }
    };
}

function applyChartTheme(){
    if(!oandaChart) return;

    oandaChart.applyOptions(getChartThemeOptions());

    if(candleSeries){
        candleSeries.applyOptions({
            upColor: "#00ff99",
            downColor: "#ff4d4d",
            borderUpColor: "#00ff99",
            borderDownColor: "#ff4d4d",
            wickUpColor: "#00ff99",
            wickDownColor: "#ff4d4d"
        });
    }

    if(vwapSeries){
        vwapSeries.applyOptions({
            color: currentTheme === "light" ? "#005bd8" : "#ffd700"
        });
    }
}

applyPageTheme = function(){
    document.body.classList.remove("darkTheme", "lightTheme");

    if(currentTheme === "light"){
        document.body.classList.add("lightTheme");
    }else{
        document.body.classList.add("darkTheme");
    }

    applyChartTheme();
};

const oldCreateChartThemeFix = createChart;

createChart = async function(){
    await oldCreateChartThemeFix();

    setTimeout(() => {
        applyChartTheme();
    }, 100);
};

window.toggleTheme = function(){
    currentTheme = currentTheme === "dark" ? "light" : "dark";

    localStorage.setItem("theme", currentTheme);

    applyPageTheme();
    updatePanel();

    setText(
        "signal",
        currentTheme === "dark"
            ? "🌙 Dark Mode ON"
            : "☀️ Blue Light Mode ON"
    );

    if(typeof forceChartResize === "function"){
        forceChartResize();
    }
};

window.addEventListener("load", () => {
    setTimeout(() => {
        applyPageTheme();
        updatePanel();
    }, 700);
});
// =======================
// GROUP CLIENTS CHAT - FIREBASE LIVE
// =======================

let unsubscribeGroupChat = null;

function getChatUser(){
    try{
        return JSON.parse(localStorage.getItem("golden_user")) || {
            name: "Golden Trade Client",
            email: "",
            role: "Client"
        };
    }catch(e){
        return {
            name: "Golden Trade Client",
            email: "",
            role: "Client"
        };
    }
}

function formatChatTime(value){
    try{
        if(value && value.toDate){
            return value.toDate().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });
        }
    }catch(e){}

    return "Now";
}

function renderGroupChatMessages(messages){
    const body = document.getElementById("floatingChatBody");
    if(!body) return;

    const currentUser = getChatUser();

    body.innerHTML = "";

    messages.forEach(msg => {
        const isMe = msg.email && currentUser.email && msg.email === currentUser.email;

        const row = document.createElement("div");
        row.className = isMe ? "chatBubbleRow userBubble" : "chatBubbleRow adminBubble";

        const initials = (msg.name || "GT")
            .split(" ")
            .map(x => x[0])
            .join("")
            .substring(0,2)
            .toUpperCase();

        row.innerHTML = `
            <div class="chatMiniAvatar">${isMe ? "YOU" : initials}</div>
            <div class="chatBubbleText">
                <b>${msg.name || "Golden Trade Client"}</b>
                <p>${msg.message || ""}</p>
                <small>${formatChatTime(msg.createdAt)}</small>
            </div>
        `;

        body.appendChild(row);
    });

    body.scrollTop = body.scrollHeight;
}

function startGroupChat(){
    if(typeof window.listenChatMessagesFirebase !== "function"){
        console.log("Firebase chat listener not ready");
        return;
    }

    if(unsubscribeGroupChat) return;

    unsubscribeGroupChat = window.listenChatMessagesFirebase((messages) => {
        renderGroupChatMessages(messages);
    });
}

window.openFloatingChat = function(){
    const chat = document.getElementById("floatingChat");
    if(!chat) return;

    chat.classList.remove("closed");
    chat.classList.remove("minimized");
    chat.classList.add("chatOpen");
    chat.style.display = "flex";

    startGroupChat();
};

window.toggleFloatingChat = function(){
    window.openFloatingChat();
};

window.closeFloatingChat = function(){
    const chat = document.getElementById("floatingChat");
    if(!chat) return;

    chat.classList.remove("chatOpen");
    chat.classList.add("closed");
    chat.style.display = "none";
};

window.sendFloatingChatMessage = async function(){
    const input = document.getElementById("floatingChatInput");
    if(!input) return;

    const message = input.value.trim();
    if(message === "") return;

    const user = getChatUser();

    input.value = "";

    if(typeof window.sendChatMessageFirebase !== "function"){
        alert("Chat Firebase not loaded");
        return;
    }

    await window.sendChatMessageFirebase(message, user);
};

window.addEventListener("load", () => {
    setTimeout(() => {
        startGroupChat();

        const input = document.getElementById("floatingChatInput");
        if(input){
            input.addEventListener("keydown", e => {
                if(e.key === "Enter"){
                    window.sendFloatingChatMessage();
                }
            });
        }
    }, 1200);
});
// =======================
// TRADING GOAL PLANNER
// =======================

function getGoalUserKey(){
    const user = getLoggedUser();
    return user && user.email ? `trading_goal_${user.email}` : "trading_goal_guest";
}

function money(value){
    return "$" + Number(value || 0).toLocaleString();
}

function getGoalValue(id){
    const el = document.getElementById(id);
    return el ? Number(el.value || 0) : 0;
}

function setGoalValue(id, value){
    const el = document.getElementById(id);
    if(el) el.value = value || "";
}

window.openTradingGoal = function(){
    const modal = document.getElementById("goalModal");
    if(!modal) return;

    modal.classList.add("goalOpen");
    loadTradingGoal();
};

window.closeTradingGoal = function(){
    const modal = document.getElementById("goalModal");
    if(!modal) return;

    modal.classList.remove("goalOpen");
};

function updateTradingGoalView(data){
    const capital = Number(data.capital || 0);
    const target = Number(data.target || 0);
    const current = Number(data.current || 0);
    const profit = Number(data.profit || 0);
    const loss = Number(data.loss || 0);
    const risk = Number(data.risk || 0);

    const net = profit - loss;

    let progress = 0;
    if(target > capital){
        progress = ((current - capital) / (target - capital)) * 100;
    }

    progress = Math.max(0, Math.min(100, Math.round(progress)));

    setText("goalViewCapital", money(capital));
    setText("goalViewTarget", money(target));
    setText("goalViewCurrent", money(current));
    setText("goalViewNet", money(net));
    setText("goalProgressText", progress + "%");

    const circle = document.querySelector(".goalProgressCircle");
    if(circle){
        circle.style.background = `conic-gradient(#ffd700 ${progress * 3.6}deg, #151515 0deg)`;
    }

    let planText = "Add your capital and target to generate your plan.";

    if(capital > 0 && target > capital){
        const needed = target - current;
        const dailyLoss = capital * (risk / 100);

        planText = `
            Your capital is ${money(capital)} and your target is ${money(target)}.<br>
            Current balance: ${money(current)}.<br>
            Remaining to target: ${money(Math.max(0, needed))}.<br>
            Recommended max daily loss: ${money(dailyLoss)} (${risk || 0}%).<br>
            Net result now: ${money(net)}.
        `;
    }

    setText("goalPlanText", planText);
}

window.saveTradingGoal = function(){
    const data = {
        capital: getGoalValue("goalCapital"),
        target: getGoalValue("goalTarget"),
        current: getGoalValue("goalCurrent"),
        profit: getGoalValue("goalProfit"),
        loss: getGoalValue("goalLoss"),
        risk: getGoalValue("goalRisk"),
        updatedAt: new Date().toISOString()
    };

    localStorage.setItem(getGoalUserKey(), JSON.stringify(data));
    updateTradingGoalView(data);

    setText("signal", "🎯 Trading Goal Saved Successfully");
};

function loadTradingGoal(){
    try{
        const saved = localStorage.getItem(getGoalUserKey());
        if(!saved){
            updateTradingGoalView({});
            return;
        }

        const data = JSON.parse(saved);

        setGoalValue("goalCapital", data.capital);
        setGoalValue("goalTarget", data.target);
        setGoalValue("goalCurrent", data.current);
        setGoalValue("goalProfit", data.profit);
        setGoalValue("goalLoss", data.loss);
        setGoalValue("goalRisk", data.risk);

        updateTradingGoalView(data);

    }catch(e){
        console.error(e);
    }
}

window.addEventListener("load", () => {
    setTimeout(loadTradingGoal, 1000);
});
window.toggleLeftSidebar = function(){
    document.body.classList.toggle("leftSidebarClosed");

    if(typeof forceChartResize === "function"){
        forceChartResize();
    }else if(typeof resizeGoldenChart === "function"){
        resizeGoldenChart();
    }
};
