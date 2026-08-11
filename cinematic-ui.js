
(function(){'use strict';
  const $=id=>document.getElementById(id);
  const boot=$('bootSequence');
  const stage=$('calcStageText');
  const progress=document.querySelector('.calc-progress span');
  const calc=$('calculate');

  window.addEventListener('load',()=>setTimeout(()=>boot?.classList.add('done'),650));

  window.addEventListener('albaz:languagechange',()=>{
    if(stage&&!document.body.classList.contains('calculating')){
      stage.textContent=window.ALBAZI18N?.lang==='en'?'Ready to calculate':'جاهز للحساب';
    }
  });

  window.addEventListener('albaz:calcstage',ev=>{
    const d=ev.detail||{},p=Math.max(0,Math.min(1,Number(d.progress)||0));
    if(stage&&d.message)stage.textContent=d.message;
    if(progress){progress.style.animation='none';progress.style.width=`${Math.round(p*100)}%`;}
    const running=d.state==='running';
    document.body.classList.toggle('calculating',running);
    if(calc)calc.disabled=running;
    if(d.state==='error'&&progress)progress.style.width='100%';
  });

  // IMPORTANT: animate only on a real hidden -> visible transition.
  // The previous implementation reacted to its own reveal-ready/reveal-in class
  // mutations and could create an infinite MutationObserver feedback loop.
  const revealTargets=['resultsPanel','geoPanel','reportPanel'];
  revealTargets.forEach(id=>{
    const el=$(id); if(!el)return;
    let wasHidden=el.classList.contains('hidden');
    let raf1=0,raf2=0;
    const obs=new MutationObserver(()=>{
      const nowHidden=el.classList.contains('hidden');
      if(wasHidden && !nowHidden){
        if(raf1)cancelAnimationFrame(raf1);
        if(raf2)cancelAnimationFrame(raf2);
        el.classList.remove('reveal-in','reveal-ready');
        el.classList.add('reveal-ready');
        raf1=requestAnimationFrame(()=>{
          raf2=requestAnimationFrame(()=>{
            el.classList.add('reveal-in');
            el.classList.remove('reveal-ready');
          });
        });
      }
      wasHidden=nowHidden;
    });
    obs.observe(el,{attributes:true,attributeFilter:['class']});
  });

  const map=$('mapPanel');
  if(map){
    let wasHidden=map.classList.contains('hidden');
    const obs=new MutationObserver(()=>{
      const nowHidden=map.classList.contains('hidden');
      if(wasHidden && !nowHidden)map.classList.add('map-awake');
      wasHidden=nowHidden;
    });
    obs.observe(map,{attributes:true,attributeFilter:['class']});
  }
})();

