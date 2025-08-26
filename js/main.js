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
  play('wave');
  State.enemiesToSpawn=10+State.round*5;
  State.nextPowerup=0;
  for(var i=0;i<State.turrets.length;i++){
    if(State.turrets[i].alive) State.turrets[i].charges=[0,0];
  }
}

function maybeRestoreAssets(){
  if(State.score>=State.nextExtra){
    var missingTurrets=[], missingCities=[];
    for(var i=0;i<State.turrets.length;i++) if(!State.turrets[i].alive) missingTurrets.push(i);
    for(var j=0;j<State.cities.length;j++) if(!State.cities[j].alive) missingCities.push(j);
    var restored=0;
    if(missingTurrets.length>=2 && missingCities.length===0){
      reviveTurret(missingTurrets[0]); restored++;
      reviveTurret(missingTurrets[1]); restored++;
    }else if(missingTurrets.length>=1){
      reviveTurret(missingTurrets[0]); restored++;
      if(missingCities.length>0){
        reviveCity(missingCities[0]); restored++;
      }else if(missingTurrets.length>1){
        reviveTurret(missingTurrets[1]); restored++;
      }
    }else if(missingCities.length>0){
      reviveCity(missingCities[0]); restored++;
      if(missingCities.length>1){
        reviveCity(missingCities[1]); restored++;
      }
    }
    if(restored>0){ banner('EXTRA LIFE'); play('reward'); }
    State.nextExtra+=CONSTANTS.EXTRA_CITY_THRESH;
  }
}

function reviveCity(index){
  var c=State.cities[index];
  if(!c.alive){c.alive=true;}
}

function reviveTurret(index){
  var t=State.turrets[index];
  if(!t.alive){t.alive=true; t.charges=[0,0]; t.cool=0; t.special=null;}
}

function destroyCity(index){
  var c=State.cities[index];
  if(!c.alive) return;
  c.alive=false;
  play('playerHit');
  State.multiplierLevel=Math.max(1,State.multiplierLevel-1);
  State.multiplierCharge=100;
  State.multiplierDowngraded=true;
  flashRed();
  explode(c.x,CONSTANTS.HEIGHT-20,{visual:true});
  var alive=0; for(var i=0;i<State.cities.length;i++) if(State.cities[i].alive) alive++;
  if(alive===0){showGameOver();}
}

function destroyTurret(index){
  var t=State.turrets[index];
  if(!t.alive) return;
  t.alive=false;
  play('playerHit');
  State.multiplierLevel=Math.max(1,State.multiplierLevel-1);
  State.multiplierCharge=100;
  State.multiplierDowngraded=true;
  flashRed();
  explode(t.x,CONSTANTS.HEIGHT-40,{visual:true});
  var alive=0; for(var i=0;i<State.turrets.length;i++) if(State.turrets[i].alive) alive++;
  if(alive===0){
    State.enemiesToSpawn=0;
    State.enemies=[];
    for(var c=0;c<State.cities.length;c++){
      var city=State.cities[c];
      if(city.alive){
        city.alive=false;
        explode(city.x,CONSTANTS.HEIGHT-20,{visual:true});
      }
    }
    showGameOver();
  }
}

function init(){
  canvas=document.getElementById('game');
  ctx=canvas.getContext('2d');
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
    for(var c=0;c<2;c++){
      if(turr.charges[c]>0){
        var was=turr.charges[c];
        turr.charges[c]-=dt;
        if(turr.charges[c]<=0){
          turr.charges[c]=0;
          if(was>0) play('reload');
        }
      }
    }
    var desired=Math.atan2(State.mouseY-(CONSTANTS.HEIGHT-40),State.mouseX-turr.x);
    turr.angle+= (desired-turr.angle)*0.1;
  }
  spawnWave(dt);
  updateEnemies(dt);
  updateMissiles(dt);
  if(State.freezeUntil && now()>State.freezeUntil){State.freezeUntil=0; setBlueActive(false);}
  if(State.multiplierDowngraded){
    State.multiplierDowngraded=false;
  }else{
    State.multiplierCharge-=CONSTANTS.MULTIPLIER_DECAY*dt;
  }
  if(State.multiplierCharge<0){
    if(State.multiplierLevel>1){
      State.multiplierLevel--;
      State.multiplierCharge=100;
      State.multiplierDowngraded=true;
    }else{
      State.multiplierCharge=0;
    }
  }
  if(State.multiplierCharge>=100){
    State.multiplierCharge-=100;
    State.multiplierLevel++;
  }
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
  ctx.fillStyle=CONSTANTS.COLORS.ACCENT2;
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
    drawCharges(t);
  }
}

function drawCharges(turret){
  if(!turret.alive) return;
  var w=8, h=12, gap=10; var baseY=CONSTANTS.HEIGHT-8;
  for(var i=0;i<2;i++){
    var rem=turret.charges[i];
    var frac=1-(rem/CONSTANTS.CHARGE_TIME);
    var col=turret.special?CONSTANTS.COLORS.ACCENT3:CONSTANTS.COLORS.ACCENT4;
    var x=turret.x - w - gap/2 + i*(w+gap);
    var y=baseY-h;
    ctx.save();
    ctx.translate(x,y);
    ctx.globalAlpha=rem>0?0.3:1;
    ctx.strokeStyle='#444';
    ctx.beginPath();
    ctx.moveTo(w/2,0);
    ctx.lineTo(w, h*0.3);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.lineTo(0, h*0.3);
    ctx.closePath();
    ctx.stroke();
    if(rem<=0){ctx.strokeStyle='#fff'; ctx.stroke();}
    ctx.save();
    ctx.clip();
    if(frac>0){
      ctx.globalAlpha=1;
      ctx.fillStyle=col;
      ctx.fillRect(0,h*(1-frac),w,h*frac);
    }
    ctx.restore();
    ctx.restore();
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
  if(bonus>0){State.score+=bonus; banner('BONUS '+bonus); maybeRestoreAssets();}
  State.round++;
  play('waveClear');
  startRound();
}

window.addEventListener('load',init);
