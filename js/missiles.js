function shoot(turret,x,y){
  if(turret.special){
    if(turret.special==='cluster') fireCluster(turret,x,y);
    else if(turret.special==='freezer') fireFreezer(turret,x,y);
    else if(turret.special==='chain') fireChain(turret,x,y);
    else if(turret.special==='seeker') fireSeeker(turret,x,y);
    turret.special=null;
  }else{
    fireNormal(turret,x,y);
  }
}

function fireNormal(turret,x,y){
  turret.ammo--; turret.cool=CONSTANTS.TURRET_COOLDOWN; play('shoot');
  State.playerMissiles.push({turretIndex:turret.id,x:turret.x,y:CONSTANTS.HEIGHT-40,tx:x,ty:y,spd:CONSTANTS.MISSILE_SPEED,ang:Math.atan2(y-(CONSTANTS.HEIGHT-40),x-turret.x)});
}

function fireCluster(turret,x,y){
  turret.ammo--; turret.cool=CONSTANTS.TURRET_COOLDOWN; play('shoot');
  State.playerMissiles.push({turretIndex:turret.id,cluster:true,x:turret.x,y:CONSTANTS.HEIGHT-40,tx:x,ty:y,spd:CONSTANTS.MISSILE_SPEED,ang:Math.atan2(y-(CONSTANTS.HEIGHT-40),x-turret.x)});
}
function fireFreezer(turret,x,y){
  turret.ammo--; turret.cool=CONSTANTS.TURRET_COOLDOWN; play('shoot');
  State.playerMissiles.push({turretIndex:turret.id,freezer:true,x:turret.x,y:CONSTANTS.HEIGHT-40,tx:x,ty:y,spd:CONSTANTS.MISSILE_SPEED,ang:Math.atan2(y-(CONSTANTS.HEIGHT-40),x-turret.x)});
}
function fireChain(turret,x,y){
  turret.ammo--; turret.cool=CONSTANTS.TURRET_COOLDOWN; play('shoot');
  State.playerMissiles.push({turretIndex:turret.id,chain:true,x:turret.x,y:CONSTANTS.HEIGHT-40,tx:x,ty:y,spd:CONSTANTS.MISSILE_SPEED,ang:Math.atan2(y-(CONSTANTS.HEIGHT-40),x-turret.x)});
}
function fireSeeker(turret,x,y){
  turret.ammo--; turret.cool=CONSTANTS.TURRET_COOLDOWN; play('shoot');
  State.playerMissiles.push({turretIndex:turret.id,x:turret.x,y:CONSTANTS.HEIGHT-40,tx:x,ty:y,spd:CONSTANTS.MISSILE_SPEED,ang:Math.atan2(y-(CONSTANTS.HEIGHT-40),x-turret.x),spawnSeekers:true});
}

function updateMissiles(dt){
  for(var i=State.playerMissiles.length-1;i>=0;i--){
    var m=State.playerMissiles[i];
    var dx=m.tx-m.x,dy=m.ty-m.y;
    var dist=Math.sqrt(dx*dx+dy*dy);
    var step=m.spd*dt;
    if(step>=dist){
      m.x=m.tx; m.y=m.ty; m.ang=Math.atan2(dy,dx);
      explode(m.tx,m.ty,m);
      State.playerMissiles.splice(i,1);
    }else{
      m.x+=dx/dist*step;
      m.y+=dy/dist*step;
      m.ang=Math.atan2(dy,dx);
    }
    if(m.seeker){
      m.life-=dt;
      if(m.life<=0){
        explode(m.x,m.y,m); State.playerMissiles.splice(i,1); continue;
      }
      var target=findNearestEnemy(m.x,m.y);
      if(target){m.tx=target.x; m.ty=target.y;}
    }
  }
  for(var j=State.explosions.length-1;j>=0;j--){
    var e=State.explosions[j];
    if(e.chain){
      e.life-=dt;
      for(var k=State.enemies.length-1;k>=0;k--){
        var en=State.enemies[k];
        if(Math.abs(en.y-e.y)<4){
          if(en.immuneUntil && now()<en.immuneUntil) continue;
          en.hitBy=e.turretIndex;
          enemyHit(k);
        }
      }
      if(e.life<=0) State.explosions.splice(j,1);
      continue;
    }
    e.r+=200*dt;
    if(e.r>e.max) e.life-=dt;
    for(var k=State.enemies.length-1;k>=0;k--){
      var en=State.enemies[k];
      if(distanceSq(e.x,e.y,en.x,en.y)<e.r*e.r){
        if(en.immuneUntil && now()<en.immuneUntil) continue;
        en.hitBy=e.turretIndex;
        enemyHit(k);
      }
    }
    if(e.enemy){
      for(var t=0;t<State.turrets.length;t++){
        var tur=State.turrets[t];
        if(tur.alive && distanceSq(e.x,e.y,tur.x,CONSTANTS.HEIGHT-40)<e.r*e.r){
          destroyTurret(t);
        }
      }
      for(var c=0;c<State.cities.length;c++){
        var city=State.cities[c];
        if(city.alive && distanceSq(e.x,e.y,city.x,CONSTANTS.HEIGHT-20)<e.r*e.r){
          destroyCity(c);
        }
      }
    }
    if(e.life<=0) State.explosions.splice(j,1);
  }
}

