const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const playfield = document.getElementById('playfield');
const announcements = document.getElementById('announcements');
const multiplierFill = document.getElementById('multiplier-fill');
const multiplierLabel = document.getElementById('multiplier-label');
const powerFill = document.getElementById('powerup-fill');
const powerBar = document.getElementById('powerup');
const overlay = document.getElementById('overlay');
const playAgainBtn = document.getElementById('playAgain');

const vignette = document.getElementById('vignette');

const TAU = Math.PI * 2;
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

let keys = {};
let lastTime = 0;
let level = 1;
let score = 0;
let lives = 3;
let multiplier = 1;
let multiProgress = 0;
const POWER_DURATION = 10;

let shakeTime = 0;

// simple oscillator-based SFX system
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
// Ensure audio starts on first user gesture (autoplay policy)
['click','keydown','touchstart'].forEach(evt => {
  window.addEventListener(evt, () => {
    if (audioCtx.state === 'suspended') { audioCtx.resume(); }
  }, { once: true });
});


function playTone(freq = 440, duration = 0.1) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = freq;
  osc.type = 'square';
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}
const SFX = {
  thrust:[120,0.2], shoot:[800,0.05], chargedReady:[500,0.1], chargedRelease:[300,0.1],
  asteroidHit:[200,0.05], asteroidSplit:[250,0.05], asteroidDestroy:[150,0.1], bomb:[60,0.4],
  enemySpawn:[500,0.1], enemyShot:[700,0.05], playerHit:[100,0.2], powerup:[900,0.1],
  wave:[300,0.3], waveClear:[400,0.3], ui:[1000,0.05]
};
function sfx(name){
  const cfg = SFX[name];
  if(cfg) playTone(cfg[0],cfg[1]);
}

function addShake(){shakeTime=0.3;}
function triggerVignette(){
  vignette.classList.add('flash');
  setTimeout(()=>vignette.classList.remove('flash'),500);
}
function loseLife(){
  lives--; player.invuln=1; sfx('playerHit'); resetMultiplier(); triggerVignette(); if(lives<=0) gameOver();
}

class Banner {
  constructor(text) {
    const el = document.createElement('div');
    el.className = 'banner';
    el.textContent = text;
    announcements.appendChild(el);
    setTimeout(()=>announcements.removeChild(el),3000);
  }
}

function randRange(min,max){return Math.random()*(max-min)+min;}
function wrap(obj){
  if(obj.x<0) obj.x+=WIDTH;
  if(obj.x>WIDTH) obj.x-=WIDTH;
  if(obj.y<0) obj.y+=HEIGHT;
  if(obj.y>HEIGHT) obj.y-=HEIGHT;
}

