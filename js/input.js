function initInput(canvas){
  function getPos(ev){
    var rect=canvas.getBoundingClientRect();
    var x=ev.clientX-rect.left;
    var y=ev.clientY-rect.top;
    State.mouseX=x; State.mouseY=y;
    return {x:x,y:y};
  }
  canvas.addEventListener('click',function(ev){
    var p=getPos(ev);
    var x=p.x;
    var y=p.y;
    var arr=[];
    for(var i=0;i<State.turrets.length;i++){
      var t=State.turrets[i];
      if(t.alive) arr.push({t:t,d:Math.abs(x-t.x)});
    }
    arr.sort(function(a,b){return a.d-b.d;});
    for(i=0;i<arr.length;i++){
      var turret=arr[i].t;
      var available=0;
      for(var c=0;c<2;c++) if(turret.charges[c]<=0) available++;
      if(turret.alive && available>0 && turret.cool<=0){
        shoot(turret,x,y);
        break;
      }
    }
  });
  canvas.addEventListener('mousemove',function(ev){getPos(ev);});
}
