let chart;
let series;

// =======================
// INIT CHART
// =======================
window.addEventListener("load", () => {

    const container = document.getElementById("chart");

    chart = LightweightCharts.createChart(container, {
        layout: {
            background: { color: "#0b0b0b" },
            textColor: "#fff"
        },
        width: container.clientWidth,
        height: container.clientHeight
    });

    series = chart.addCandlestickSeries();

    loadData();
});

// =======================
// FAKE GOLD DATA (Guaranteed working)
// =======================
function loadData() {

    let candles = [];
    let price = 2400;

    for (let i = 0; i < 100; i++) {

        let open = price;
        let close = price + (Math.random() - 0.5) * 10;
        let high = Math.max(open, close) + Math.random() * 5;
        let low = Math.min(open, close) - Math.random() * 5;

        candles.push({
            time: 1700000000 + i * 60,
            open,
            high,
            low,
            close
        });

        price = close;
    }

    series.setData(candles);

    document.getElementById("priceBox").innerHTML = "🟡 GOLD READY";
}

// =======================
// UI
// =======================
window.loadSymbol = function(symbol){
    document.getElementById("priceBox").innerHTML = "📊 " + symbol;
};

window.signals = function(){
    document.getElementById("signal").innerHTML =
        "SYSTEM ACTIVE 🔥";
};

window.liquidity = function(){
    document.getElementById("signal").innerHTML =
        "LIQUIDITY MODE 📉";
};
