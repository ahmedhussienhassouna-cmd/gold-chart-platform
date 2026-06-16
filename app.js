function runGoldenStrategy(candles){

    if(!candles || candles.length < 20){
        setText("signal", "Waiting for candles...");
        return;
    }

    clearStrategy();

    const cairoNow = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" })
    );

    const currentHour = cairoNow.getHours();
    const currentMinute = cairoNow.getMinutes();

    if(currentHour < 14){
        setText("signal", "⏳ First Hour Zone appears after 2:00 PM Cairo");
        return;
    }

    const lastCandle = candles[candles.length - 1];

    const targetDay = new Date(
        new Date(lastCandle.time * 1000).toLocaleString("en-US", { timeZone: "Africa/Cairo" })
    );

    const year = targetDay.getFullYear();
    const month = targetDay.getMonth();
    const day = targetDay.getDate();

    const startCairo = new Date(year, month, day, 13, 0, 0);
    const endCairo   = new Date(year, month, day, 14, 0, 0);

    const startTime = Math.floor(startCairo.getTime() / 1000);
    const endTime   = Math.floor(endCairo.getTime() / 1000);

    const firstHourCandles = candles.filter(c => {
        return c.time >= startTime && c.time < endTime;
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

    setText("signal", `✅ 1-2 PM Cairo Zone | High: ${zoneHigh} | Low: ${zoneLow}`);
}