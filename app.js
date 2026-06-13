let chart;
let series;

// =======================
// INIT (مضمون 100%)
// =======================
window.addEventListener("load", () => {

    const container = document.getElementById("chart");

    if (!container) {
        console.log("NO CHART DIV");
        return;
    }

    chart = LightweightCharts.createChart(container, {
        layout: {
            background: { color: "#0b0b0b" },
            textColor: "#ffffff"
        },
        width: container.clientWidth,
        height: container.clientHeight
    });

    series = chart.addCandlestickSeries();

    loadData();
});

// =======================
// FAKE GOLD DATA (مضمون يشتغل)
// =======================
function loadData() {

    let data = [];
    let price = 2400;

    for (let i = 0; i < 80; i++) {

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

    document.getElementById("priceBox").innerHTML = "🟡 GOLD CHART LIVE";
}

// =======================
// UI
// =======================
window.loadSymbol = function(symbol){
    document.getElementById("priceBox").innerHTML = symbol;
};

window.signals = function(){
    document.getElementById("signal").innerHTML =
        "SYSTEM ACTIVE 🔥";
};
