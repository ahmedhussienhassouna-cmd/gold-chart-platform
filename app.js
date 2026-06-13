const container = document.getElementById("chart");

// =======================
// FIX: نظّف أي محتوى قديم (canvas)
// =======================
container.innerHTML = "";

// =======================
// TradingView Widget
// =======================
new TradingView.widget({
    container_id: "chart",

    width: "100%",
    height: "100%",

    symbol: "OANDA:XAUUSD",   // الذهب الحقيقي
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

// =======================
// UI (نفس وظائفك بدون تغيير)
// =======================
window.changeAsset = function(a){
    document.getElementById("activeAsset").innerHTML = a;

    let symbolMap = {
        GOLD: "OANDA:XAUUSD",
        EURUSD: "FX:EURUSD",
        BTCUSD: "BINANCE:BTCUSDT"
    };

    if(symbolMap[a]){
        // إعادة تحميل الشارت بسيمبول جديد
        new TradingView.widget({
            container_id: "chart",
            width: "100%",
            height: "100%",
            symbol: symbolMap[a],
            interval: "1",
            theme: "dark",
            style: "1",
            locale: "en",
            allow_symbol_change: true,
            hide_top_toolbar: false,
            hide_side_toolbar: false
        });
    }
};

window.service = function(type){

    let msg = {
        daily:"📊 Daily Analysis",
        strategy:"💰 Strategy",
        support:"📍 Support",
        settings:"⚙️ Settings"
    };

    document.getElementById("signal").innerHTML = msg[type];
};
