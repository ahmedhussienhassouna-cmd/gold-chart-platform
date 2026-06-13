const canvas = document.getElementById("chartCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// =======================
// MARKET DATA
// =======================
let candles = [];
let price = 2400;

// توليد بيانات تجريبية
for (let i = 0; i < 120; i++) {

    let open = price;
    let close = price + (Math.random() - 0.5) * 5;
    let high = Math.max(open, close) + Math.random() * 2;
    let low = Math.min(open, close) - Math.random() * 2;

    candles.push({ open, high, low, close });
    price = close;
}

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

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!candles.length) return;

    let x = 60;
    let candleWidth = 6;

    let all = candles.flatMap(c => [c.high, c.low]);
    let max = Math.max(...all);
    let min = Math.min(...all);

    function toY(p) {
        return canvas.height - ((p - min) / (max - min)) * canvas.height;
    }

    candles.forEach((c, index) => {

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
    // رسم IB
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
// LOOP
// =======================
function render() {
    drawChart();
    requestAnimationFrame(render);
}
render();

// =======================
// UI CONNECTORS
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
