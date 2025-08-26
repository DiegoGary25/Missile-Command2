function maybeSpawnCarrier(){
  if(State.nextPowerup>=CONSTANTS.MAX_POWERUPS) return;
  if(State.nextPowerup<State.round && State.enemies.length>3){
    State.nextPowerup++;
    var target=pickTarget();
    if(target){
      var x=randRange(40,CONSTANTS.WIDTH-40);
      State.enemies.push({x:x,y:0,tx:target.x,ty:target.y,speed:CONSTANTS.ENEMY_SPEED*0.8,type:'normal',stage:0,carrier:true,power:pick(['cluster','freezer','chain','seeker']),hitBy:0,target:target});
      play('enemySpawn');
    }
  }
}

function grantPower(turret,type){
  turret.special=type;
  banner(type.toUpperCase());
  play('powerup');
}
