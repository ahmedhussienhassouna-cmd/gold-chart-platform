let chart = null;
let candleSeries = null;

// =======================
// INIT CHART
// =======================
function initChart() {

    const chartContainer = document.getElementById("chart");

    chart = LightweightCharts.createChart(chartContainer, {
        layout: {
            background: { color: '#0b0b0b' },
            textColor: '#ffffff',
        },
        grid: {
            vertLines: { color: '#1f1f1f' },
            horzLines: { color: '#1f1f1f' },
        },
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
    });

    candleSeries = chart.addCandlestickSeries();
}

initChart();

// =======================
// LIVE DATA (TEMP DEMO → GOLD)
// =======================
async function loadData() {

    try {

        // ⚠️ Demo API (بديل مؤقت - نبدله لاحقًا بذهب حقيقي قوي)
        const url = "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=200";

        const res = await fetch(url);
        const data = await res.json();

        const candles = data.map(d => ({
            time: d[0] / 1000,
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
        }));

        candleSeries.setData(candles);

        document.getElementById("priceBox").innerHTML = "🟢 LIVE CHART ACTIVE";

        // IB demo
        drawIB(candles);

    } catch (err) {
        console.log(err);
    }
}

// أول تحميل
loadData();

// تحديث كل دقيقة
setInterval(loadData, 60000);

// =======================
// RESIZE SUPPORT
// =======================
window.addEventListener("resize", () => {
    const container = document.getElementById("chart");

    chart.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
    });
});

// =======================
// IB LOGIC (FIRST RANGE)
// =======================
function drawIB(candles) {

    if (!candles || candles.length < 20) return;

    const firstRange = candles.slice(0, 20);

    let ibHigh = Math.max(...firstRange.map(c => c.high));
    let ibLow = Math.min(...firstRange.map(c => c.low));

    candleSeries.createPriceLine({
        price: ibHigh,
        color: 'lime',
        lineWidth: 2,
        title: 'IB HIGH'
    });

    candleSeries.createPriceLine({
        price: ibLow,
        color: 'red',
        lineWidth: 2,
        title: 'IB LOW'
    });
}

// =======================
// UI FUNCTIONS
// =======================
window.loadSymbol = function (symbol) {
    document.getElementById("priceBox").innerHTML =
        "📊 " + symbol + " loaded (demo)";
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
