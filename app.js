const canvas = document.getElementById("chartCanvas");
const ctx = canvas.getContext("2d");

// =======================
// CANVAS FIX
// =======================
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// =======================
// LIVE DATA (GOLD)
// =======================
const API_KEY = "PUT_YOUR_API_KEY_HERE";
const SYMBOL = "XAU/USD";
const INTERVAL = "1min";

let candles = [];

// جلب بيانات الذهب الحقيقية
async function fetchGoldData() {

    try {

        const url = https://api.twelvedata.com/time_series?symbol=${SYMBOL}&interval=${INTERVAL}&outputsize=120&apikey=${API_KEY};

        const res = await fetch(url);
        const data = await res.json();

        if (!data.values) {
            console.log("API ERROR:", data);
            return;
        }

        candles = data.values.reverse().map(c => ({
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close)
        }));

        document.getElementById("priceBox").innerHTML =
            "🟡 GOLD LIVE (XAUUSD)";

    } catch (err) {
        console.log("FETCH ERROR:", err);
    }
}

// أول تحميل
fetchGoldData();

// تحديث كل دقيقة
setInterval(fetchGoldData, 60000);

// =======================
// IB ENGINE
// =======================
let ibHigh = null;
let ibLow = null;
let IB_SIZE = 20;

function calculateIB() {

    ibHigh = null;
    ibLow = null;

    for (let i = 0; i < IB_SIZE; i++) {
        if (!candles[i]) continue;

        ibHigh = ibHigh === null ? candles[i].high : Math.max(ibHigh, candles[i].high);
        ibLow  = ibLow === null ? candles[i].low  : Math.min(ibLow, candles[i].low);
    }
}

// =======================
// CHART ENGINE
// =======================
function drawChart() {

    if (!candles || candles.length === 0) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let x = 40;
    let candleWidth = 6;

    let allPrices = candles.flatMap(c => [c.high, c.low]);
    let max = Math.max(...allPrices);
    let min = Math.min(...allPrices);

    function toY(p) {
        return canvas.height - ((p - min) / (max - min)) * canvas.height;
    }

    candles.forEach(c => {

        let o = toY(c.open);
        let h = toY(c.high);
        let l = toY(c.low);
        let cl = toY(c.close);

        // wick
        ctx.strokeStyle = "#aaa";
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(x, l);
        ctx.stroke();

        // body
        ctx.fillStyle = c.close > c.open ? "#00ff88" : "#ff4d4d";
        ctx.fillRect(x - 2, Math.min(o, cl), candleWidth, Math.abs(o - cl));

        x += 10;
    });

    // =======================
    // IB LINES
    // =======================
    calculateIB();

    if (ibHigh && ibLow) {

        let yHigh = toY(ibHigh);
        let yLow = toY(ibLow);

        ctx.strokeStyle = "lime";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, yHigh);
        ctx.lineTo(canvas.width, yHigh);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, yLow);
        ctx.lineTo(canvas.width, yLow);
        ctx.stroke();
    }
}

// =======================
// RENDER LOOP
// =======================
function render() {
    drawChart();
    requestAnimationFrame(render);
}
render();

// =======================
// UI
// =======================
window.loadSymbol = function (symbol) {
    document.getElementById("priceBox").innerHTML =
        "📊 " + symbol + " Loaded";
};

window.signals = function () {
    document.getElementById("signal").innerHTML = `
        <div class="signalCard">
            <div class="buy">SYSTEM ACTIVE</div>
        </div>
    `;
};

window.liquidity = function () {
    document.getElementById("signal").innerHTML = `
        <div class="signalCard">
            <div class="buy">LIQUIDITY MODE READY</div>
        </div>
    `;
};

window.priceAction = function () {};
window.poc = function () {};
window.settings = function () {};
