/* CYBER OUTBREAK v0.6 — guided beginner tutorial (fictional gameplay only) */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const steps=[
  {title:'スタート地点を選択',text:'マップの「外縁ゲート」をタップしてください。四角いアイコンが病院システムを表す架空のノードです。',event:'select',key:'gate',target:'[data-node="gate"]'},
  {title:'仮想データを回収',text:'右側の「模擬データ回収」を押してみましょう。IPが増え、1 AP（行動力）を使います。',event:'collect',key:'gate',target:'#nodeAction'},
  {title:'次のノードを選択',text:'マップ上の青い「事務情報」ノードを選択します。接続されたノードから行動範囲を広げていきます。',event:'select',key:'office',target:'[data-node="office"]'},
  {title:'ノードへ進出',text:'右側の「ノードへ進出」を押してください。練習のため今回だけ確実に成功します。通常プレイではゲーム内の確率で判定されます。',event:'expand',key:'office',target:'#nodeAction'},
  {title:'進化研究所を開く',text:'上部の「進化・強化」を押しましょう。獲得したIPで能力を育てることができます。',event:'panel',key:'upgrade',target:'#openUpgradeBtn'},
  {title:'解析をLv.1にする',text:'「解析」の購入ボタンを押して、模擬データの回収効率を強化しましょう。購入後はパネルが閉じます。',event:'upgrade',key:'analysis',target:'[data-upgrade="analysis"]'},
  {title:'戦術ショップを開く',text:'続いて「戦術ショップ」を開きます。今回は練習用のIPがあるため、追加アクションを購入できます。',event:'panel',key:'shop',target:'#openShopBtn'},
  {title:'追加アクションを購入',text:'「追加アクション」を選んで +1 AP を得ましょう。通常は24 IP必要で、1ターンに1回だけ購入できます。',event:'boost',key:'boost',target:'[data-shop="boost"]'},
  {title:'ターンを終了',text:'「ターン終了」を押しましょう。病院側も経路の分離や復旧などの防御行動を行います。',event:'turn',key:'turn',target:'#endTurnBtn'}
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
  if(target){
   target.classList.add('tutorial-spotlight');
   if(target.matches('#nodeAction,[data-upgrade],[data-shop],#endTurnBtn')){
    target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
   }
  }
 }
 function start(){
  stepIndex=0;active=true;finished=false;paused=false;
  document.querySelector('[data-landscape-view="node"]')?.click();
  showStep();
 }
 function reset(){
  active=false;finished=false;paused=false;stepIndex=0;
  guide.hidden=true;clearHighlight();
 }
 function pause(){if(active){paused=true;guide.hidden=true;clearHighlight()}}
 function resume(){if(active){paused=false;showStep()}}
 function allows(event,key){
  if(!active)return false;
  const step=steps[stepIndex];
  if(event===step.event&&key===step.key)return true;
  // Selecting the currently guided node again or reopening the relevant drawer is harmless.
  if(event==='select'&&step.event==='collect'&&key==='gate')return true;
  if(event==='select'&&step.event==='expand'&&key==='office')return true;
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
   clearHighlight();
   window.CyberOutbreakGame?.leaveTutorial?.();
   guide.hidden=false;
   progress.textContent='COMPLETE';
   progressBar.style.width='100%';
   title.textContent='チュートリアル完了！';
   description.textContent='基本操作を覚えました。病院側の防御イベントと警戒度を確認しながら、引き続きプレイできます。実際の医療情報システムは使用していません。';
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
