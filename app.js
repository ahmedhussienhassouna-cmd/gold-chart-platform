async function runGoldenStrategy(candles){

    clearStrategy();

    if(!candleSeries){
        setText("signal", "Chart not ready");
        return;
    }

    try{
        const response = await fetch("strategy-levels.json?v=" + Date.now());

        if(!response.ok){
            setText("signal", "Strategy file not found");
            return;
        }

        const levels = await response.json();

        const high = roundPrice(levels.high);
        const low  = roundPrice(levels.low);
        const message = levels.message || "Golden Trade Strategy Zone";

        if(!high || !low){
            setText("signal", "Strategy levels missing");
            return;
        }

        strategyLines.push(
            candleSeries.createPriceLine({
                price: high,
                color: "#00ff66",
                lineWidth: 2,
                lineStyle: LightweightCharts.LineStyle.Solid,
                axisLabelVisible: true,
                title: "Strategy High"
            })
        );

        strategyLines.push(
            candleSeries.createPriceLine({
                price: low,
                color: "#ff3333",
                lineWidth: 2,
                lineStyle: LightweightCharts.LineStyle.Solid,
                axisLabelVisible: true,
                title: "Strategy Low"
            })
        );

        setText("signal", `✅ ${message} | High: ${high} | Low: ${low}`);

    }catch(error){
        console.error("Strategy Error:", error);
        setText("signal", "Strategy levels error");
    }
}