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
    else if(turret.special==='gravity') fireGravity(turret,x,y);
    else if(turret.special==='mine') fireMines(turret,x,y);
    turret.special=null;
  }else{
    fireNormal(turret,x,y);
  }
}

function cooldown(){ return CONSTANTS.TURRET_COOLDOWN; }

function fireNormal(turret,x,y){
  consumeCharge(turret); turret.cool=cooldown(); play('shoot');
  State.playerMissiles.push({turretIndex:turret.id,x:turret.x,y:CONSTANTS.HEIGHT-40,tx:x,ty:y,spd:CONSTANTS.MISSILE_SPEED,ang:Math.atan2(y-(CONSTANTS.HEIGHT-40),x-turret.x),od:State.overdriveUntil>now()});
}

function fireCluster(turret,x,y){
  consumeCharge(turret); turret.cool=cooldown(); play('shoot');
  State.playerMissiles.push({turretIndex:turret.id,cluster:true,x:turret.x,y:CONSTANTS.HEIGHT-40,tx:x,ty:y,spd:CONSTANTS.MISSILE_SPEED,ang:Math.atan2(y-(CONSTANTS.HEIGHT-40),x-turret.x),od:State.overdriveUntil>now()});
}
function fireFreezer(turret,x,y){
  consumeCharge(turret); turret.cool=cooldown(); play('shoot');
  State.playerMissiles.push({turretIndex:turret.id,freezer:true,x:turret.x,y:CONSTANTS.HEIGHT-40,tx:x,ty:y,spd:CONSTANTS.MISSILE_SPEED,ang:Math.atan2(y-(CONSTANTS.HEIGHT-40),x-turret.x),od:State.overdriveUntil>now()});
}
function fireChain(turret,x,y){
  consumeCharge(turret); turret.cool=cooldown(); play('shoot');
  State.playerMissiles.push({turretIndex:turret.id,chain:true,x:turret.x,y:CONSTANTS.HEIGHT-40,tx:x,ty:y,spd:CONSTANTS.MISSILE_SPEED,ang:Math.atan2(y-(CONSTANTS.HEIGHT-40),x-turret.x),od:State.overdriveUntil>now()});
}
function fireSeeker(turret,x,y){
  consumeCharge(turret); turret.cool=cooldown(); play('shoot');
  State.playerMissiles.push({turretIndex:turret.id,x:turret.x,y:CONSTANTS.HEIGHT-40,tx:x,ty:y,spd:CONSTANTS.MISSILE_SPEED,ang:Math.atan2(y-(CONSTANTS.HEIGHT-40),x-turret.x),spawnSeekers:true,od:State.overdriveUntil>now()});
}
function fireGravity(turret,x,y){
  consumeCharge(turret); turret.cool=cooldown(); play('shoot');
  State.playerMissiles.push({turretIndex:turret.id,gravity:true,x:turret.x,y:CONSTANTS.HEIGHT-40,tx:x,ty:y,spd:CONSTANTS.MISSILE_SPEED,ang:Math.atan2(y-(CONSTANTS.HEIGHT-40),x-turret.x),od:State.overdriveUntil>now()});
}
function activateOverdrive(){
  State.overdriveUntil=now()+CONSTANTS.OVERDRIVE_TIME;
  setRedActive(true);
}
function fireMines(turret,x,y){
  consumeCharge(turret); turret.cool=cooldown(); play('shoot');
  State.playerMissiles.push({turretIndex:turret.id,mines:true,x:turret.x,y:CONSTANTS.HEIGHT-40,tx:x,ty:y,spd:CONSTANTS.MISSILE_SPEED,ang:Math.atan2(y-(CONSTANTS.HEIGHT-40),x-turret.x),od:State.overdriveUntil>now()});
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
      if(m.mines){ spawnMines(m.tx,m.ty,m.turretIndex); }
      else { explode(m.tx,m.ty,m); }
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
      for(var m=State.mines.length-1;m>=0;m--){
        var mine=State.mines[m];
        if(!mine.armed) continue;
        if(distanceSq(e.x,e.y,mine.x,mine.y)<e.r*e.r){
          explode(mine.x,mine.y,{turretIndex:mine.turretIndex});
          State.mines.splice(m,1);
        }
      }
    }
    if(e.life<=0) State.explosions.splice(j,1);
  }
  updateShrapnels(dt);
  updateGravity(dt);
  updateMines(dt);
}