class Player {
  constructor(){
    this.x = WIDTH/2; this.y = HEIGHT/2;
    this.vx = 0; this.vy = 0;
    this.angle = 0;
    this.cool=0;
    this.charge=0;
    this.invuln=0;
    this.thrusting=false;
    this.chargeStage=0; //0 none,1 half,2 full
    this.powerup=null;
    this.powerupTimer=0;
    this.bursting=false;
  }
  update(dt){
    if(keys['ArrowLeft']) this.angle -= 3*dt;
    if(keys['ArrowRight']) this.angle += 3*dt;
    if(keys['ArrowUp']){
      this.vx += Math.cos(this.angle)*200*dt;
      this.vy += Math.sin(this.angle)*200*dt;
      if(!this.thrusting){sfx('thrust'); this.thrusting=true;}
    } else if(this.thrusting){ this.thrusting=false; }
    this.x += this.vx*dt;
    this.y += this.vy*dt;
    this.vx *= 0.99; this.vy *= 0.99;
    wrap(this);
    // shooting
    if(keys[' ']){
      this.charge += dt;
      if(this.charge>=1 && this.chargeStage<2){sfx('chargedReady'); this.chargeStage=2;}
      else if(this.charge>=0.5 && this.chargeStage<1){sfx('chargedReady'); this.chargeStage=1;}
    }
    if(!keys[' '] && this.charge>0){
      this.fire(this.charge);
      this.charge=0;
      this.chargeStage=0;
      sfx('chargedRelease');
    }
    if(this.cool>0) this.cool-=dt;
    if(this.invuln>0) this.invuln-=dt;
  }
  fire(charge){
    if(this.cool>0 || this.bursting) return;
    const type=this.powerup;

    if(!type){
      const ang=this.angle;
      const b=new Bullet(this.x+Math.cos(ang)*15,this.y+Math.sin(ang)*15,ang);
      if(charge>=1){b.r=8; b.hp=3;}
      else if(charge>=0.5){b.r=4; b.hp=2;}
      shots.push(b);
      sfx('shoot');
      this.cool=0.25;
      return;
    }

    if(type==='multi'){
      const spread=0.05;
      const fireBurst=(base)=>{
        const px=this.x+Math.cos(base)*15;
        const py=this.y+Math.sin(base)*15;
        for(let j=0;j<3;j++){
          const ang=base+(j-1)*spread;
          const b=new Bullet(px,py,ang);
          shots.push(b);
        }
      };
      if(charge<0.5){
        fireBurst(this.angle);
      } else if(charge<1){
        fireBurst(this.angle-0.05);
        setTimeout(()=>fireBurst(this.angle+0.05),100);
      } else {
        fireBurst(this.angle-0.05);
        setTimeout(()=>fireBurst(this.angle+0.05),100);
        setTimeout(()=>fireBurst(this.angle),200);
      }
      sfx('shoot');
      this.cool=0.4;
      return;
    }

    if(type==='rapid'){
      const spacing=30; // ms
      const count=charge>=1?12:(charge>=0.5?6:2);
      this.bursting=true;
      for(let i=0;i<count;i++){
        setTimeout(()=>{
          const ang=this.angle;
          const b=new Bullet(this.x+Math.cos(ang)*15,this.y+Math.sin(ang)*15,ang);
          shots.push(b);
        },i*spacing);
      }
      setTimeout(()=>{this.bursting=false;},(count-1)*spacing);
      sfx('shoot');
      this.cool=0.4;
      return;
    }

    if(type==='pierce'){
      if(charge>=0.5){
        const width=charge>=1?4:2;
        lasers.push(new Laser(this.x,this.y,this.angle,width,0.1));
        sfx('shoot');
        this.cool=0.25;
        return;
      } else {
        const ang=this.angle;
        const b=new Bullet(this.x+Math.cos(ang)*15,this.y+Math.sin(ang)*15,ang);
        b.pierce=true;
        shots.push(b);
        sfx('shoot');
        this.cool=0.25;
        return;
      }
    }

    if(type==='bomb'){
      const ang=this.angle;
      const b=new Bullet(this.x+Math.cos(ang)*15,this.y+Math.sin(ang)*15,ang);
      b.bomb=true; b.charge=charge;
      const baseThick=8, baseLen=16;
      const scale=charge>=1?2:(charge>=0.5?1.5:1);
      b.thick=baseThick*scale;
      b.len=baseLen*scale;
      b.r=b.thick/2;
      shots.push(b);
      sfx('shoot');
      this.cool=0.25;
      return;
    }
  }
  draw(){
    ctx.save();
    ctx.translate(this.x,this.y);
    ctx.rotate(this.angle);
    if(this.invuln>0 && Math.floor(this.invuln*10)%2===0){ctx.globalAlpha=0.3;}
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent1');
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(12,0);
    ctx.lineTo(-12,-10);
    ctx.lineTo(-12,10);
    ctx.closePath();
    ctx.stroke();
    if(this.charge>0){
      const col = this.charge>=1?'--accent4':'--accent3';
      const style = getComputedStyle(document.documentElement).getPropertyValue(col);
      const sc = Math.min(this.charge,1);
      ctx.strokeStyle = style;
      if(this.chargeStage>=1){ctx.shadowColor=style; ctx.shadowBlur=this.chargeStage===2?12:8;}
      ctx.beginPath();
      ctx.moveTo(12*sc,0);
      ctx.lineTo(-12*sc,-10*sc);
      ctx.lineTo(-12*sc,10*sc);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }
}

class Bullet {
  constructor(x,y,angle){
    this.x=x; this.y=y;
    this.vx=Math.cos(angle)*400; this.vy=Math.sin(angle)*400;
    this.angle=angle;
    this.life=1.5; this.bomb=false; this.pierce=false;
    this.r=2;
    this.hp=1;
    this.len=0; this.thick=0;
  }
  update(dt){
    this.x+=this.vx*dt; this.y+=this.vy*dt;
    wrap(this);
    this.life-=dt;
  }
  draw(){
    if(this.bomb){
      ctx.save();
      ctx.translate(this.x,this.y);
      ctx.rotate(this.angle);
      ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--warning');
      const w=this.thick||8; const l=this.len||16;
      ctx.fillRect(-l/2,-w/2,l,w);
      ctx.restore();
    } else {
      ctx.fillStyle = this.pierce?getComputedStyle(document.documentElement).getPropertyValue('--accent4'):getComputedStyle(document.documentElement).getPropertyValue('--ui');
      ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,TAU); ctx.fill();
    }
  }
}

