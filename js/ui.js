var multFillEl,multLabelEl,scoreEl,overlayEl,messageEl,playAgainEl;

function initUI(){
  multFillEl=document.getElementById('multiplier-fill');
  multLabelEl=document.getElementById('multiplier-label');
  scoreEl=document.getElementById('scoreHud');
  overlayEl=document.getElementById('overlay');
  messageEl=document.getElementById('message');
  playAgainEl=document.getElementById('playAgain');
  playAgainEl.addEventListener('click',function(){hideGameOver(); startGame();});
}

function updateUI(){
  var pct=clamp(State.multiplierCharge/100,0,1);
  multFillEl.style.height=(pct*100)+'%';
  multLabelEl.textContent='x'+State.multiplierLevel;
  scoreEl.textContent=Math.floor(State.score);
}

function showGameOver(){
  overlayEl.classList.remove('hidden');
  messageEl.textContent='Game Over';
  play('gameover');
}

function hideGameOver(){
  overlayEl.classList.add('hidden');
}
