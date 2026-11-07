/* CYBER OUTBREAK v0.7.2 — accessible rule and result dialogs */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const intro=$('intro'),result=$('result'),wrap=document.querySelector('.wrap');
 let active=null,returnFocus=null;
 const modal=id=>id==='intro'?intro:result;
 function focusTarget(id){
  const title=$(id==='intro'?'introTitle':'resultTitle');
  if(title)title.focus({preventScroll:true});
 }
 function show(id){
  const node=modal(id);
  if(!node||node.hidden)return;
  if(!active)returnFocus=document.activeElement;
  active=id;
  wrap.inert=true;
  $('closeIntroBtn').hidden=$('continueBtn').hidden;
  focusTarget(id);
 }
 function hide(){
  if(!intro.hidden&&!result.hidden)return;
  const previous=returnFocus;
  active=null;returnFocus=null;
  wrap.inert=false;
  if(window.CyberOutbreakGame?.isTutorial?.())return;
  if(previous&&previous.isConnected&&!previous.closest('[hidden]')&&previous!==document.body){
   previous.focus({preventScroll:true});
  }else{
   const map=$('mapSection');map.setAttribute('tabindex','-1');map.focus({preventScroll:true});
  }
 }
 function focusedItems(root){
  return [...root.querySelectorAll('button:not(:disabled),a[href],select:not(:disabled),input:not(:disabled),[tabindex]:not([tabindex="-1"])')]
    .filter(el=>!el.hidden&&!el.closest('[hidden]')&&el.getClientRects().length>0);
 }
 document.addEventListener('keydown',e=>{
  if(!active)return;
  const overlay=modal(active);
  if(overlay.hidden)return;
  if(e.key==='Escape'){
   e.preventDefault();
   if(active==='intro'&&!$('continueBtn').hidden)$('continueBtn').click();
   else if(active==='result')$('resultMenuBtn').click();
   return;
  }
  if(e.key!=='Tab')return;
  const items=focusedItems(overlay);
  if(!items.length){e.preventDefault();focusTarget(active);return}
  const first=items[0],last=items[items.length-1],current=document.activeElement;
  if(e.shiftKey&&(current===first||!overlay.contains(current))){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&(current===last||!overlay.contains(current))){e.preventDefault();first.focus()}
 });
 $('closeIntroBtn').addEventListener('click',()=>{if(!$('continueBtn').hidden)$('continueBtn').click()});
 $('continueBtn').addEventListener('click',hide);
 $('startBtn').addEventListener('click',hide);
 $('tutorialStartBtn').addEventListener('click',hide);
 $('againBtn').addEventListener('click',hide);
 for(const id of ['helpBtn','guideBtn','restartBtn']){
  $(id).addEventListener('click',()=>{if(!intro.hidden)show('intro')});
 }
 // The initial rule dialog is visible before scripts run.
 if(!intro.hidden)show('intro');
 window.CyberOutbreakDialogs={show,hide,getActive:()=>active};
})();
