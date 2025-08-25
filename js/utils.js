function clamp(v,min,max){return v<min?min:(v>max?max:v);}
function randRange(min,max){return Math.random()*(max-min)+min;}
function distanceSq(x1,y1,x2,y2){var dx=x1-x2,dy=y1-y2;return dx*dx+dy*dy;}
function now(){return Date.now()/1000;}
function pick(a){return a[Math.floor(Math.random()*a.length)];}
