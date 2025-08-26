function consumeCharge(turret){
  for(var i=0;i<2;i++){
    if(turret.charges[i]<=0){turret.charges[i]=CONSTANTS.CHARGE_TIME; break;}
  }
}

function shoot(turret,x,y){
  if(turret.special){
    play('powerup');
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
  consumeCharge(turret); turret.cool=CONSTANTS.TURRET_COOLDOWN; play('shoot');
  State.playerMissiles.push({turretIndex:turret.id,x:turret.x,y:CONSTANTS.HEIGHT-40,tx:x,ty:y,spd:CONSTANTS.MISSILE_SPEED,ang:Math.atan2(y-(CONSTANTS.HEIGHT-40),x-turret.x)});
}

function fireCluster(turret,x,y){
  consumeCharge(turret); turret.cool=CONSTANTS.TURRET_COOLDOWN; play('shoot');
  State.playerMissiles.push({turretIndex:turret.id,cluster:true,x:turret.x,y:CONSTANTS.HEIGHT-40,tx:x,ty:y,spd:CONSTANTS.MISSILE_SPEED,ang:Math.atan2(y-(CONSTANTS.HEIGHT-40),x-turret.x)});
}
function fireFreezer(turret,x,y){
  consumeCharge(turret); turret.cool=CONSTANTS.TURRET_COOLDOWN; play('shoot');
  State.playerMissiles.push({turretIndex:turret.id,freezer:true,x:turret.x,y:CONSTANTS.HEIGHT-40,tx:x,ty:y,spd:CONSTANTS.MISSILE_SPEED,ang:Math.atan2(y-(CONSTANTS.HEIGHT-40),x-turret.x)});
}
function fireChain(turret,x,y){
  consumeCharge(turret); turret.cool=CONSTANTS.TURRET_COOLDOWN; play('shoot');
  State.playerMissiles.push({turretIndex:turret.id,chain:true,x:turret.x,y:CONSTANTS.HEIGHT-40,tx:x,ty:y,spd:CONSTANTS.MISSILE_SPEED,ang:Math.atan2(y-(CONSTANTS.HEIGHT-40),x-turret.x)});
}
function fireSeeker(turret,x,y){
  consumeCharge(turret); turret.cool=CONSTANTS.TURRET_COOLDOWN; play('shoot');
  State.playerMissiles.push({turretIndex:turret.id,x:turret.x,y:CONSTANTS.HEIGHT-40,tx:x,ty:y,spd:CONSTANTS.MISSILE_SPEED,ang:Math.atan2(y-(CONSTANTS.HEIGHT-40),x-turret.x),spawnSeekers:true});
}

function updateMissiles(dt){
  for(var i=State.playerMissiles.length-1;i>=0;i--){
    var m=State.playerMissiles[i];
    if(m.seeker && !m.armed){
      if(now()>=m.armTime){m.armed=true; m.life=CONSTANTS.SEEKER_LIFETIME;}
      continue;
    }
    if(m.seeker){
      m.life-=dt;
      if(m.life<=0){ explode(m.x,m.y,{small:true,turretIndex:m.turretIndex}); State.playerMissiles.splice(i,1); continue; }
      var target=findNearestEnemy(m.x,m.y);
      if(target){m.tx=target.x; m.ty=target.y;}
    }
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
  }
  for(var j=State.explosions.length-1;j>=0;j--){
    var e=State.explosions[j];
    e.r+=200*dt;
    if(e.r>e.max) e.life-=dt;
    if(!e.visual){
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
    }
    if(e.life<=0) State.explosions.splice(j,1);
  }
}

function explode(x,y,opts){
  var max=CONSTANTS.EXPLOSION_RADIUS;
  if(opts && opts.radius) max=opts.radius;
  if(opts && opts.small) max=CONSTANTS.EXPLOSION_RADIUS*0.5;
  if(opts && opts.chain){
    var step=CONSTANTS.EXPLOSION_RADIUS*2; var rad=CONSTANTS.EXPLOSION_RADIUS*0.5;
    function spawn(cx){ State.explosions.push({x:cx,y:y,r:1,max:rad,life:0.2,turretIndex:opts.turretIndex}); }
    spawn(x);
    function prop(cx,dir){
      var nx=cx+dir*step;
      if(nx<0||nx>CONSTANTS.WIDTH) return;
      setTimeout(function(){spawn(nx); prop(nx,dir);}, randRange(40,60));
    }
    prop(x,1); prop(x,-1);
    play('bomb'); shake();
    return;
  }
  var exp={x:x,y:y,r:1,max:max,life:0.3,turretIndex:opts?opts.turretIndex:0,enemy:opts&&opts.enemy,visual:opts&&opts.visual};
  State.explosions.push(exp);
  if(!opts || !opts.visual){ play('bomb'); shake(); }
  if(opts && opts.cluster){
    var N=12; var groups=3; var rad=max; var small=rad*0.5;
    for(var g=0; g<groups; g++){
      (function(g){
        setTimeout(function(){
          for(var a=0;a<4;a++){
            var angle=(g*4+a)*Math.PI*2/N;
            State.explosions.push({x:x+Math.cos(angle)*rad,y:y+Math.sin(angle)*rad,r:1,max:small,life:0.2,turretIndex:exp.turretIndex});
          }
        }, g*50);
      })(g);
    }
  }
  if(opts && opts.freezer){
    State.freezeUntil=now()+CONSTANTS.FREEZE_DURATION; setBlueActive(true); play('powerup');
  }
  if(opts && opts.spawnSeekers){
    var ang=opts.ang||0; var nx=-Math.sin(ang), ny=Math.cos(ang); var fx=Math.cos(ang), fy=Math.sin(ang); var off=max+2;
    var positions=[{x:x+nx*off,y:y+ny*off},{x:x-nx*off,y:y-ny*off},{x:x+fx*off,y:y+fy*off}];
    for(var i=0;i<positions.length;i++){
      var p=positions[i];
      State.playerMissiles.push({turretIndex:opts.turretIndex,seeker:true,small:true,x:p.x,y:p.y,tx:p.x,ty:p.y,spd:CONSTANTS.MISSILE_SPEED,armTime:now()+0.06,armed:false});
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
    var sz=m.small?1.4:2.1;
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
    ctx.strokeStyle='rgba(255,255,255,0.6)';
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.arc(e.x,e.y,e.r,0,Math.PI*2);
    ctx.stroke();
  }
}
