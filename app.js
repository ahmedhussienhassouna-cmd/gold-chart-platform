let chart;
let series;

window.addEventListener("load", () => {

    const container = document.getElementById("chart");

    chart = LightweightCharts.createChart(container, {
        layout: {
            background: { color: "#0b0b0b" },
            textColor: "#ffffff",
        },
        width: container.clientWidth,
        height: container.clientHeight,
    });

    // ✅ FIX FOR VERSION 5+
    series = chart.addSeries(LightweightCharts.CandlestickSeries);

    loadData();
});

// =======================
// DEMO DATA (GOLD)
// =======================
function loadData() {

    let data = [];
    let price = 2400;

    for (let i = 0; i < 100; i++) {

        let open = price;
        let close = price + (Math.random() - 0.5) * 8;
        let high = Math.max(open, close) + Math.random() * 4;
        let low = Math.min(open, close) - Math.random() * 4;

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

    document.getElementById("priceBox").innerHTML = "🟡 GOLD LIVE";
}

// =======================
window.loadSymbol = function(symbol){
    document.getElementById("priceBox").innerHTML = symbol;
};

window.signals = function(){
    document.getElementById("signal").innerHTML = "SYSTEM ACTIVE 🔥";
};
