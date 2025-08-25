var enemySpawnTimer=0;

function pickTarget(){
  var targets=[];
  for(var i=0;i<State.cities.length;i++){if(State.cities[i].alive) targets.push({type:'city',index:i,x:State.cities[i].x,y:CONSTANTS.HEIGHT-20});}
  for(var j=0;j<State.turrets.length;j++){if(State.turrets[j].alive) targets.push({type:'turret',index:j,x:State.turrets[j].x,y:CONSTANTS.HEIGHT-40});}
  return targets.length?pick(targets):null;
}

function spawnWave(dt){
  enemySpawnTimer-=dt;
  if(enemySpawnTimer<=0 && State.enemiesToSpawn>0){
    enemySpawnTimer=randRange(0.6,1.2);
    var target=pickTarget();
    if(target){
      var sx=randRange(40,CONSTANTS.WIDTH-40);
      var type='normal';
      var speed=CONSTANTS.ENEMY_SPEED*(1+0.1*(State.round-1));
      var meteorChance=0.1+0.05*(State.round-1);
      if(Math.random()<meteorChance){type='meteor'; speed=CONSTANTS.METEOR_SPEED;}
      if(State.round>4 && Math.random()<0.05){type='split'; speed=CONSTANTS.SPLIT_SPEED;}
      if(State.round===1) speed*=0.6;
      State.enemies.push({x:sx,y:0,tx:target.x,ty:target.y,speed:speed,type:type,split:0,carrier:false,target:target});
      State.enemiesToSpawn--;
    }
  }
  maybeSpawnCarrier();
}

function enemyHit(index){
  var e=State.enemies[index];
  if(e.carrier && e.hitBy!=null && State.turrets[e.hitBy]){
    grantPower(State.turrets[e.hitBy],e.power);
  }
  if(e.type==='split' && e.split<1){
    for(var i=0;i<2;i++){
      var t=pickTarget();
      if(t) State.enemies.push({x:e.x,y:e.y,tx:t.x,ty:t.y,speed:CONSTANTS.SPLIT_SPEED,type:'split',split:1,carrier:false,target:t,immuneUntil:now()+CONSTANTS.SPAWN_IMMUNITY});
    }
    play('split');
  }else if(e.type==='meteor' && e.split<2){
    var count=e.split===0?2:4;
    for(i=0;i<count;i++){
      var t2=pickTarget();
      if(t2) State.enemies.push({x:e.x,y:e.y,tx:t2.x,ty:t2.y,speed:CONSTANTS.METEOR_SPEED,type:'meteor',split:e.split+1,carrier:false,target:t2,immuneUntil:now()+CONSTANTS.SPAWN_IMMUNITY});
    }
    play('split');
  }
  State.enemies.splice(index,1);
  State.score+=CONSTANTS.POINTS_PER_KILL*State.multiplierLevel;
  State.multiplierCharge+=CONSTANTS.MULTIPLIER_CHARGE;
  play('hit');
  explode(e.x,e.y,{enemy:true,turretIndex:e.hitBy});
  maybeExtraCity();
}

function updateEnemies(dt){
  for(var i=State.enemies.length-1;i>=0;i--){
    var e=State.enemies[i];
    var speed=e.speed;
    if(now()<State.freezeUntil) speed*=0.5;
    var ang=Math.atan2(e.ty-e.y,e.tx-e.x);
    e.x+=Math.cos(ang)*speed*dt;
    e.y+=Math.sin(ang)*speed*dt;
    e.ang=ang;
    if(distanceSq(e.x,e.y,e.tx,e.ty)<25){
      explode(e.tx,e.ty,{enemy:true});
      State.enemies.splice(i,1);
      if(e.target){
        if(e.target.type==='city'){
          var c=State.cities[e.target.index];
          if(c.alive){destroyCity(e.target.index);}
        }else if(e.target.type==='turret'){
          if(State.turrets[e.target.index].alive){destroyTurret(e.target.index);}
        }
      }
    }
  }
}

function enemyColor(e){
  if(e.type==='meteor') return '#888888';
  return CONSTANTS.COLORS.WARNING;
}

function drawEnemies(ctx){
  for(var i=0;i<State.enemies.length;i++){
    var e=State.enemies[i];
    var col=enemyColor(e);
    ctx.strokeStyle=col;
    ctx.beginPath();
    ctx.moveTo(e.x,e.y);
    var tail=e.type==='split'?6:(e.type==='meteor'?4:8);
    ctx.lineTo(e.x-Math.cos(e.ang)*tail,e.y-Math.sin(e.ang)*tail);
    ctx.stroke();
    if(e.carrier){
      ctx.fillStyle=col;
      ctx.beginPath();ctx.arc(e.x,e.y,3,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=CONSTANTS.COLORS.ACCENT1;
      ctx.beginPath();ctx.arc(e.x,e.y,5,0,Math.PI*2);ctx.stroke();
    }else if(e.type==='meteor'){
      ctx.fillStyle='#888888';
      ctx.beginPath();ctx.arc(e.x,e.y,3,0,Math.PI*2);ctx.fill();
    }else{
      ctx.fillStyle=col;
      ctx.beginPath();ctx.arc(e.x,e.y,2,0,Math.PI*2);ctx.fill();
    }
  }
}
