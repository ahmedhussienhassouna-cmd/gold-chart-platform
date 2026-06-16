function runGoldenStrategy(candles){

    if(!candles || candles.length < 20){
        setText("signal", "Waiting for candles...");
        return;
    }

    clearStrategy();

    const nowCairo = new Date().toLocaleString("en-US", {
        timeZone: "Africa/Cairo",
        hour12: false
    });

    const cairoNow = new Date(nowCairo);

    if(cairoNow.getHours() < 14){
        setText("signal", "⏳ Strategy appears after 2:00 PM Cairo");
        return;
    }

    const lastCandle = candles[candles.length - 1];

    const lastCairoString = new Date(lastCandle.time * 1000).toLocaleString("en-US", {
        timeZone: "Africa/Cairo",
        hour12: false
    });

    const lastCairoDate = new Date(lastCairoString);

    const year = lastCairoDate.getFullYear();
    const month = lastCairoDate.getMonth();
    const day = lastCairoDate.getDate();

    const firstHourCandles = candles.filter(c => {

        const cairoString = new Date(c.time * 1000).toLocaleString("en-US", {
            timeZone: "Africa/Cairo",
            hour12: false
        });

        const cairoDate = new Date(cairoString);

        return (
            cairoDate.getFullYear() === year &&
            cairoDate.getMonth() === month &&
            cairoDate.getDate() === day &&
            cairoDate.getHours() === 13
        );
    });

    if(firstHourCandles.length < 1){
        setText("signal", "No candles found between 1:00 PM and 2:00 PM Cairo");
        return;
    }

    const zoneHigh = roundPrice(Math.max(...firstHourCandles.map(c => c.high)));
    const zoneLow  = roundPrice(Math.min(...firstHourCandles.map(c => c.low)));

    strategyLines.push(
        candleSeries.createPriceLine({
            price: zoneHigh,
            color: "#00ff66",
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Solid,
            axisLabelVisible: true,
            title: "1-2 PM High"
        })
    );

    strategyLines.push(
        candleSeries.createPriceLine({
            price: zoneLow,
            color: "#ff3333",
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Solid,
            axisLabelVisible: true,
            title: "1-2 PM Low"
        })
    );

    setText("signal", `✅ Strategy Zone | 1-2 PM Cairo | High: ${zoneHigh} | Low: ${zoneLow}`);
}