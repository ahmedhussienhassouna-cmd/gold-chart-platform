window.addEventListener("load", () => {

    const container = document.getElementById("chart");

    const chart = LightweightCharts.createChart(container, {
        layout: {
            background: { color: "#0b0b0b" },
            textColor: "#fff"
        },
        width: container.clientWidth,
        height: container.clientHeight
    });

    // ✅ FIX FOR V5+
    const series = chart.addSeries(LightweightCharts.CandlestickSeries);

    const data = [];

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
});
