let widget;

// =======================
// تحميل الشارت
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

// تشغيل افتراضي
loadSymbol("OANDA:XAUUSD");


// =======================
// Live Status Box
// =======================
setInterval(() => {
  document.getElementById("priceBox").innerHTML =
    "🟢 Golden Trade Live";
}, 1000);


// =======================
// Signal Box (Default)
// =======================
document.getElementById("signal").innerHTML = `
<div class="signalCard">
  <div class="buy">SYSTEM READY</div>
  <br>
  Waiting For Strategy...
</div>
`;


// =======================
// BUTTONS FUNCTIONS
// =======================

// Signals
function signals(){
  document.getElementById("signal").innerHTML = `
  <div class="signalCard">
    <div class="buy">SIGNALS MODE</div>
    <br>
    Watching market structure...
  </div>`;
}

// Liquidity
function liquidity(){
  document.getElementById("signal").innerHTML = `
  <div class="signalCard">
    <div class="buy">LIQUIDITY MODE</div>
    <br>
    Detecting liquidity zones...
  </div>`;
}

// Price Action
function priceAction(){
  document.getElementById("signal").innerHTML = `
  <div class="signalCard">
    <div class="buy">PRICE ACTION</div>
    <br>
    Analyzing candles...
  </div>`;
}

// POC
function poc(){
  document.getElementById("signal").innerHTML = `
  <div class="signalCard">
    <div class="buy">POC MODE</div>
    <br>
    Calculating Point of Control...
  </div>`;
}

// Settings
function settings(){
  document.getElementById("signal").innerHTML = `
  <div class="signalCard">
    <div class="buy">SETTINGS</div>
    <br>
    Control panel opened...
  </div>`;
}
