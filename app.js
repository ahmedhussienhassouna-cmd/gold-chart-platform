let chart = null;
let candleSeries = null;
let vwapSeries = null;
let socket = null;

let liquidityLines = [];
let ibLines = [];
let candlesData = [];

let currentAsset = "GOLD";
let currentSymbol = "XAU/USD";

let strategyOn = false;
let liquidityOn = false;
let ibOn = false;
let vwapOn = false;

let firstLoad = true;
let isLoading = false;

const API_KEY = "88fc91a021e047e3bc8470c2705e5653";
const CURRENT_INTERVAL = "1min";

// =======================
// HELPERS
// =======================
function setText(id, value){
    const el = document.getElementById(id);
    if(el) el.innerHTML = value;
}

function updatePanel(){
    setText("panelAsset", currentAsset);
    setText("panelStrategy", strategyOn ? "ON" : "OFF");
    setText("panelLiquidity", liquidityOn ? "ON" : "OFF");
    setText("panelIB", ibOn ? "ON" : "OFF");
    setText("panelVWAP", vwapOn ? "ON" : "OFF");
}

function clearLines(){
    liquidityLines.forEach(line => candleSeries.removePriceLine(line));
    ibLines.forEach(line => candleSeries.removePriceLine(line));
    liquidityLines = [];
    ibLines = [];
}

function clearVWAP(){
    if(vwapSeries){
        chart.removeSeries(vwapSeries);
        vwapSeries = null;
    }
}

// =======================
// CREATE CHART
// =======================
function createChart(){

    const container = document.getElementById("chart");
    container.innerHTML = "";

    chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight,
        layout: {
            background: { color: "#0b0b0b" },
            textColor: "#d1d4dc"
        },
        grid: {
            vertLines: { color: "#1f1f1f" },
            horzLines: { color: "#1f1f1f" }
        },
        timeScale: {
            timeVisible: true,
            secondsVisible: false
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal
        },
        rightPriceScale: {
            borderColor: "#333"
        }
    });

    const candleOptions = {
        upColor: "#26a69a",
        downColor: "#ef5350",
        borderUpColor: "#26a69a",
        borderDownColor: "#ef5350",
        wickUpColor: "#26a69a",
        wickDownColor: "#ef5350"
    };

    if(chart.addCandlestickSeries){
        candleSeries = chart.addCandlestickSeries(candleOptions);
    } else {
        candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, candleOptions);
    }

    firstLoad = true;
    loadMarketData();
}

// =======================
// LOAD HISTORICAL DATA
// =======================
async function loadMarketData(){

    if(!candleSeries || isLoading) return;

    isLoading = true;

    const symbol = encodeURIComponent(currentSymbol);

    const url =
    `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${CURRENT_INTERVAL}&outputsize=1000&apikey=${API_KEY}`;

    try{
        const response = await fetch(url);
        const data = await response.json();

        if(!data.values){
            console.log(data);
            setText("signal", "Data error: Check API Key / Symbol");
            isLoading = false;
            return;
        }

        candlesData = data.values.reverse().map(c => ({
            time: Math.floor(new Date(c.datetime).getTime() / 1000),
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close)
        }));

        candleSeries.setData(candlesData);

        const last = candlesData[candlesData