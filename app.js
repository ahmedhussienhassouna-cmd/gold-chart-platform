let currentTheme = localStorage.getItem("theme") || "dark";
let currentAsset = "GOLD";
let currentGranularity = "M1";

let strategyOn = false;
let liquidityOn = false;
let ibOn = false;
let vwapOn = false;
let sessionProfileOn = false;

let lastPrice = null;
let currentLiveCandle = null;

let oandaChart = null;
let candleSeries = null;
let vwapSeries = null;
let resizeTimer = null;let currentTheme = localStorage.getItem("theme") || "dark";
let currentAsset = "GOLD";
let currentGranularity = "M1";

let strategyOn = false;
let liquidityOn = false;
let ibOn = false;
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
    ["cursor","trend","horizontal","vertical","rectangle","arrow","text"].forEach(tool => {
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

function drawStrategyZone(high, low){
    if(!candleSeries) return;

    clearStrategyLines();

    const highLine = candleSeries.createPriceLine({
        price: high,
        color: "#ffd700",
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Solid,
        axisLabelVisible: true,
        title: "GT HIGH"
    });

    const lowLine = candleSeries.createPriceLine({
        price: low,
        color: "#ffd700",
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Solid,
        axisLabelVisible: true,
        title: "GT LOW"
    });

    strategyLines.push(highLine, lowLine);

    setText("signal", `✅ Strategy Zone Drawn<br>High: ${high}<br>Low: ${low}`);
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
            rightOffset: 10,
            barSpacing: 8
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

        oandaChart.timeScale().fitContent();

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
        renderDrawings();
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

    const groups = buildSessionGroups(candlesData).slice(-20);

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
    const time = oandaChart.timeScale().coordinateToTime(x);

    if(price == null || time == null) return null;

    return {
        x,
        y,
        price: Number(price),
        time
    };
}

function coordinateFromPoint(point){
    if(!oandaChart || !candleSeries) return null;

    const x = oandaChart.timeScale().timeToCoordinate(point.time);
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

    chartBox.onclick = function(e){
        if(drawingsLocked) return;
        if(drawingMode === "cursor") return;

        const point = chartPointFromMouse(e);
        if(!point) return;

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
    const chartBox = document.getElementById("oandaChart");
    const menu = document.getElementById("chartContextMenu");

    if(!chartBox || !menu) return;

    chartBox.oncontextmenu = function(e){
        e.preventDefault();

        const rect = chartBox.getBoundingClientRect();

        menu.style.display = "block";
        menu.style.left = (e.clientX - rect.left) + "px";
        menu.style.top = (e.clientY - rect.top) + "px";
    };

    document.onclick = function(e){
        if(!menu.contains(e.target)){
            menu.style.display = "none";
        }
    };
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

        drawStrategyZone(high, low);

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

    if(vwapSeries){
        vwapSeries.applyOptions({
            visible: vwapOn
        });
    }

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
    setActiveTimeframeButton();
    setActiveToolButton();

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
    }
}, 1000);

window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        createChart();
    }, 500);
});

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
    ["cursor","trend","horizontal","vertical","rectangle","arrow","text"].forEach(tool => {
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

function drawStrategyZone(high, low){
    if(!candleSeries) return;

    clearStrategyLines();

    const highLine = candleSeries.createPriceLine({
        price: high,
        color: "#ffd700",
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Solid,
        axisLabelVisible: true,
        title: "GT HIGH"
    });

    const lowLine = candleSeries.createPriceLine({
        price: low,
        color: "#ffd700",
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Solid,
        axisLabelVisible: true,
        title: "GT LOW"
    });

    strategyLines.push(highLine, lowLine);

    setText("signal", `✅ Strategy Zone Drawn<br>High: ${high}<br>Low: ${low}`);
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
            rightOffset: 10,
            barSpacing: 8
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

        oandaChart.timeScale().fitContent();

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
        renderDrawings();
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
    const time = oandaChart.timeScale().coordinateToTime(x);

    if(price == null || time == null) return null;

    return {
        x,
        y,
        price: Number(price),
        time
    };
}

function coordinateFromPoint(point){
    if(!oandaChart || !candleSeries) return null;

    const x = oandaChart.timeScale().timeToCoordinate(point.time);
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

    chartBox.onclick = function(e){
        if(drawingsLocked) return;
        if(drawingMode === "cursor") return;

        const point = chartPointFromMouse(e);
        if(!point) return;

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
    const chartBox = document.getElementById("oandaChart");
    const menu = document.getElementById("chartContextMenu");

    if(!chartBox || !menu) return;

    chartBox.oncontextmenu = function(e){
        e.preventDefault();

        const rect = chartBox.getBoundingClientRect();

        menu.style.display = "block";
        menu.style.left = (e.clientX - rect.left) + "px";
        menu.style.top = (e.clientY - rect.top) + "px";
    };

    document.onclick = function(e){
        if(!menu.contains(e.target)){
            menu.style.display = "none";
        }
    };
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

        drawStrategyZone(high, low);

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

    if(vwapSeries){
        vwapSeries.applyOptions({
            visible: vwapOn
        });
    }

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
    setActiveTimeframeButton();
    setActiveToolButton();

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
    }
}, 1000);

window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        createChart();
    }, 500);
});
