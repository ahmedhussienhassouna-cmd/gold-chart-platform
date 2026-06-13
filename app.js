let widget;

function loadSymbol(symbol){

document.getElementById("tvchart").innerHTML="";

widget=new TradingView.widget({

container_id:"tvchart",

autosize:true,

symbol:symbol,

interval:"15",

timezone:"Etc/UTC",

theme:"dark",

style:"1",

locale:"en",

hide_top_toolbar:false,

allow_symbol_change:true,

enable_publishing:false

});

}

loadSymbol("OANDA:XAUUSD");

setInterval(()=>{

document.getElementById("priceBox").innerHTML=
"🟢 Golden Trade Live";

},1000);

document.getElementById("signal").innerHTML=`
<div class="signalCard">
<div class="buy">SYSTEM READY</div>

<br>

Waiting For Strategy...
</div>
`;
