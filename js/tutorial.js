/* CYBER OUTBREAK v0.6 — guided beginner tutorial (fictional gameplay only) */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const steps=[
  {title:'スタート地点を選択',text:'マップの「外縁ゲート」をタップ。ノードは架空の病院システムを表します。',event:'select',key:'gate',target:'[data-node="gate"]'},
  {title:'模擬データを回収',text:'「模擬データ回収」を押します。IPが増え、行動力を1 AP消費します。',event:'collect',key:'gate',target:'#nodeAction'},
  {title:'次のノードを選択',text:'マップの「事務情報」をタップし、次の対象を選びます。',event:'select',key:'office',target:'[data-node="office"]'},
  {title:'ノードに進出',text:'「ノードへ進出」を押してください。練習の最初の進出のみ成功保証です。',event:'expand',key:'office',target:'#nodeAction'},
  {title:'行動力を使い切る',text:'「事務情報」で模擬データを回収。これで初期の3 APを使い切ります。',event:'collect',key:'office',target:'#nodeAction'},
  {title:'進化研究所を開く',text:'上部の「進化・強化」を押します。',event:'panel',key:'upgrade',target:'#openUpgradeBtn'},
  {title:'解析Lv.1を購入',text:'「解析」を強化すると、回収1回あたりのIPが増えます。',event:'upgrade',key:'analysis',target:'[data-upgrade="analysis"]'},
  {title:'戦術ショップを開く',text:'今は0 APのため、通常は追加回収できません。「戦術ショップ」を開きましょう。',event:'panel',key:'shop',target:'#openShopBtn'},
  {title:'追加APを購入',text:'24 IPで追加アクションを購入し、0 APから1 APに補充します。',event:'boost',key:'boost',target:'[data-shop="boost"]'},
  {title:'購入したAPを使う',text:'「事務情報」で、追加された1 APを使ってもう一度回収しましょう。',event:'collect',key:'office',target:'#nodeAction'},
  {title:'ターンを終了',text:'APを使い切りました。「ターン終了」で病院側の防御イベントが進みます。',event:'turn',key:'turn',target:'#endTurnBtn'}
 ];
 let active=false,finished=false,paused=false,stepIndex=0;
 const guide=$('tutorialGuide'),progress=$('tutorialProgress'),progressBar=$('tutorialProgressBar'),
       title=$('tutorialTitle'),description=$('tutorialDescription'),status=$('tutorialStatus'),skip=$('tutorialSkipBtn');
 function clearHighlight(){
  document.querySelectorAll('.tutorial-spotlight').forEach(el=>el.classList.remove('tutorial-spotlight'));
 }
 function showStep(){
  if(!active||paused)return;
  clearHighlight();
  guide.hidden=false;
  const step=steps[stepIndex];
  progress.textContent='STEP '+(stepIndex+1)+' / '+steps.length;
  progressBar.style.width=((stepIndex+1)/steps.length*100)+'%';
  title.textContent=step.title;description.textContent=step.text;
  status.textContent='強調表示された場所を操作';
  skip.textContent='チュートリアル終了';
  const target=document.querySelector(step.target);
  guide.dataset.placement='bottom-left';
  if(!target){
   status.textContent='操作対象が表示されません。画面の拡大・パネルを確認';
   return;
  }
  target.classList.add('tutorial-spotlight');
  // All steps (including SVG nodes and toolbar commands) must scroll into view.
  if(typeof target.scrollIntoView==='function'){
   target.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'});
  }
  const rect=target.getBoundingClientRect();
  const width=Math.min(guide.offsetWidth||350,window.innerWidth-20);
  const height=Math.min(guide.offsetHeight||150,window.innerHeight-20);
  const margin=10;
  const corners=[
    {name:'bottom-left',x:margin,y:window.innerHeight-height-margin},
    {name:'top-left',x:margin,y:margin},
    {name:'bottom-right',x:window.innerWidth-width-margin,y:window.innerHeight-height-margin},
    {name:'top-right',x:window.innerWidth-width-margin,y:margin}
  ];
  const overlap=c=>Math.max(0,Math.min(c.x+width,rect.right)-Math.max(c.x,rect.left))*
                   Math.max(0,Math.min(c.y+height,rect.bottom)-Math.max(c.y,rect.top));
  corners.sort((a,b)=>overlap(a)-overlap(b));
  guide.dataset.placement=corners[0].name;
  // Focus the live target to support keyboard navigation without triggering it.
  // A drawer can still be entering its visible state when the next guided step begins.
  // Resolve the live element again after layout to avoid focusing a detached control.
  requestAnimationFrame(()=>{
   if(!active||paused||steps[stepIndex]!==step)return;
   const live=document.querySelector(step.target);
   if(live){
    live.scrollIntoView?.({block:'center',inline:'nearest',behavior:'auto'});
    live.focus?.({preventScroll:true});
   }
  });
 }
 function start(){
  stepIndex=0;active=true;finished=false;paused=false;document.body.classList.add('tutorial-active');
  document.querySelector('[data-landscape-view="node"]')?.click();
  showStep();
 }
 function reset(){
  active=false;finished=false;paused=false;stepIndex=0;
  guide.hidden=true;clearHighlight();document.body.classList.remove('tutorial-active');
 }
 function pause(){if(active){paused=true;guide.hidden=true;clearHighlight();document.body.classList.remove('tutorial-active')}}
 function resume(){if(active){paused=false;document.body.classList.add('tutorial-active');showStep()}}
 function allows(event,key){
  if(!active)return false;
  const step=steps[stepIndex];
  if(event===step.event&&key===step.key)return true;
  if(event==='select'&&(step.event==='collect'||step.event==='expand')&&key===step.key)return true;
  if(event==='panel'&&step.event==='upgrade'&&key==='upgrade')return true;
  if(event==='panel'&&step.event==='boost'&&key==='shop')return true;
  return false;
 }
 function onAction(event,key){
  if(!active||paused||finished)return;
  const step=steps[stepIndex];
  if(step.event!==event||step.key!==key)return;
  stepIndex++;
  if(stepIndex===steps.length){
   active=false;finished=true;
   clearHighlight();document.body.classList.remove('tutorial-active');
   window.CyberOutbreakGame?.leaveTutorial?.();
   guide.hidden=false;
   progress.textContent='COMPLETE';
   progressBar.style.width='100%';
   title.textContent='チュートリアル完了！';
    description.textContent='基本操作を完了しました。通常操作として続行できますが、この練習から開始した攻略では最後までRP・実績は保存されません。RP獲得には通常ゲームから開始してください。';
   status.textContent='練習用の進行状況を引き継ぎます';
   skip.textContent='ゲームを続ける';
   return;
  }
  window.CyberOutbreakGame?.refresh?.();
  showStep();
 }
 skip.addEventListener('click',()=>{
  if(finished){reset();return}
  window.CyberOutbreakGame?.leaveTutorial?.();reset();
 });
 window.CyberOutbreakTutorial={start,reset,pause,resume,allows,onAction,getStep:()=>stepIndex,isActive:()=>active};
})();