function explode(x,y,opts){
  var max=CONSTANTS.EXPLOSION_RADIUS;
  if(opts && opts.radius) max=opts.radius;
  if(opts && opts.small) max=CONSTANTS.EXPLOSION_RADIUS*0.5;
  if(opts && opts.chain){
    var step=CONSTANTS.EXPLOSION_RADIUS*2; var rad=CONSTANTS.EXPLOSION_RADIUS*0.5;
    function spawn(cx,cy){ State.explosions.push({x:cx,y:cy,r:1,max:rad,life:0.2,turretIndex:opts.turretIndex}); }
    spawn(x,y);
    function propH(cx,dir){
      var nx=cx+dir*step;
      if(nx<0||nx>CONSTANTS.WIDTH) return;
      setTimeout(function(){spawn(nx,y); propH(nx,dir);}, randRange(40,60));
    }
    function propV(cy,dir){
      var ny=cy+dir*step;
      if(ny<0||ny>CONSTANTS.HEIGHT) return;
      setTimeout(function(){spawn(x,ny); propV(ny,dir);}, randRange(40,60));
    }
    propH(x,1); propH(x,-1);
    propV(y,1); propV(y,-1);
    play('bomb'); shake();
    return;
  }
  var exp={x:x,y:y,r:1,max:max,life:0.3,turretIndex:opts?opts.turretIndex:0,enemy:opts&&opts.enemy,visual:opts&&opts.visual};
  State.explosions.push(exp);
  if(!opts || !opts.visual){ play('bomb'); shake(); }
  if(opts && opts.cluster){
    var travel=0.4;
    var ring=max*1.6;
    var delay=300, step=80;
    for(var s=0;s<12;s++){
      (function(idx){
        var ang=-Math.PI/2+idx*Math.PI*2/12;
        var ex=x+Math.cos(ang)*ring;
        var ey=y+Math.sin(ang)*ring;
        var vx=Math.cos(ang)*ring/travel;
        var vy=Math.sin(ang)*ring/travel;
        setTimeout(function(){
          State.shrapnels.push({x:x,y:y,vx:vx,vy:vy,life:travel,ex:ex,ey:ey,turretIndex:opts.turretIndex});
        },delay+idx*step);
      })(s);
    }
  }
  if(opts && opts.gravity){
    State.gravityWells.push({x:x,y:y,rad:CONSTANTS.EXPLOSION_RADIUS*4.8,time:0,turretIndex:opts.turretIndex});
    play('powerup');
    return;
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

function spawnMines(x,y,ti){
  explode(x,y,{turretIndex:ti});
  setTimeout(function(){
    for(var i=0;i<5;i++){
      var ang=randRange(0,Math.PI*2);
      var dist=CONSTANTS.EXPLOSION_RADIUS*10*Math.sqrt(Math.random());
      var px=x+Math.cos(ang)*dist;
      var py=y+Math.sin(ang)*dist;
      State.mines.push({x:px,y:py,armed:false,arm:now()+CONSTANTS.MINE_ARM,expire:now()+CONSTANTS.MINE_LIFE,turretIndex:ti});
    }
  },300);
}

function updateGravity(dt){
  for(var i=State.gravityWells.length-1;i>=0;i--){
    var g=State.gravityWells[i];
    g.time+=dt;
    if(g.time<CONSTANTS.GRAVITY_DURATION){
      var base=120+State.round*15;
      var outer=g.rad*2;
      for(var j=0;j<State.enemies.length;j++){
        var e=State.enemies[j];
        var dx=g.x-e.x, dy=g.y-e.y;
        var d=Math.sqrt(dx*dx+dy*dy);
        if(d<outer && d>0){
          var pull;
          if(d<g.rad){
            pull=(1-d/g.rad)*base;
          }else{
            pull=(1-(d-g.rad)/g.rad)*base*0.4;
          }
          pull*=dt;
          e.x+=dx/d*pull; e.y+=dy/d*pull;
        }
      }
    }else{
      explode(g.x,g.y,{radius:CONSTANTS.EXPLOSION_RADIUS*3.2,turretIndex:g.turretIndex});
      State.gravityWells.splice(i,1);
    }
  }
}

function updateMines(dt){
  for(var i=State.mines.length-1;i>=0;i--){
    var m=State.mines[i];
    if(!m.armed && now()>=m.arm){m.armed=true;}
    if(now()>=m.expire){
      explode(m.x,m.y,{turretIndex:m.turretIndex});
      State.mines.splice(i,1);
      continue;
    }
    if(m.armed){
      var rad=CONSTANTS.EXPLOSION_RADIUS, r2=rad*rad;
      for(var e=State.enemies.length-1;e>=0;e--){
        var en=State.enemies[e];
        if(distanceSq(m.x,m.y,en.x,en.y)<=r2){
          explode(m.x,m.y,{turretIndex:m.turretIndex});
          State.mines.splice(i,1);
          break;
        }
      }
    }
  }
}

function updateShrapnels(dt){
  for(var i=State.shrapnels.length-1;i>=0;i--){
    var s=State.shrapnels[i];
    s.life-=dt;
    if(s.life<=0){
      explode(s.ex,s.ey,{radius:CONSTANTS.EXPLOSION_RADIUS,turretIndex:s.turretIndex});
      State.shrapnels.splice(i,1);
    }else{
      s.x+=s.vx*dt;
      s.y+=s.vy*dt;
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
    var col=m.od?CONSTANTS.COLORS.ACCENT3:'#fff';
    ctx.fillStyle=col;
    ctx.beginPath();
    ctx.moveTo(sz,0);
    ctx.lineTo(-sz,-sz/1.5);
    ctx.lineTo(-sz,sz/1.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-sz,-sz/2,sz*0.6,sz);
    var tail=(m.od?8:2)+Math.sin(now()*40);
    if(m.od){ctx.shadowColor=CONSTANTS.COLORS.ACCENT3; ctx.shadowBlur=8;}
    ctx.fillRect(-sz-tail,-sz/3,tail,sz/1.5);
    ctx.restore();
  }
  for(var s=0;s<State.shrapnels.length;s++){
    var p=State.shrapnels[s];
    ctx.strokeStyle='#fff';
    ctx.beginPath();
    ctx.moveTo(p.x-p.vx*0.03,p.y-p.vy*0.03);
    ctx.lineTo(p.x,p.y);
    ctx.stroke();
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(p.x,p.y,1,0,Math.PI*2); ctx.fill();
  }
  for(var j=0;j<State.explosions.length;j++){
    var e=State.explosions[j];
    ctx.strokeStyle='rgba(255,255,255,0.6)';
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.arc(e.x,e.y,e.r,0,Math.PI*2);
    ctx.stroke();
  }
  for(var g=0;g<State.gravityWells.length;g++){
    var w=State.gravityWells[g];
    var r=w.rad*(0.8+0.2*Math.sin(w.time*4));
    ctx.strokeStyle='rgba(127,81,255,0.6)';
    ctx.beginPath(); ctx.arc(w.x,w.y,r,0,Math.PI*2); ctx.stroke();
    ctx.save(); ctx.translate(w.x,w.y); ctx.rotate(now()*2); ctx.strokeStyle='rgba(127,81,255,0.3)';
    ctx.beginPath(); ctx.arc(0,0,r*0.7,0,Math.PI*1.2); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle='rgba(127,81,255,0.2)';
    ctx.beginPath(); ctx.arc(w.x,w.y,w.rad*2,0,Math.PI*2); ctx.stroke();
  }
  for(var m=0;m<State.mines.length;m++){
    var mine=State.mines[m];
    ctx.save();
    ctx.globalAlpha=mine.armed?(0.6+0.4*Math.sin(now()*20)):0.3;
    ctx.fillStyle=CONSTANTS.COLORS.ACCENT4;
    ctx.beginPath(); ctx.arc(mine.x,mine.y,2,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}
