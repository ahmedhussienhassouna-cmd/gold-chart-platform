let chart;
let series;

// =======================
// INIT CHART (SAFE VERSION)
// =======================
window.addEventListener("load", () => {

    const container = document.getElementById("chart");

    if (!container) {
        console.log("NO CHART CONTAINER");
        return;
    }

    chart = LightweightCharts.createChart(container, {
        layout: {
            background: { color: "#0b0b0b" },
            textColor: "#ffffff",
        },
        width: container.clientWidth,
        height: container.clientHeight,
    });

    series = chart.addCandlestickSeries();

    generateData();
});

// =======================
// FAKE GOLD DATA (STABLE)
// =======================
function generateData() {

    let data = [];
    let price = 2400;

    for (let i = 0; i < 100; i++) {

        let open = price;
        let close = price + (Math.random() - 0.5) * 10;
        let high = Math.max(open, close) + Math.random() * 5;
        let low = Math.min(open, close) - Math.random() * 5;

        data.push({
            time: 1700000000 + i * 60,
            open,
            high,
            low,
            close
        });

        price = close;
    }

    series.setData(data);

    document.getElementById("priceBox").innerHTML = "🟡 GOLD READY";
}

// =======================
// UI
// =======================
window.loadSymbol = function () {
    document.getElementById("priceBox").innerHTML = "XAUUSD LOADED";
};

window.signals = function () {
    document.getElementById("signal").innerHTML = "SYSTEM ACTIVE 🔥";
};
