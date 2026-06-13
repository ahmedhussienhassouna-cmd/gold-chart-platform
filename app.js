let chart;
let candleSeries;

// =======================
// START SAFE (IMPORTANT)
// =======================
window.addEventListener("load", () => {
    initChart();
    loadData();
});

// =======================
// INIT CHART
// =======================
function initChart() {

    const container = document.getElementById("chart");

    if (!container) {
        console.log("❌ chart container not found");
        return;
    }

    chart = LightweightCharts.createChart(container, {
        layout: {
            background: { color: '#0b0b0b' },
            textColor: '#ffffff',
        },
        grid: {
            vertLines: { color: '#1f1f1f' },
            horzLines: { color: '#1f1f1f' },
        },
        rightPriceScale: {
            borderColor: '#2b2b2b',
        },
        timeScale: {
            borderColor: '#2b2b2b',
        },
        width: container.clientWidth,
        height: container.clientHeight,
    });

    candleSeries = chart.addCandlestickSeries();
}

// =======================
// LIVE GOLD DATA (FIXED)
// =======================
async function loadData() {

    try {

        const url = "https://api.twelvedata.com/time_series?symbol=XAU/USD&interval=1min&outputsize=200&apikey=PUT_YOUR_API_KEY_HERE";

        const res = await fetch(url);
        const data = await res.json();

        if (!data || !data.values) {
            console.log("❌ API ERROR:", data);
            return;
        }

        const candles = data.values
            .reverse()
            .map(c => ({
                time: Math.floor(new Date(c.datetime).getTime() / 1000),
                open: parseFloat(c.open),
                high: parseFloat(c.high),
                low: parseFloat(c.low),
                close: parseFloat(c.close),
            }));

        candleSeries.setData(candles);

        document.getElementById("priceBox").innerHTML =
            "🟡 GOLD LIVE (XAUUSD)";

        drawIB(candles);

    } catch (err) {
        console.log("❌ FETCH ERROR:", err);
    }
}

// =======================
// RESIZE FIX (VERY IMPORTANT)
// =======================
window.addEventListener("resize", () => {

    if (!chart) return;

    const container = document.getElementById("chart");

    chart.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
    });
});

// =======================
// IB ENGINE
// =======================
function drawIB(candles) {

    if (!candles || candles.length < 20) return;

    const range = candles.slice(0, 20);

    const ibHigh = Math.max(...range.map(c => c.high));
    const ibLow = Math.min(...range.map(c => c.low));

    // IB HIGH
    candleSeries.createPriceLine({
        price: ibHigh,
        color: 'lime',
        lineWidth: 2,
        title: 'IB HIGH',
    });

    // IB LOW
    candleSeries.createPriceLine({
        price: ibLow,
        color: 'red',
        lineWidth: 2,
        title: 'IB LOW',
    });
}

// =======================
// UI
// =======================
window.loadSymbol = function (symbol) {
    document.getElementById("priceBox").innerHTML =
        "📊 " + symbol;
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
