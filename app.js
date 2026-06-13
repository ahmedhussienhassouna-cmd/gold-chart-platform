let widget = null;

function createChart(symbol){

    const container = document.getElementById("chart");

    // مهم جدًا: تنظيف القديم
    container.innerHTML = "";

    // إنشاء جديد
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

// =======================
// أول تشغيل (بعد تحميل الصفحة)
window.addEventListener("load", () => {
    createChart("OANDA:XAUUSD");
});

// =======================
// تغيير الأصول
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
window.service = function(type){

    let msg = {
        daily:"📊 Daily Analysis",
        strategy:"💰 Strategy",
        support:"📍 Support",
        settings:"⚙️ Settings"
    };

    document.getElementById("signal").innerHTML = msg[type];
};
