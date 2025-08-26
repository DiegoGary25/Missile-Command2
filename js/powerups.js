function maybeSpawnCarrier(){
  if(State.powerupsSpawned>=CONSTANTS.MAX_POWERUPS) return;
  if(State.spawnedEnemies>=State.nextPowerThreshold){
    State.powerupsSpawned++;
    State.nextPowerThreshold+=State.totalEnemies/CONSTANTS.MAX_POWERUPS;
    var target=pickTarget();
    if(target){
      var x=randRange(40,CONSTANTS.WIDTH-40);
      State.enemies.push({x:x,y:0,tx:target.x,ty:target.y,speed:CONSTANTS.ENEMY_SPEED*0.8,type:'normal',stage:0,carrier:true,power:pick(['cluster','freezer','chain','seeker','gravity','overdrive','mine']),hitBy:0,target:target});
    }
  }
}

function grantPower(turret,type){
  if(turret.special){
    var candidates=[];
    for(var i=0;i<State.turrets.length;i++){
      var t=State.turrets[i];
      if(t.alive && !t.special) candidates.push(t);
    }
    if(candidates.length===0){ play('ui'); return; }
    turret=pick(candidates);
  }
  turret.special=type;
  banner(type.toUpperCase());
  play('powerup');
}