class Laser {
  constructor(x,y,angle,width,life){this.x=x;this.y=y;this.angle=angle;this.width=width;this.life=life;}
  update(dt){this.life-=dt;}
  draw(){
    ctx.save();
    ctx.translate(this.x,this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--accent4');
    ctx.fillRect(0,-this.width/2,800,this.width);
    ctx.restore();
  }
}

class Explosion {
  constructor(x,y,max){
    this.x=x; this.y=y; this.r=0; this.max=max; this.speed=200; this.active=true;
    addShake();
  }
  update(dt){
    this.r += this.speed*dt;
    if(this.r>this.max){this.active=false; return;}
    for(let i=asteroids.length-1;i>=0;i--){
      const a=asteroids[i];
      const dx=a.x-this.x, dy=a.y-this.y;
      if(dx*dx+dy*dy < (this.r + a.size*20)*(this.r + a.size*20)){
        destroyAsteroid(i);
      }
    }
    for(let i=enemies.length-1;i>=0;i--){
      const e=enemies[i];
      const dx=e.x-this.x, dy=e.y-this.y;
      if(dx*dx+dy*dy < this.r*this.r){
        enemies.splice(i,1); score+=200*multiplier; addMultiplier();
        explosions.push(new Explosion(e.x,e.y,60));
        sfx('bomb');
      }
    }
  }
  draw(){
    ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--warning');
    ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,TAU); ctx.stroke();
  }
}

class Asteroid {
  constructor(x,y,size){
    this.x=x; this.y=y; this.size=size; //3 large,2 medium,1 small
    const speed = randRange(20,40)*(1+level*0.05);
    const ang = randRange(0,TAU);
    this.vx = Math.cos(ang)*speed; this.vy = Math.sin(ang)*speed;
    this.rot = randRange(-1,1);
    this.angle=0;
  }
  update(dt){
    this.x+=this.vx*dt; this.y+=this.vy*dt;
    this.angle+=this.rot*dt;
    wrap(this);
  }
  draw(){
    const r = this.size*20;
    ctx.save();
    ctx.translate(this.x,this.y); ctx.rotate(this.angle);
    ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--accent2');
    ctx.beginPath();
    for(let i=0;i<8;i++){
      const ang=i/8*TAU;
      const rad=r+randRange(-5,5);
      ctx.lineTo(Math.cos(ang)*rad,Math.sin(ang)*rad);
    }
    ctx.closePath(); ctx.stroke();
    ctx.restore();
  }
}

