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
// DATA
// =======================
let candles = [];

function generate(){

    candles = [];

    let price = 2400;

    for(let i=0;i<120;i++){

        let open = price;
        let close = price + (Math.random()-0.5)*8;
        let high = Math.max(open,close)+Math.random()*3;
        let low = Math.min(open,close)-Math.random()*3;

        candles.push({open,high,low,close});
        price = close;
    }

    document.getElementById("priceBox").innerHTML = "GOLD READY";
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

        ctx.fillStyle = c.close>c.open ? "#00ff88" : "#ff4d4d";
        ctx.fillRect(x-2,Math.min(y(c.open),y(c.close)),w,Math.abs(y(c.open)-y(c.close)));

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

generate();

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
