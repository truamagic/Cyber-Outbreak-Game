/* CYBER OUTBREAK v0.5 - screen orientation and landscape navigation */
(()=>{
 'use strict';
 const game=document.querySelector('.main');
 const notice=document.getElementById('orientationPrompt');
 const portraitButton=document.getElementById('continuePortraitBtn');
 const mobilePortrait=window.matchMedia('(orientation: portrait) and (max-width: 700px) and (pointer: coarse)');
 const viewButtons=[...document.querySelectorAll('[data-landscape-view]')];
 const expandButton=document.getElementById('mapMaximizeBtn');
 function setPanel(name){
  if(!['node','mission','log','awards'].includes(name))return;
  game.dataset.landscapeTab=name;
  game.dataset.mapOnly='false';
  expandButton.setAttribute('aria-pressed','false');
  expandButton.textContent='マップ拡大';
  for(const button of viewButtons)button.setAttribute('aria-pressed',String(button.dataset.landscapeView===name));
 }
 for(const button of viewButtons)button.addEventListener('click',()=>setPanel(button.dataset.landscapeView));
 expandButton.addEventListener('click',()=>{
  const expanded=game.dataset.mapOnly!=='true';
  game.dataset.mapOnly=String(expanded);
  expandButton.setAttribute('aria-pressed',String(expanded));
  expandButton.textContent=expanded?'操作を表示':'マップ拡大';
 });
 const network=document.getElementById('network');
 network.addEventListener('click',e=>{if(e.target.closest('[data-node]'))setPanel('node')});
 network.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-node]'))setPanel('node')});
 portraitButton.addEventListener('click',()=>{notice.classList.add('dismissed');document.getElementById('helpBtn').focus({preventScroll:true})});
 function onOrientationChange(){if(!mobilePortrait.matches)notice.classList.remove('dismissed')}
 if(typeof mobilePortrait.addEventListener==='function')mobilePortrait.addEventListener('change',onOrientationChange);
 else if(typeof mobilePortrait.addListener==='function')mobilePortrait.addListener(onOrientationChange);
})();