class Enemy {
  constructor(){
    this.x = Math.random()<0.5?0:WIDTH; this.y=randRange(0,HEIGHT);
    this.vx=randRange(-30,30); this.vy=randRange(-30,30);
    this.cool=2; this.angle=0;
  }
  update(dt){
    this.x+=this.vx*dt; this.y+=this.vy*dt; wrap(this);
    const dx = player.x-this.x; const dy=player.y-this.y; this.angle=Math.atan2(dy,dx);
    this.cool-=dt;
    if(this.cool<=0){
      enemyShots.push(new EnemyBullet(this.x,this.y,this.angle));
      sfx('enemyShot');
      this.cool=2/level;
    }
  }
  draw(){
    ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(this.angle);
    ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--accent3');
    ctx.beginPath();
    ctx.rect(-10,-10,20,20);
    ctx.stroke();
    ctx.restore();
  }
}
class EnemyBullet {
  constructor(x,y,angle){this.x=x;this.y=y;this.vx=Math.cos(angle)*200;this.vy=Math.sin(angle)*200;this.life=3;}
  update(dt){this.x+=this.vx*dt;this.y+=this.vy*dt;wrap(this);this.life-=dt;}
  draw(){ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--accent3');ctx.beginPath();ctx.arc(this.x,this.y,2,0,TAU);ctx.fill();}
}

class PowerUp {
  constructor(x,y,type){this.x=x;this.y=y;this.type=type;this.vx=randRange(-20,20);this.vy=randRange(-20,20);this.life=15;}
  update(dt){this.x+=this.vx*dt;this.y+=this.vy*dt;wrap(this);this.life-=dt;}
  draw(){ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--accent4');ctx.beginPath();ctx.arc(this.x,this.y,6,0,TAU);ctx.fill();}
}

let player = new Player();
let asteroids=[]; let shots=[]; let enemyShots=[]; let enemies=[]; let powerups=[]; let lasers=[]; let floaters=[]; let explosions=[];

function spawnAsteroids(n){
  const safeR = 60; // safe radius around player
  for(let i=0;i<n;i++){
    let x,y,safe=false;
    while(!safe){
      x=randRange(0,WIDTH); y=randRange(0,HEIGHT); safe=true;
      for(let dx of [-WIDTH,0,WIDTH]){
        for(let dy of [-HEIGHT,0,HEIGHT]){
          const px=player.x+dx, py=player.y+dy; const d=(x-px)*(x-px)+(y-py)*(y-py);
          if(d<safeR*safeR) {safe=false; break;}
        }
        if(!safe) break;
      }
    }
    asteroids.push(new Asteroid(x,y,3));
  }
}
function spawnEnemy(){enemies.push(new Enemy());sfx('enemySpawn');}
function spawnPowerUp(x,y){const types=['bomb','multi','rapid','pierce'];const type=types[Math.floor(Math.random()*types.length)];powerups.push(new PowerUp(x,y,type));}

function addMultiplier(){multiProgress+=0.2; if(multiProgress>=1){multiProgress=0; multiplier++; new Banner('Multiplier x'+multiplier); sfx('ui');} updateMultiplier();}
function resetMultiplier(){multiplier=1; multiProgress=0; updateMultiplier();}
function updateMultiplier(){multiplierFill.style.height=(multiProgress*100)+'%'; multiplierLabel.textContent='x'+multiplier;}

const powerColors={bomb:'var(--warning)',multi:'var(--accent2)',rapid:'var(--accent3)',pierce:'var(--accent4)'};
function updatePowerBar(){
  if(player.powerup){
    powerFill.style.background=powerColors[player.powerup];
    powerFill.style.height=(player.powerupTimer/POWER_DURATION*100)+'%';
  } else {
    powerFill.style.height='0%';
  }
}

function initLevel(){asteroids=[];shots=[];enemyShots=[];enemies=[];lasers=[];powerups=[];floaters=[];explosions=[];spawnAsteroids(4+level);player.invuln=3;enemySpawnTimer=8/level;updatePowerBar();sfx('wave');}

function gameOver(){
  overlay.classList.remove('hidden');   // show Breakout-style overlay
}

playAgainBtn.addEventListener('click', () => {
  overlay.classList.add('hidden');      // hide overlay
  level = 1;
  score = 0;
  lives = 3;
  resetMultiplier();
  player = new Player();
  initLevel();
  sfx('ui');
});

function update(dt){
  player.update(dt);
  shots.forEach(b=>b.update(dt));
  lasers.forEach(l=>l.update(dt));
  asteroids.forEach(a=>a.update(dt));
  enemies.forEach(e=>e.update(dt));
  enemyShots.forEach(b=>b.update(dt));
  powerups.forEach(p=>p.update(dt));
  explosions.forEach(ex=>ex.update(dt));

  shots=shots.filter(b=>b.life>0);
  lasers=lasers.filter(l=>l.life>0);
  enemyShots=enemyShots.filter(b=>b.life>0);
  powerups=powerups.filter(p=>p.life>0);
  explosions=explosions.filter(e=>e.active);

  // collisions bullets-asteroids
  for(let i=shots.length-1;i>=0;i--){
    const b=shots[i];
    let removed=false;
    for(let j=asteroids.length-1;j>=0;j--){
      const a=asteroids[j];
      const dx=b.x-a.x, dy=b.y-a.y; const r=a.size*20 + b.r;
      if(dx*dx+dy*dy<r*r){
        if(b.bomb){
          const radius = 60 + (b.charge>=1?60:(b.charge>=0.5?30:0));
          destroyAsteroid(j);
          explosions.push(new Explosion(b.x,b.y,radius));
          sfx('bomb');
        } else {
          destroyAsteroid(j);
        }
        if(b.pierce){
          b.x+=b.vx*0.02; b.y+=b.vy*0.02;
        } else {
          b.hp--; b.x+=b.vx*0.02; b.y+=b.vy*0.02;
          if(b.hp<=0){shots.splice(i,1); removed=true;}
        }
        addMultiplier();
      }
      if(removed) break;
    }
    if(removed) continue;
    for(let ei=enemies.length-1;ei>=0;ei--){
      const e=enemies[ei];
      const dx=b.x-e.x, dy=b.y-e.y; const rad=12 + b.r;
      if(dx*dx+dy*dy<rad*rad){
        enemies.splice(ei,1); score+=200*multiplier; addMultiplier();
        const radius = b.bomb ? 60 + (b.charge>=1?60:(b.charge>=0.5?30:0)) : 60;
        explosions.push(new Explosion(e.x,e.y,radius));
        sfx('bomb');
        if(b.pierce){
          b.x+=b.vx*0.02; b.y+=b.vy*0.02;
        } else {
          b.hp--; b.x+=b.vx*0.02; b.y+=b.vy*0.02;
          if(b.hp<=0){shots.splice(i,1); removed=true;}
        }
      }
      if(removed) break;
    }
    if(removed) continue;
    for(let si=enemyShots.length-1;si>=0;si--){
      const es=enemyShots[si];
      const dx=b.x-es.x, dy=b.y-es.y; const rad=b.r+2;
      if(dx*dx+dy*dy<rad*rad){
        enemyShots.splice(si,1);
        b.hp--;
        if(b.hp<=0){shots.splice(i,1); removed=true;}
      }
      if(removed) break;
    }
  }
  lasers.forEach(l=>{
    asteroids.forEach((a,j)=>{
      const relx=a.x-l.x, rely=a.y-l.y;
      const proj = relx*Math.cos(l.angle)+rely*Math.sin(l.angle);
      const perp = -relx*Math.sin(l.angle)+rely*Math.cos(l.angle);
      if(proj>0 && proj<800 && Math.abs(perp)<a.size*20+l.width/2){
        destroyAsteroid(j);
        addMultiplier();
      }
    });
    enemies.forEach((e,ei)=>{
      const relx=e.x-l.x,rely=e.y-l.y;
      const proj=relx*Math.cos(l.angle)+rely*Math.sin(l.angle);
      const perp=-relx*Math.sin(l.angle)+rely*Math.cos(l.angle);
      if(proj>0 && proj<800 && Math.abs(perp)<10){
        enemies.splice(ei,1); score+=200*multiplier; addMultiplier();
        explosions.push(new Explosion(e.x,e.y,60));
        sfx('bomb');
      }
    });
  });
  enemyShots.forEach((b,i)=>{
    const dx=b.x-player.x,dy=b.y-player.y;
    if(dx*dx+dy*dy<100){
      enemyShots.splice(i,1);
      if(player.invuln<=0){loseLife();}
      else {player.vx+=dx*0.02; player.vy+=dy*0.02;}
    }
  });
  asteroids.forEach((a,j)=>{
    const dx=a.x-player.x,dy=a.y-player.y; const r=a.size*20+10;
    if(dx*dx+dy*dy<r*r){
      explosions.push(new Explosion(player.x,player.y,60));
      sfx('bomb');
      destroyAsteroid(j);
      if(player.invuln<=0){loseLife();}
      else {player.vx+=dx*0.05; player.vy+=dy*0.05;}
    }
  });
  enemies.forEach((e,ei)=>{
    const dx=e.x-player.x,dy=e.y-player.y; if(dx*dx+dy*dy<400){
      explosions.push(new Explosion(player.x,player.y,60));
      sfx('bomb');
      if(player.invuln<=0){loseLife();}
      else {player.vx+=dx*0.05; player.vy+=dy*0.05;}
      enemies.splice(ei,1);
    }
  });
  powerups.forEach((p,pi)=>{
    const dx=p.x-player.x,dy=p.y-player.y;
    if(dx*dx+dy*dy<100){
      powerups.splice(pi,1);
      player.powerup=p.type;
      player.powerupTimer=POWER_DURATION;
      new Banner(p.type.toUpperCase());
      sfx('powerup');
      updatePowerBar();
      powerBar.classList.add('pulse');
      setTimeout(()=>powerBar.classList.remove('pulse'),300);
    }
  });
  if(player.powerup){
    player.powerupTimer-=dt;
    if(player.powerupTimer<=0){
      player.powerup=null;
      player.powerupTimer=0;
      updatePowerBar();
      powerBar.classList.add('pulse');
      setTimeout(()=>powerBar.classList.remove('pulse'),300);
    } else {
      updatePowerBar();
    }
  }
  // multiplier decay
  multiProgress-=dt*0.05; if(multiProgress<0) multiProgress=0; updateMultiplier();
  // spawn enemies with difficulty ramp
  enemySpawnTimer-=dt;
  const maxEnemies = 1 + Math.floor((level-1)/3);
  if(enemySpawnTimer<=0){
    if(enemies.length<maxEnemies){spawnEnemy();}
    enemySpawnTimer=10/level;
  }
  if(asteroids.length===0 && enemies.length===0){sfx('waveClear');level++;new Banner('Level '+level);initLevel();}
  if(shakeTime>0){
    shakeTime-=dt;
    const dx=randRange(-3,3); const dy=randRange(-3,3);
    playfield.style.transform=`translate(${dx}px,${dy}px)`;
  } else { playfield.style.transform=''; }
}
let enemySpawnTimer=8;
function destroyAsteroid(index){
  const a=asteroids[index];
  asteroids.splice(index,1);
  const points=100*multiplier;
  score+=points;
  floaters.push({x:a.x,y:a.y,txt:'+'+points,life:1});
  sfx('asteroidHit');
  if(a.size>1){
    sfx('asteroidSplit');
    for(let i=0;i<2;i++) asteroids.push(new Asteroid(a.x,a.y,a.size-1));
  } else {
    sfx('asteroidDestroy');
    if(Math.random()<0.2){spawnPowerUp(a.x,a.y);}
  }
}

function draw(){
  ctx.clearRect(0,0,WIDTH,HEIGHT);
  player.draw();
  shots.forEach(b=>b.draw());
  lasers.forEach(l=>l.draw());
  asteroids.forEach(a=>a.draw());
  enemies.forEach(e=>e.draw());
  enemyShots.forEach(b=>b.draw());
  powerups.forEach(p=>p.draw());
  floaters.forEach((f,i)=>{
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--accent4');
    ctx.fillText(f.txt,f.x,f.y);
    f.y-=20*0.016; f.life-=0.016; if(f.life<=0) floaters.splice(i,1);
  });
  explosions.forEach(ex=>ex.draw());
  ctx.fillStyle='white';
  ctx.fillText('Score: '+score,10,20);
  ctx.fillText('Lives: '+lives,10,40);
}

function loop(timestamp){
  const dt = (timestamp-lastTime)/1000; lastTime=timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown',e=>{keys[e.key]=true;});
window.addEventListener('keyup',e=>{keys[e.key]=false;});
initLevel();
requestAnimationFrame(loop);
