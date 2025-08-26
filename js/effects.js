var playfieldEl, vignetteEl, announceEl;

function initEffects(){
  playfieldEl=document.getElementById('playfield');
  vignetteEl=document.getElementById('vignette');
  announceEl=document.getElementById('announcements');
}

function shake(){
  playfieldEl.classList.add('shake');
  setTimeout(function(){playfieldEl.classList.remove('shake');},180);
}

function flashRed(){
  vignetteEl.classList.add('red');
  setTimeout(function(){vignetteEl.classList.remove('red');},350);
}

function setBlueActive(a){
  if(a){vignetteEl.classList.add('blue');}
  else{vignetteEl.classList.remove('blue');}
  if(!a) play('powerup');
}

function setRedActive(a){
  if(a){vignetteEl.classList.add('overdrive');}
  else{vignetteEl.classList.remove('overdrive');}
}

function banner(text){
  var div=document.createElement('div');
  div.className='banner';
  div.textContent=text;
  announceEl.appendChild(div);
  setTimeout(function(){if(div.parentNode) announceEl.removeChild(div);},900);
}
