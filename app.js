const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");

// =======================
// RESIZE
// =======================
function resize(){
    canvas.width = window.innerWidth - 560;
    canvas.height = window.innerHeight - 55;
}
window.addEventListener("resize", resize);
resize();

// =======================
// API KEY
// =======================
const API_KEY = "47d321948be348c68c998b1b08dbecea";

// =======================
// DATA
// =======================
let candles = [];

// =======================
// FETCH LIVE GOLD
// =======================
async function loadLive(){

    try{

        const url = https://api.twelvedata.com/time_series?symbol=XAU/USD&interval=1min&outputsize=120&apikey=${API_KEY};

        const res = await fetch(url);
        const data = await res.json();

        if(!data.values){
            console.log("API ERROR:", data);
            return;
        }

        candles = data.values.map(c => ({
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close)
        })).reverse();

        document.getElementById("priceBox").innerHTML = "🟡 LIVE GOLD";

    } catch(err){
        console.log("FETCH ERROR:", err);
    }
}

// =======================
// DRAW
// =======================
function draw(){

    ctx.clearRect(0,0,canvas.width,canvas.height);

    if(!candles.length) return;

    let x = 40;
    let w = 6;

    let max = Math.max(...candles.map(c=>c.high));
    let min = Math.min(...candles.map(c=>c.low));

    function y(p){
        return canvas.height - ((p-min)/(max-min))*canvas.height;
    }

    candles.forEach(c=>{

        ctx.strokeStyle="#888";
        ctx.beginPath();
        ctx.moveTo(x,y(c.high));
        ctx.lineTo(x,y(c.low));
        ctx.stroke();

        ctx.fillStyle = c.close > c.open ? "#00ff88" : "#ff4d4d";
        ctx.fillRect(
            x-2,
            Math.min(y(c.open),y(c.close)),
            w,
            Math.abs(y(c.open)-y(c.close))
        );

        x += 10;
    });
}

// =======================
// LOOP
// =======================
function loop(){
    draw();
    requestAnimationFrame(loop);
}
loop();

// =======================
// START LIVE DATA
// =======================
loadLive();

// تحديث كل دقيقة
setInterval(loadLive, 60000);

// =======================
// UI ACTIONS
// =======================
window.changeAsset = function(asset){
    document.getElementById("activeAsset").innerHTML = asset;
    document.getElementById("priceBox").innerHTML = asset + " LOADED";
};

window.service = function(type){

    let msg = "";

    if(type === "daily") msg = "📊 التحليل اليومي";
    if(type === "strategy") msg = "💰 إستراتيجية فلوس";
    if(type === "support") msg = "📍 الدعم الفني";
    if(type === "settings") msg = "⚙️ Settings";

    document.getElementById("signal").innerHTML = msg;
};
