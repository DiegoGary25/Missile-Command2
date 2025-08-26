var audioCtx=null;
var SFX={
  thrust:[110,0.2],
  shoot:[880,0.1],
  chargedReady:[1200,0.15],
  chargedRelease:[600,0.2],
  asteroidHit:[700,0.1],
  asteroidSplit:[500,0.2],
  asteroidDestroy:[300,0.3],
  bomb:[200,0.25],
  enemyShot:[250,0.2],
  playerHit:[150,0.3],
  powerup:[1000,0.3],
  reload:[900,0.1],
  reward:[1000,0.4],
  wave:[440,0.4],
  waveClear:[660,0.4],
  ui:[550,0.1]
};
function initAudio(){
  if(!audioCtx){
    try{audioCtx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){audioCtx=null;}
  }
}
window.addEventListener('pointerdown',initAudio,{once:true});
window.addEventListener('keydown',initAudio,{once:true});
function play(name){
  var def=SFX[name];
  if(!def) return;
  if(!audioCtx) return;
  try{
    var osc=audioCtx.createOscillator();
    osc.type='square';
    osc.frequency.value=def[0];
    var gain=audioCtx.createGain();
    var now=audioCtx.currentTime;
    gain.gain.setValueAtTime(0.1,now);
    gain.gain.exponentialRampToValueAtTime(0.0001,now+def[1]);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now+def[1]);
  }catch(e){}
}
