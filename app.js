const canvas = document.createElement("canvas");
document.getElementById("chart").appendChild(canvas);
const ctx = canvas.getContext("2d");

// =======================
// RESIZE FIX
// =======================
function resize(){
    const box = document.getElementById("chart");
    canvas.width = box.clientWidth;
    canvas.height = box.clientHeight;
}
window.addEventListener("resize", resize);
resize();

// =======================
// DATA
// =======================
let candles = [];

function generateData(){

    candles = [];

    let price = 2400;

    for(let i=0;i<120;i++){

        let open = price;
        let close = price + (Math.random()-0.5)*6;
        let high = Math.max(open,close)+Math.random()*2;
        let low = Math.min(open,close)-Math.random()*2;

        candles.push({open,high,low,close});
        price = close;
    }

    document.getElementById("priceBox").innerHTML = "🟡 LIVE SIMULATION";
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

generateData();

// =======================
// UI
// =======================
window.changeAsset = function(a){
    document.getElementById("activeAsset").innerHTML = a;
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
