let widget = null;

// =======================
// TradingView Chart
// =======================
function createChart(symbol){

    const container = document.getElementById("chart");
    container.innerHTML = "";

    widget = new TradingView.widget({
        container_id: "chart",

        width: "100%",
        height: "100%",

        symbol: symbol,
        interval: "1",

        timezone: "Etc/UTC",

        theme: "dark",
        style: "1",
        locale: "en",

        allow_symbol_change: true,
        hide_top_toolbar: false,
        hide_side_toolbar: false,
        enable_publishing: false,
        withdateranges: true
    });
}

// أول تشغيل
window.addEventListener("load", () => {
    createChart("OANDA:XAUUSD");
    initOverlay();
});

// =======================
// تغيير الأصول
// =======================
window.changeAsset = function(a){

    document.getElementById("activeAsset").innerHTML = a;

    const map = {
        GOLD: "OANDA:XAUUSD",
        EURUSD: "FX:EURUSD",
        BTCUSD: "BINANCE:BTCUSDT"
    };

    if(map[a]){
        createChart(map[a]);
    }
};

// =======================
// Services
// =======================
window.service = function(type){

    const msg = {
        daily:"📊 Daily Analysis",
        strategy:"💰 Strategy",
        support:"📍 Support",
        settings:"⚙️ Settings"
    };

    document.getElementById("signal").innerHTML = msg[type];
};

// =======================
// OVERLAY SYSTEM (FIXED)
// =======================
let overlay, octx;

function initOverlay(){

    overlay = document.getElementById("overlayCanvas");
    if(!overlay) return;

    octx = overlay.getContext("2d");

    resizeOverlay();
    loopOverlay();
}

function resizeOverlay(){

    const chart = document.getElementById("chart");
    if(!chart || !overlay) return;

    overlay.width = chart.clientWidth;
    overlay.height = chart.clientHeight;
}

window.addEventListener("resize", resizeOverlay);

// =======================
// DRAW LEVELS
// =======================
function drawLevels(){

    if(!octx) return;

    octx.clearRect(0,0,overlay.width,overlay.height);

    const levels = [
        {y: 120, label:"Liquidity High"},
        {y: 260, label:"IB High"},
        {y: 420, label:"Support Zone"},
        {y: 580, label:"Liquidity Low"}
    ];

    levels.forEach(lvl => {

        octx.strokeStyle = "rgba(0,255,100,0.5)";
        octx.beginPath();
        octx.moveTo(0, lvl.y);
        octx.lineTo(overlay.width, lvl.y);
        octx.stroke();

        octx.fillStyle = "#00ff88";
        octx.fillText(lvl.label, 10, lvl.y - 5);
    });
}

// =======================
// LOOP (خفيف عشان الأداء)
// =======================
function loopOverlay(){
    drawLevels();
    setTimeout(loopOverlay, 500);
}
