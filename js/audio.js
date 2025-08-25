function play(name){
  try{
    var a=new Audio('audio/'+name+'.wav');
    a.volume=0.5;
    a.play();
  }catch(e){
    /* ignore missing audio */
  }
}
