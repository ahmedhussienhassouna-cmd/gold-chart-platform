let widget;

// =======================
// CHART
// =======================
function loadSymbol(symbol){

  document.getElementById("tvchart").innerHTML = "";

  widget = new TradingView.widget({
    container_id: "tvchart",
    autosize: true,
    symbol: symbol,
    interval: "15",
    timezone: "Etc/UTC",
    theme: "dark",
    style: "1",
    locale: "en",
    hide_top_toolbar: false,
    allow_symbol_change: true,
    enable_publishing: false
  });
}

loadSymbol("OANDA:XAUUSD");


// =======================
// LIVE STATUS
// =======================
setInterval(() => {
  document.getElementById("priceBox").innerHTML =
    "🟢 Golden Trade Live";
}, 1000);


// =======================
// DEFAULT SIGNAL
// =======================
document.getElementById("signal").innerHTML = `
<div class="signalCard">
  <div class="buy">SYSTEM READY</div>
  <br>
  Waiting For Strategy...
</div>
`;


// =======================
// SIGNALS
// =======================
window.signals = function(){
  document.getElementById("signal").innerHTML = `
  <div class="signalCard">
    <div class="buy">SIGNALS MODE</div>
    <br>
    Watching market structure...
  </div>`;
};


// =======================
// LIQUIDITY IB STRATEGY (YOUR CODE CONVERTED)
// =======================

let ibHigh = null;
let ibLow = null;
let barCount = 0;

let brokeHigh = false;
let brokeLow = false;

let buyBreakPrice = null;
let sellBreakPrice = null;

window.liquidity = function(){

    // fake price engine (بديل للبيانات الحقيقية)
    let price = 100 + Math.random() * 10;

    const barsIB = 12;
    const moveMin = 0.7;
    const moveMax = 1.0;

    // build IB
    if(barCount < barsIB){
        ibHigh = ibHigh === null ? price : Math.max(ibHigh, price);
        ibLow  = ibLow === null ? price : Math.min(ibLow, price);
        barCount++;
    }

    // breakout logic
    if(!brokeHigh && ibHigh && price > ibHigh){
        brokeHigh = true;
        buyBreakPrice = price;
    }

    if(!brokeLow && ibLow && price < ibLow){
        brokeLow = true;
        sellBreakPrice = price;
    }

    // momentum
    let buyMove = buyBreakPrice ? (price - buyBreakPrice) : null;
    let sellMove = sellBreakPrice ? (sellBreakPrice - price) : null;

    let signal = "NO TRADE";
    let color = "#aaaaaa";

    if(buyMove && buyMove >= moveMin && buyMove <= moveMax){
        signal = "BUY IB MOMENTUM";
        color = "#00ff88";
    }

    if(sellMove && sellMove >= moveMin && sellMove <= moveMax){
        signal = "SELL IB MOMENTUM";
        color = "#ff4d4d";
    }

    document.getElementById("signal").innerHTML = `
        <div class="signalCard">
            <div class="buy" style="color:${color}">
                ${signal}
            </div>
            <br>
            IB High: ${ibHigh?.toFixed(2)} <br>
            IB Low: ${ibLow?.toFixed(2)} <br>
            Price: ${price.toFixed(2)} <br>
            Bars: ${barCount}/${barsIB}
        </div>
    `;
};


// =======================
// PRICE ACTION
// =======================
window.priceAction = function(){
  document.getElementById("signal").innerHTML = `
  <div class="signalCard">
    <div class="buy">PRICE ACTION</div>
    <br>
    Analyzing candles...
  </div>`;
};


// =======================
// POC
// =======================
window.poc = function(){
  document.getElementById("signal").innerHTML = `
  <div class="signalCard">
    <div class="buy">POC MODE</div>
    <br>
    Calculating Point of Control...
  </div>`;
};


// =======================
// SETTINGS
// =======================
window.settings = function(){
  document.getElementById("signal").innerHTML = `
  <div class="signalCard">
    <div class="buy">SETTINGS</div>
    <br>
    Control panel opened...
  </div>`;
};
