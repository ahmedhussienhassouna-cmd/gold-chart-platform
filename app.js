let currentTheme = localStorage.getItem("theme") || "dark";
let currentAsset = "GOLD";
let currentGranularity = "M1";

let strategyOn = false;
let liquidityOn = false;
let ibOn = false;
let vwapOn = false;

let lastPrice = null;
let currentLiveCandle = null;

let oandaChart = null;
let candleSeries = null;
let resizeTimer = null;

let drawingMode = null;
let drawings = [];

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

    const chartBox = document.getElementById("oandaChart");
    if(!chartBox) return;

    chartBox.innerHTML = "";
    chartBox.style.width = "100%";
    chartBox.style.height = "100%";

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
            barSpacing: 8,
            fixLeftEdge: false,
            fixRightEdge: false,
            lockVisibleTimeRangeOnResize: false
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

    const candles = await loadOandaCandles();

    if(candles.length){
        candleSeries.setData(candles);

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
}

// =======================
// TIMEFRAMES
// =======================
window.changeTimeframe = async function(tf){
    currentGranularity = tf;
    currentLiveCandle = null;

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
// SIMPLE DRAWING TOOLS
// =======================
window.enableHorizontalLine = function(){
    drawingMode = "horizontal";
    setText("signal", "Click on chart to add Horizontal Line");

    const menu = document.getElementById("chartContextMenu");
    if(menu) menu.style.display = "none";
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

    drawings.push(line);
    setText("signal", `Horizontal Line Added: ${price.toFixed(2)}`);
}

window.clearDrawings = function(){
    if(!candleSeries) return;

    drawings.forEach(line => {
        candleSeries.removePriceLine(line);
    });

    drawings = [];

    const menu = document.getElementById("chartContextMenu");
    if(menu) menu.style.display = "none";

    setText("signal", "Drawings Cleared");
};

function setupContextMenu(){
    const chartContainer = document.getElementById("chart");
    const chartBox = document.getElementById("oandaChart");
    const menu = document.getElementById("chartContextMenu");

    if(!chartContainer || !chartBox || !menu) return;

    chartBox.addEventListener("contextmenu", function(e){
        e.preventDefault();

        menu.style.display = "block";
        menu.style.left = e.offsetX + "px";
        menu.style.top = e.offsetY + "px";
    });

    document.addEventListener("click", function(){
        menu.style.display = "none";
    });

    chartBox.addEventListener("click", function(e){
        if(drawingMode !== "horizontal" || !candleSeries) return;

        const rect = chartBox.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const price = candleSeries.coordinateToPrice(y);

        if(price){
            addHorizontalLine(price);
        }

        drawingMode = null;
    });
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
    }
}, 1000);

window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        createChart();
    }, 500);
});