function explode(x,y,missile){
  var max=CONSTANTS.EXPLOSION_RADIUS;
  if(missile && missile.small) max=20;
  if(missile && missile.chain){
    State.explosions.push({chain:true,y:y,life:0.3,turretIndex:missile.turretIndex,color:CONSTANTS.COLORS.ACCENT2});
    play('explode'); shake();
    return;
  }
  var exp={x:x,y:y,r:1,max:max,life:0.3,turretIndex:missile?missile.turretIndex:0,enemy:missile&&missile.enemy};
  State.explosions.push(exp); play('explode'); shake();
  if(missile && missile.cluster){
    for(var a=0;a<8;a++){
      var angle=a*Math.PI/4;
      State.explosions.push({x:x+Math.cos(angle)*max,y:y+Math.sin(angle)*max,r:1,max:12,life:0.2,turretIndex:exp.turretIndex});
    }
  }
  if(missile && missile.freezer){
    State.freezeUntil=now()+CONSTANTS.FREEZE_DURATION; setBlueActive(true); play('freeze_on');
  }
  if(missile && missile.spawnSeekers){
    for(var s=0;s<2;s++){
      State.playerMissiles.push({turretIndex:missile.turretIndex,seeker:true,small:true,x:x,y:y,tx:x,ty:y,spd:CONSTANTS.MISSILE_SPEED,life:CONSTANTS.SEEKER_LIFETIME});
    }
  }
}

function findNearestEnemy(x,y){
  var best=null,bd=1e9;
  for(var i=0;i<State.enemies.length;i++){
    var e=State.enemies[i];
    var d=distanceSq(x,y,e.x,e.y);
    if(d<bd){bd=d;best=e;}
  }
  return best;
}

function drawMissiles(ctx){
  for(var i=0;i<State.playerMissiles.length;i++){
    var m=State.playerMissiles[i];
    ctx.save();
    ctx.translate(m.x,m.y);
    ctx.rotate(m.ang||0);
    var sz=m.small?2:3;
    ctx.fillStyle='#fff';
    ctx.beginPath();
    ctx.moveTo(sz,0);
    ctx.lineTo(-sz,-sz/1.5);
    ctx.lineTo(-sz,sz/1.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-sz,-sz/2,sz*0.6,sz);
    ctx.fillStyle=CONSTANTS.COLORS.ACCENT3;
    var flame=(m.small?1:2)+Math.sin(now()*40);
    ctx.fillRect(-sz-2,-sz/3,flame,sz/1.5);
    ctx.restore();
  }
  for(var j=0;j<State.explosions.length;j++){
    var e=State.explosions[j];
    if(e.chain){
      ctx.strokeStyle=e.color||'rgba(255,255,255,0.6)';
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.moveTo(0,e.y);
      ctx.lineTo(CONSTANTS.WIDTH,e.y);
      ctx.stroke();
    }else{
      ctx.strokeStyle='rgba(255,255,255,0.6)';
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.arc(e.x,e.y,e.r,0,Math.PI*2);
      ctx.stroke();
    }
  }
}
