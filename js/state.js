var State = {
  cities:[],
  turrets:[],
  enemies:[],
  playerMissiles:[],
  explosions:[],
  score:0,
  round:1,
  enemiesToSpawn:0,
  multiplierLevel:1,
  multiplierCharge:0,
  freezeUntil:0,
  nextPowerup:0,
  bannerTimer:0,
  mouseX:400,
  mouseY:300,
  nextExtra:50000
};

function resetState(){
  State.cities=[];
  State.turrets=[];
  var t1=CONSTANTS.TURRETS[0].x;
  var t2=CONSTANTS.TURRETS[1].x;
  var t3=CONSTANTS.TURRETS[2].x;
  var s1=(t2-t1)/4;
  var s2=(t3-t2)/4;
  State.cities.push({x:t1+s1,alive:true},{x:t1+2*s1,alive:true},{x:t1+3*s1,alive:true});
  State.cities.push({x:t2+s2,alive:true},{x:t2+2*s2,alive:true},{x:t2+3*s2,alive:true});
  for(var i=0;i<CONSTANTS.TURRETS.length;i++){
    State.turrets.push({x:CONSTANTS.TURRETS[i].x,charges:[0,0],cool:0,special:null,id:i,angle:-Math.PI/2,alive:true});
  }
  State.enemies=[];
  State.playerMissiles=[];
  State.explosions=[];
  State.score=0;
  State.round=1;
  State.enemiesToSpawn=0;
  State.multiplierLevel=1;
  State.multiplierCharge=0;
  State.freezeUntil=0;
  State.nextPowerup=0;
  State.bannerTimer=0;
  State.mouseX=400; State.mouseY=300;
  State.nextExtra=CONSTANTS.EXTRA_CITY_THRESH;
}
