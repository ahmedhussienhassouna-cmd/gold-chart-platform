let chart = null;
let candleSeries = null;

// =======================
// INIT CHART (TradingView style)
// =======================
function initChart() {

    const container = document.getElementById("chart");

    chart = LightweightCharts.createChart(container, {
        layout: {
            background: { color: '#0b0b0b' },
            textColor: '#ffffff',
        },
        grid: {
            vertLines: { color: '#1f1f1f' },
            horzLines: { color: '#1f1f1f' },
        },
        width: container.clientWidth,
        height: container.clientHeight,
    });

    candleSeries = chart.addCandlestickSeries();
}

initChart();

// =======================
// GOLD LIVE DATA (XAUUSD)
// =======================
async function loadData() {

    try {

        const url =
            "https://api.twelvedata.com/time_series?symbol=XAU/USD&interval=1min&outputsize=200&apikey=PUT_YOUR_API_KEY_HERE";

        const res = await fetch(url);
        const data = await res.json();

        if (!data.values) {
            console.log("API ERROR:", data);
            return;
        }

        const candles = data.values.reverse().map(c => ({
            time: new Date(c.datetime).getTime() / 1000,
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
        console.log("FETCH ERROR:", err);
    }
}

// أول تحميل
loadData();

// تحديث كل دقيقة
setInterval(loadData, 60000);

// =======================
// RESIZE FIX
// =======================
window.addEventListener("resize", () => {

    const container = document.getElementById("chart");

    chart.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
    });
});

// =======================
// IB ENGINE (First 20 candles)
// =======================
function drawIB(candles) {

    if (!candles || candles.length < 20) return;

    const firstRange = candles.slice(0, 20);

    let ibHigh = Math.max(...firstRange.map(c => c.high));
    let ibLow = Math.min(...firstRange.map(c => c.low));

    // خطوط IB
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
        "📊 " + symbol + " loaded";
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
