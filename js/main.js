var canvas,ctx,lastTime=0;

if(location.protocol==='file:'){
  console.log('Running in FILE mode. No modules or external runtimes present.');
}

function startGame(){
  resetState();
  startRound();
  lastTime=now();
}

function startRound(){
  banner('ROUND '+State.round);
  play('level_start');
  State.enemiesToSpawn=10+State.round*5;
  State.nextPowerup=0;
  for(var i=0;i<State.turrets.length;i++){
    if(State.turrets[i].alive) State.turrets[i].charges=[0,0];
  }
}

function maybeExtraCity(){
  if(State.score>=State.nextExtra){
    var revived=false;
    for(var i=0;i<State.cities.length;i++){
      if(!State.cities[i].alive){State.cities[i].alive=true; revived=true; banner('EXTRA CITY'); break;}
    }
    if(!revived){State.score+=CONSTANTS.CITY_BONUS; banner('BONUS '+CONSTANTS.CITY_BONUS);}
    State.nextExtra+=CONSTANTS.EXTRA_CITY_THRESH;
  }
}

function destroyCity(index){
  var c=State.cities[index];
  if(!c.alive) return;
  c.alive=false;
  play('impact_city');
  State.multiplierLevel=Math.max(1,State.multiplierLevel-1);
  flashRed();
  var alive=0; for(var i=0;i<State.cities.length;i++) if(State.cities[i].alive) alive++;
  if(alive===0){showGameOver();}
}

function destroyTurret(index){
  var t=State.turrets[index];
  if(!t.alive) return;
  t.alive=false;
  play('impact_turret');
  State.multiplierLevel=Math.max(1,State.multiplierLevel-1);
  flashRed();
}

function init(){
  canvas=document.getElementById('game');
  ctx=canvas.getContext('2d');
  var styles=getComputedStyle(document.documentElement);
  CONSTANTS.COLORS.PRIMARY_BLUE=styles.getPropertyValue('--primaryBlue').trim()||styles.getPropertyValue('--accent2').trim();
  initEffects();
  initUI();
  initInput(canvas);
  startGame();
  requestAnimationFrame(loop);
}

function loop(t){
  requestAnimationFrame(loop);
  var n=now();
  var dt=n-lastTime; lastTime=n;
  for(var i=0;i<State.turrets.length;i++){
    var turr=State.turrets[i];
    if(!turr.alive) continue;
    if(turr.cool>0) turr.cool-=dt;
    for(var c=0;c<2;c++){ if(turr.charges[c]>0){ turr.charges[c]-=dt; if(turr.charges[c]<0) turr.charges[c]=0; } }
    var desired=Math.atan2(State.mouseY-(CONSTANTS.HEIGHT-40),State.mouseX-turr.x);
    turr.angle+= (desired-turr.angle)*0.1;
  }
  spawnWave(dt);
  updateEnemies(dt);
  updateMissiles(dt);
  if(State.freezeUntil && now()>State.freezeUntil){State.freezeUntil=0; setBlueActive(false);}
  State.multiplierCharge-=CONSTANTS.MULTIPLIER_DECAY*dt;
  if(State.multiplierCharge<0){State.multiplierCharge=0; if(State.multiplierLevel>1) State.multiplierLevel--;}
  if(State.multiplierCharge>=100){State.multiplierCharge=0; State.multiplierLevel++; banner('x'+State.multiplierLevel);}
  draw();
  updateUI();
  if(State.enemiesToSpawn<=0 && State.enemies.length===0 && State.playerMissiles.length===0 && State.explosions.length===0){
    endRound();
  }
}

function draw(){
  ctx.clearRect(0,0,CONSTANTS.WIDTH,CONSTANTS.HEIGHT);
  drawEnemies(ctx);
  drawMissiles(ctx);
  drawTerrain();
  drawCities();
  drawTurrets();
}

function drawTerrain(){
  var base=CONSTANTS.HEIGHT-20;
  ctx.fillStyle=CONSTANTS.COLORS.PRIMARY_BLUE || CONSTANTS.COLORS.ACCENT2;
  ctx.beginPath();
  ctx.moveTo(0,base);
  for(var i=0;i<CONSTANTS.TURRETS.length;i++){
    var x=CONSTANTS.TURRETS[i].x;
    ctx.lineTo(x-60,base);
    ctx.lineTo(x-20,base-30);
    ctx.lineTo(x+20,base-30);
    ctx.lineTo(x+60,base);
  }
  ctx.lineTo(CONSTANTS.WIDTH,base);
  ctx.lineTo(CONSTANTS.WIDTH,CONSTANTS.HEIGHT);
  ctx.lineTo(0,CONSTANTS.HEIGHT);
  ctx.closePath();
  ctx.fill();
}

function drawTurrets(){
  for(var i=0;i<State.turrets.length;i++){
    var t=State.turrets[i];
    if(!t.alive) continue;
    var baseY=CONSTANTS.HEIGHT-40;
    ctx.save();
    ctx.translate(t.x,baseY);
    ctx.fillStyle='#000';
    ctx.fillRect(-10,0,20,10);
    ctx.rotate(t.angle);
    ctx.fillStyle='#fff';
    ctx.fillRect(0,-2,20,4);
    ctx.restore();
    drawCooldown(t);
  }
}

function drawCooldown(turret){
  if(!turret.alive) return;
  var w=30; var h=4;
  var x=turret.x-w/2; var y=CONSTANTS.HEIGHT-8;
  ctx.fillStyle='#444';
  ctx.fillRect(x,y,w,h);
  for(var i=0;i<2;i++){
    var frac=1-(turret.charges[i]/CONSTANTS.CHARGE_TIME);
    if(frac>0){
      ctx.fillStyle=turret.special?CONSTANTS.COLORS.ACCENT3:'#fff';
      ctx.fillRect(x+i*w/2,y,(w/2)*clamp(frac,0,1),h);
    }
  }
}

function drawCities(){
  ctx.fillStyle=CONSTANTS.COLORS.ACCENT1;
  for(var i=0;i<State.cities.length;i++){
    var c=State.cities[i];
    if(!c.alive) continue;
    var x=c.x, y=CONSTANTS.HEIGHT-20;
    ctx.beginPath();
    ctx.moveTo(x-12,y); ctx.lineTo(x-12,y-10); ctx.lineTo(x,y-18); ctx.lineTo(x+12,y-10); ctx.lineTo(x+12,y); ctx.closePath();
    ctx.fill();
  }
}

function endRound(){
  var alive=0; for(var i=0;i<State.cities.length;i++) if(State.cities[i].alive) alive++;
  var bonus=(alive*CONSTANTS.CITY_BONUS)*State.multiplierLevel;
  if(bonus>0){State.score+=bonus; banner('BONUS '+bonus); maybeExtraCity();}
  State.round++;
  startRound();
}

window.addEventListener('load',init);
