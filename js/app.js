(()=>{
'use strict';
const $=id=>document.getElementById(id);
const SVG_NS='http://www.w3.org/2000/svg';
const {EDGES,MAP,RULES,UPGRADES,ARTIFACTS,MILESTONES}=window.CyberOutbreakData;
const PROG=window.CyberOutbreakProgression;
let meta=PROG.loadMeta();
const ALL_AWARDS=[...MILESTONES,...ARTIFACTS.map(a=>({...a,icon:'▣'}))];
const STORAGE_KEY='cyber-outbreak:achievements:v02';
let state=null,hasBegun=false;let awardFilter='all',lastToastKey='',toastTimer=null;
let earned=readEarned();
function readEarned(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return new Set(Array.isArray(value)?value.filter(v=>ALL_AWARDS.some(a=>a.id===v)):[])}catch(_){return new Set()}}
function persistEarned(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify([...earned]))}catch(_){/* local data may be disabled */}}
function earn(id){if(state?.wasTutorial||state?.tutorial||!ALL_AWARDS.some(a=>a.id===id)||earned.has(id))return;earned.add(id);persistEarned();const a=ALL_AWARDS.find(a=>a.id===id);log('実績解除：「'+a.name+'」','positive');addRP(5,'achievements')}
function addRP(amount,category='achievements'){if(amount<=0)return;meta.rp=Math.min(100000,meta.rp+amount);if(state){state.rpEarned=(state.rpEarned||0)+amount;if(state.rpBreakdown&&Object.hasOwn(state.rpBreakdown,category))state.rpBreakdown[category]+=amount}PROG.saveMeta(meta)}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function makeState(difficulty='normal',profileId='B'){
 const chosenProfile=PROG.PROFILES[profileId]?profileId:'B';
 const rule=RULES[difficulty]||RULES.normal;const artifacts=shuffle(ARTIFACTS.map(a=>a.id)).slice(0,3),targets=shuffle(MAP.filter(n=>n.id!=='gate').map(n=>n.id)).slice(0,3);
 const artifactsOnNodes=Object.fromEntries(targets.map((id,i)=>[id,artifacts[i]]));
 return {difficulty,rule,turn:1,ap:3+meta.levels.initiative,points:rule.startIP+5*meta.levels.funding,total:0,harvested:0,passive:0,demandIncome:0,alert:Math.max(0,rule.startAlert-2*meta.levels.readiness),selected:'gate',up:{spread:0,analysis:0,adapt:0,sustain:0},
 nodes:MAP.map(n=>({...n,left:n.data,owned:n.id==='gate',bonusSecurity:0,lockedUntil:0,unitTurns:0,demanded:false,harvestOnce:false,artifact:artifactsOnNodes[n.id]||null})),
 edges:EDGES.map(([a,b])=>({a,b,blockedUntil:0})),log:[],ended:false,started:true,demandAttempts:0,unitsEarned:0,shopBoostedTurn:0,
 profileId:chosenProfile,maturity:PROG.initialMaturity(chosenProfile),opportunity:null,opportunitiesSeen:0,opportunitiesUsed:0,opportunityBonus:0,
 impact:{info:0,systems:0,financial:0,care:0},rpEarned:0,rpBreakdown:{achievements:0,clear:0,firstClear:0,profile:0,loss:0},defenseHistory:{isolations:0,blockedIncomeTurns:0,blockedIncomeIP:0,recoveredNodes:0,removedUnits:0},wasTutorial:false,forecastLevel:meta.levels.forecast}
}
function node(id){return state.nodes.find(n=>n.id===id)}
function edge(a,b){return state.edges.find(e=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a))}
function openLink(a,b){const e=edge(a,b);return !!e&&e.blockedUntil<state.turn}
function connected(){const seen=new Set(['gate']),queue=['gate'];while(queue.length){const id=queue.shift();for(const e of state.edges){const next=e.a===id?e.b:e.b===id?e.a:null;if(!next||seen.has(next)||!openLink(id,next))continue;const n=node(next);if(n.owned){seen.add(next);queue.push(next)}}}return seen}
function isActive(n){return n.owned&&connected().has(n.id)}
function reachable(n){const group=connected();return !n.owned&&state.edges.some(e=>e.blockedUntil<state.turn&&((e.a===n.id&&group.has(e.b))||(e.b===n.id&&group.has(e.a))))}
function visible(n){return n.owned||reachable(n)||state.edges.some(e=>(e.a===n.id&&node(e.b).owned)||(e.b===n.id&&node(e.a).owned))}
function activeCount(){return connected().size}
function totalUnits(){return state.nodes.filter(n=>n.unitTurns>0).length}
function log(msg,kind='info'){state.log.unshift({turn:state.turn,msg,kind});state.log=state.log.slice(0,15)}
function applyAlert(value){const monitoring=state.maturity?.monitoring??50;state.alert=Math.max(0,Math.min(100,state.alert+Math.max(1,Math.round(value*state.rule.alertFactor*(.72+.28*monitoring/100))-state.up.adapt)))}
function setText(id,text){const el=$(id);if(el)el.textContent=text}

const PANEL_INFO={shop:['戦術ショップ','TACTICAL SHOP'],upgrade:['進化研究所','UPGRADE LAB'],research:['永続研究所','PERMANENT RESEARCH']};
let activePanel=null,returnFocus=null;
function tutorialAllows(action,target){return !state?.tutorial||!!window.CyberOutbreakTutorial?.allows?.(action,target)}
function tutorialSignal(action,target){if(state?.tutorial)window.CyberOutbreakTutorial?.onAction?.(action,target)}

function openPanel(name){
 if(!PANEL_INFO[name]||!$('intro').hidden||!$('result').hidden||!tutorialAllows('panel',name))return;
 if(activePanel===name){closePanel();return}
 if(!activePanel)returnFocus=document.activeElement;
 activePanel=name;
 setText('drawerTitle',PANEL_INFO[name][0]);setText('drawerKicker',PANEL_INFO[name][1]);
 setText('drawerBalanceLabel',name==='research'?'RESEARCH POINTS':'AVAILABLE POINTS');
 setText('shopIpBalance',name==='research'?meta.rp+' RP':state.points+' IP');
 document.querySelectorAll('[data-panel-view]').forEach(v=>v.hidden=v.dataset.panelView!==name);
 document.querySelectorAll('[data-panel]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.panel===name)));
 const d=$('controlDrawer');d.inert=false;d.setAttribute('aria-hidden','false');d.classList.add('open');
 $('drawerBackdrop').classList.add('open');document.body.classList.add('drawer-open');
 $('closeDrawerBtn').focus({preventScroll:true});
 tutorialSignal('panel',name);
}
function closePanel(restore=true){
 if(!activePanel)return;
 activePanel=null;
 const d=$('controlDrawer');d.classList.remove('open');d.setAttribute('aria-hidden','true');
 $('drawerBackdrop').classList.remove('open');document.body.classList.remove('drawer-open');
 document.querySelectorAll('[data-panel]').forEach(b=>b.setAttribute('aria-expanded','false'));
 const focus=returnFocus;returnFocus=null;
 if(restore&&focus&&focus.isConnected)focus.focus({preventScroll:true});
 d.inert=true;
}
function trapPanel(e){
 if(e.key==='Escape'){e.preventDefault();closePanel();return}
 if(e.key!=='Tab'||!activePanel)return;
 const focusable=[...$('controlDrawer').querySelectorAll('button:not([disabled])')].filter(el=>!el.closest('[hidden]'));
 if(!focusable.length)return;
 const first=focusable[0],last=focusable[focusable.length-1];
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
}

function render(){if(!state)return;
 setText('pointsVal',state.points+' IP');setText('shopHeaderPoints',state.points+' IP');setText('metaHeaderRP',meta.rp+' RP');setText('metaIntro','研究ポイント：'+meta.rp+' RP / 次の攻略に引き継ぎ');setText('harvestVal',state.total+' IP');setText('ownedVal',activeCount()+' / '+state.nodes.length);setText('turnVal',state.turn+' / '+state.rule.maxTurns);
 setText('incomeHint','継続収入 '+state.nodes.filter(n=>n.unitTurns>0&&isActive(n)).length+' 台稼働');setText('apHint','残り行動力 '+('● '.repeat(state.ap)||'なし')+'('+state.ap+'/3)');
 setText('harvestHint','目標 '+state.rule.targetIP+' IP（全収入）');setText('ownedHint','接続中の目標 '+state.rule.targetNodes+' ノード');
 setText('goalIPText',state.total+' / '+state.rule.targetIP+' IP');setText('goalNodeText',activeCount()+' / '+state.rule.targetNodes);setText('alertText',state.alert+' / 100');
 $('goalIPBar').style.width=Math.min(100,state.total/state.rule.targetIP*100)+'%';$('goalNodeBar').style.width=Math.min(100,activeCount()/state.rule.targetNodes*100)+'%';$('alertBar').style.width=state.alert+'%';
 setText('alertMessage',state.alert>=80?'病院側が重点対応中。継続収入が停止される可能性も高まっています。':state.alert>=55?'警戒度上昇。ネットワーク分離・復旧に注意。':state.alert>=25?'病院側が兆候を検知し、経路遮断や防御強化を検討しています。':'病院側は通常監視中。警戒度100で終了します。');
 $('statusChips').innerHTML=`<span class="status-chip">遮断経路 ${state.edges.filter(e=>e.blockedUntil>=state.turn).length}</span><span class="status-chip">継続ユニット ${totalUnits()}/2</span><span class="status-chip">回収 ${state.harvested} IP</span><span class="status-chip">継続収入 ${state.passive} IP</span><span class="status-chip ${state.demandAttempts?'alert':''}">要求イベント ${state.demandIncome} IP</span><span class="status-chip">好機 ${state.opportunityBonus} IP</span>`;
 setText('mapStatus',state.ended?'SIMULATION COMPLETE':'ROUND '+String(state.turn).padStart(2,'0')+' / AP '+state.ap);
 setText('missionBrief','勝利条件：累計'+state.rule.targetIP+' IP＋接続'+state.rule.targetNodes+'ノード／'+state.rule.maxTurns+'ターン以内・警戒100で終了');
 updateHUD();
 renderMap();renderDetail();renderUpgrades();renderShop();renderFeed();renderAwards();renderMaturity();renderImpact();renderOpportunity();renderResearch();$('endTurnBtn').disabled=state.ended||!tutorialAllows('turn','turn');
 $('openShopBtn').disabled=state.ended||!tutorialAllows('panel','shop');
 $('openUpgradeBtn').disabled=state.ended||!tutorialAllows('panel','upgrade');
 $('openResearchBtn').disabled=state.ended||!!state.tutorial;
}
function svgEl(tag,attrs,parent,text){const el=document.createElementNS(SVG_NS,tag);Object.entries(attrs).forEach(([a,v])=>el.setAttribute(a,v));if(text!==undefined)el.textContent=text;(parent||$('network')).append(el);return el}

function updateHUD(){
 const lvl=state.alert>=80?'最重要警戒':state.alert>=55?'重点対応中':state.alert>=25?'監視強化':'通常監視';
 setText('alertDialNumber',String(state.alert).padStart(2,'0'));
 const dial=$('alertDial');dial.style.setProperty('--dial-deg',(state.alert*3.6)+'deg');dial.style.setProperty('--dial-color',state.alert>=70?'#ff8f9f':state.alert>=35?'#fbd181':'#70ead4');
 setText('defenseStage',lvl);setText('briefCycle','TURN '+String(state.turn).padStart(2,'0')+' / '+String(state.rule.maxTurns).padStart(2,'0'));
 const cuts=state.edges.filter(e=>e.blockedUntil>=state.turn).length;
 setText('mapLinkCount',String(state.edges.length-cuts).padStart(2,'0')+' / '+state.edges.length+' ACTIVE');
 setText('mapMode','NODES '+activeCount()+'/'+state.nodes.length+'  ·  CUT '+cuts);
 const latest=state.log[0];if(latest){setText('pulseText',latest.msg);setText('pulseTurn','T'+String(latest.turn).padStart(2,'0'));
  const key=state.turn+':'+latest.msg+':'+state.log.length;
  if(lastToastKey!==key){lastToastKey=key;if(hasBegun&&latest.kind!=='info'&&!(state.ended)){
    const toast=$('toast');toast.textContent=latest.msg;toast.className=latest.kind==='negative'?'show negative':'show';
    if(toastTimer)clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.className=''},2600);
   }}
 }
}
function nodeGraphic(g,n,visibleOnMap){
 const x=n.x-48,y=n.y-3;
 svgEl('rect',{x:x-15,y:y-16,width:30,height:30,rx:8,class:'node-icon-box'},g);
 if(!visibleOnMap){svgEl('path',{d:`M${x-4} ${y-4}q4 -6 8 0q2 3 -2 6l-2 2m0 5v1`,class:'node-glyph'},g);return;}
 const p={
  gate:`M${x-7} ${y-8}L${x+8} ${y}L${x-7} ${y+8}z`,
  office:`M${x-7} ${y-8}h14v16h-14z M${x-3} ${y-4}h6 M${x-3} ${y}h6 M${x-3} ${y+4}h6`,
  shared:`M${x-7} ${y-4}h14v9h-14z M${x-4} ${y-8}h8 M${x-4} ${y+9}h8`,
  billing:`M${x-7} ${y-9}h14v18h-14z M${x-4} ${y-4}h8 M${x-4} ${y}h8 M${x-4} ${y+4}h5`,
  lab:`M${x-2} ${y-9}v8l-6 9h16l-6 -9v-8 M${x-4} ${y-9}h8 M${x-4} ${y+4}h8`,
  image:`M${x-9} ${y-6}h18v13h-18z M${x-6} ${y+4}l4 -5 3 3 3 -4 3 6`,
  records:`M${x-7} ${y-9}h11l4 4v14h-15z M${x+4} ${y-9}v4h4 M${x-4} ${y+1}h8`,
  operations:`M${x} ${y-10}v4 M${x} ${y+6}v4 M${x-10} ${y}h4 M${x+6} ${y}h4 M${x-6} ${y-6}l3 3 M${x+3} ${y+3}l3 3 M${x+6} ${y-6}l-3 3 M${x-3} ${y+3}l-3 3 M${x} ${y-6}a6 6 0 1 0 0 12a6 6 0 1 0 0 -12` }[n.id];
 svgEl('path',{d:p,class:'node-glyph'},g);
}

function renderMap(){
 const svg=$('network');svg.innerHTML='';
 const defs=svgEl('defs',{},svg);
 const grad=svgEl('radialGradient',{id:'ambient-glow',cx:'51%',cy:'45%',r:'62%'},defs);
 svgEl('stop',{offset:'0%','stop-color':'#164359','stop-opacity':'.44'},grad);
 svgEl('stop',{offset:'100%','stop-color':'#07192b','stop-opacity':'0'},grad);
 svgEl('rect',{width:780,height:410,rx:10,class:'map-bg'},svg);
 svgEl('rect',{width:780,height:410,rx:10,fill:'url(#ambient-glow)'},svg);
 for(let x=17;x<780;x+=28)svgEl('line',{x1:x,y1:0,x2:x,y2:410,class:'grid-pattern'},svg);
 for(let y=17;y<410;y+=28)svgEl('line',{x1:0,y1:y,x2:780,y2:y,class:'grid-pattern'},svg);
 [74,135,198].forEach(r=>svgEl('circle',{cx:412,cy:211,r,fill:'none',stroke:'#30647b','stroke-opacity':'.19','stroke-width':1},svg));
 svgEl('path',{d:'M16 38h25 M16 38v-20 M740 38h24 M764 38v-20 M16 372h25 M16 372v21 M740 372h24 M764 372v21',stroke:'#5e93a8','stroke-width':'1.4',fill:'none',opacity:'.58'},svg);
 svgEl('text',{x:26,y:26,fill:'#648ca2','font-size':10,'font-family':'monospace','letter-spacing':'1.7'},svg,'TOPOLOGY // FICTIONAL SYSTEM');
 svgEl('text',{x:759,y:398,fill:'#648ca2','font-size':10,'text-anchor':'end','font-family':'monospace'},svg,'NODES 08 / LINK 10');
 for(const e of state.edges){const a=node(e.a),b=node(e.b),blocked=e.blockedUntil>=state.turn,live=isActive(a)&&isActive(b);
  if(blocked)svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'edge cut-halo'},svg);
  svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'edge '+(blocked?'cut':live?'live':!visible(a)||!visible(b)?'unknown':'')},svg);
  if(blocked){const cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;svgEl('circle',{cx,cy,r:12,class:'edge-break'},svg);svgEl('text',{x:cx,y:cy+5,class:'edge-break-text'},svg,'×')}
 }
 for(const n of state.nodes){const isVisible=visible(n),active=isActive(n),isolated=n.owned&&!active,protectedNode=n.lockedUntil>=state.turn&&!n.owned;
  const cls='node '+(!isVisible?'is-hidden':n.owned?'is-owned':'is-reachable')+(isolated?' is-isolated':'')+(n.id===state.selected?' is-selected':'')+(protectedNode?' is-locked':'')+(n.unitTurns>0?' is-generator':'');
  const g=svgEl('g',{class:cls,'data-node':n.id,role:'button',tabindex:0,'aria-label':(isVisible?n.name:'未発見ノード')+'を選択'},svg);
  svgEl('circle',{class:'pulse',cx:n.x,cy:n.y,r:52},g);
  svgEl('rect',{class:'selection',x:n.x-70,y:n.y-43,width:140,height:85,rx:13},g);
  svgEl('rect',{class:'tile',x:n.x-65,y:n.y-38,width:130,height:75,rx:11},g);
  svgEl('rect',{class:'node-indicator',x:n.x-60,y:n.y-32,width:3,height:64,rx:2},g);
  nodeGraphic(g,n,isVisible);
  const txt=(value,x,y,cls)=>svgEl('text',{class:cls,x,y,'text-anchor':'start'},g,value);
  txt(isVisible?'SYS / '+n.code:'SYS / --',n.x-20,n.y-20,'number');
  txt(isVisible?n.name:'未確認',n.x-21,n.y+2,'name');
  txt(!isVisible?'LOCKED':isolated?'CONNECTION LOST':n.unitTurns>0?'収入 '+n.unitTurns+' T':n.owned?'ACTIVE':protectedNode?'PROTECTED':reachable(n)?'AVAILABLE':'ISOLATED',n.x-21,n.y+21,'info');
  if(n.unitTurns>0)svgEl('text',{x:n.x+49,y:n.y-20,class:'gen-marker','text-anchor':'middle'},g,'●');
 }
}
function renderDetail(){const n=node(state.selected),active=isActive(n),disconnected=n.owned&&!active;
 const status=n.owned?(active?'ACTIVE / 影響中':'ISOLATED / 分離中'):reachable(n)?'AVAILABLE / 進出可能':visible(n)?'BLOCKED / 保護中':'UNKNOWN / 未発見';
 const desc=visible(n)?n.desc:'まだ探索できないノードです。接続経路があるノードから探索を進めてください。';
 const defense=visible(n)?n.security+n.bonusSecurity:0;
 const data=visible(n)?n.left+' IP':'不明';
 const estimate=!n.owned&&reachable(n)?`推定進出成功率：${expansionChance(n)}%（ゲーム用確率、練習の初回進出のみ成功保証）`:'1 APでの回収見込み：'+Math.min(n.left,11+state.up.analysis*5)+' IP';
 const canCollect=n.owned&&active&&n.left>0&&state.ap>0&&!state.ended&&tutorialAllows('collect',n.id);
 const canExpand=!n.owned&&reachable(n)&&n.lockedUntil<state.turn&&state.ap>0&&!state.ended&&tutorialAllows('expand',n.id);
 const canInstall=n.owned&&active&&n.server&&n.unitTurns===0&&totalUnits()<2&&state.points>=16&&state.ap>0&&!state.ended;
 const canDemand=n.owned&&active&&!n.demanded&&n.data-n.left>=10&&state.ap>0&&!state.ended;
 const primary=n.owned?(n.left>0?'▤  模擬データ回収  /  1 AP':'模擬データ回収済み'):!visible(n)?'探索範囲外':n.lockedUntil>=state.turn?'一時保護中':!reachable(n)?'経路遮断中':'↗  ノードへ進出  /  1 AP';
 const gems=Array.from({length:5},(_,i)=>'<i class="'+(i<defense?'filled':'')+'"></i>').join('');
 $('detailContent').innerHTML=`<div class="detail-title"><div class="detail-icon">${visible(n)?n.code:'??'}</div><div><div class="detail-status">${status}</div><div class="detail-name">${visible(n)?n.name:'未確認ノード'}</div></div></div>
 <p class="description">${desc}</p>
 <div class="kv"><div class="kv-item"><small>DEFENSE / 防御強度</small><div class="defense-pips" aria-label="防御強度 ${defense} / 5">${gems}</div></div><div class="kv-item"><small>SIMULATED DATA / 残量</small><strong>${data}</strong></div></div>
 <div class="detail-note">${disconnected?'病院側が経路を分離中。接続が戻るまで行動・継続収入が停止します。':n.owned&&n.unitTurns>0?'継続収入ユニット設置中。残り '+n.unitTurns+' ターン。':n.owned?'模擬データを回収するか、継続収入・要求イベントを選択できます。':'進出は抽象的な成功・失敗判定で処理します。'}</div>
 <p class="action-estimate">${estimate}</p><div class="action-stack"><button class="primary" id="nodeAction" type="button" ${canCollect||canExpand?'':'disabled'}>${primary}</button>
 <button class="secondary amber-button" id="nodeShopBtn" type="button" ${tutorialAllows("panel","shop")?"":"disabled"}>◈ このノードの戦術ショップを開く ↗</button><div class="action-sub">継続収入ユニット、要求イベント、追加行動力はショップから選択します。</div></div>`;
 $('nodeAction').addEventListener('click',()=>n.owned?collect(n.id):expand(n.id));$('nodeShopBtn').addEventListener('click',()=>openPanel('shop'));
}
function renderUpgrades(){$('upgrades').innerHTML=Object.entries(UPGRADES).map(([key,u])=>{const lv=state.up[key],cost=u.costs[lv],ticks=Array.from({length:3},(_,i)=>'<span class="'+(lv>i?'on':'')+'"></span>').join('');return `<div class="upgrade-item"><div class="upgrade-icon" aria-hidden="true">${u.icon}</div><div><div class="upgrade-name">${u.label} <span class="level">LV ${lv} / 3</span></div><div class="upgrade-description">${u.desc}</div><div class="upgrade-ticks">${ticks}</div></div><button class="upgrade-button" data-upgrade="${key}" aria-label="${u.label} ${lv>=3?'最大レベル到達':'をLv.'+(lv+1)+'に強化、'+cost+' IP'}" ${lv>=3||state.points<cost||state.ended||!tutorialAllows('upgrade',key)?'disabled':''}>${lv>=3?'MAX':cost+' IP'}</button></div>`}).join('');$('upgrades').querySelectorAll('[data-upgrade]').forEach(b=>b.addEventListener('click',()=>buy(b.dataset.upgrade)))}

function renderShop(){
 const n=node(state.selected),active=isActive(n);
 const generator=!state.ended&&n.owned&&active&&n.server&&n.unitTurns===0&&totalUnits()<2&&state.points>=16&&state.ap>0&&tutorialAllows('install',n.id);
 const boost=!state.ended&&state.points>=24&&state.shopBoostedTurn!==state.turn&&tutorialAllows('boost','boost');
 const request=!state.ended&&n.owned&&active&&!n.demanded&&n.data-n.left>=10&&state.ap>0&&tutorialAllows('demand',n.id);
 setText('shopNodeName',visible(n)?n.name:'未発見');
 setText('shopIpBalance',activePanel==='research'?meta.rp+' RP':state.points+' IP');
 const list=[
  {key:'generator',icon:'◷',name:'継続収入ユニット',price:'16 IP / 1 AP',desc:'設置費16 IP・1 AP。接続中は毎ターン10 IP（継続Lvごとに+4）、最大3回。分離中は入金なし。',ok:generator,hint:n.server?'サーバー限定・最大2台':'サーバーノードを選択してください'},
  {key:'boost',icon:'✦',name:'追加アクション',price:'24 IP',desc:'今のターンの行動力を1 AP追加します。購入は各ターン1回まで。',ok:boost,hint:state.shopBoostedTurn===state.turn?'このターンは購入済み':'ターン内の選択肢を増やせます'},
  {key:'request',icon:'◇',name:'要求イベント',price:'1 AP',desc:'模擬データを10 IP以上回収した接続中ノードで抽象的な要求イベントを選択。警戒度が上昇。',ok:request,hint:n.demanded?'このノードでは実行済み':'成功・失敗はゲーム内の確率判定'}
 ];
 $('shopItems').innerHTML=list.map(it=>'<article class="shop-card"><span class="shop-symbol" aria-hidden="true">'+it.icon+'</span><div class="shop-text"><strong>'+it.name+'</strong><p>'+it.desc+'</p><small>'+it.hint+'</small></div><div class="shop-buy"><span>'+it.price+'</span><button class="shop-buy-btn" type="button" data-shop="'+it.key+'" '+(it.ok?'':'disabled')+'>'+(it.ok?'選択':'利用不可')+'</button></div></article>').join('');
 $('shopItems').querySelectorAll('[data-shop]').forEach(btn=>btn.addEventListener('click',()=>{
  if(btn.dataset.shop==='generator')install(state.selected);
  else if(btn.dataset.shop==='request')demand(state.selected);
  else if(btn.dataset.shop==='boost')purchaseAction();
  closePanel();
 }));
}
function purchaseAction(){
 if(!state||state.ended||state.points<24||state.shopBoostedTurn===state.turn||!tutorialAllows('boost','boost'))return;
 state.points-=24;state.ap++;state.shopBoostedTurn=state.turn;
 log('戦術ショップ：24 IPを使って行動力を1補充。','positive');render();tutorialSignal('boost','boost');
}


function buyResearch(key){
 if(state?.tutorial||!PROG.RESEARCH[key])return;
 const research=PROG.RESEARCH[key],level=meta.levels[key],cost=research.costs[level];
 if(level>=research.costs.length||!Number.isFinite(cost)||meta.rp<cost)return;
 meta.rp-=cost;meta.levels[key]++;PROG.saveMeta(meta);
 if(state)log(research.label+'の永続研究Lv.'+meta.levels[key]+'を解放（次の攻略から適用）。','positive');
 earn('firstResearch');render();
}
function renderResearch(){
 const list=$('researchItems');
 list.innerHTML=Object.entries(PROG.RESEARCH).map(([key,r])=>{
  const lv=meta.levels[key],cost=r.costs[lv],max=r.costs.length;
  return '<div class="research-card"><div class="research-head"><strong>'+r.label+'</strong><small>Lv.'+lv+'/'+max+'</small></div><p>'+r.desc+'</p>'+
   '<div class="research-bottom"><span>'+(cost===undefined?'MAX':cost+' RP')+'</span><button class="research-buy" data-research="'+key+'" '+(state?.tutorial||lv>=max||meta.rp<cost?'disabled':'')+'>'+(lv>=max?'MAX':'研究する')+'</button></div></div>';
 }).join('');
 list.querySelectorAll('[data-research]').forEach(b=>b.addEventListener('click',()=>buyResearch(b.dataset.research)));
 if(activePanel==='research')setText('shopIpBalance',meta.rp+' RP');
}
function exportMeta(){
 const data={game:'CYBER OUTBREAK',savedAt:new Date().toISOString(),...meta};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='cyber-outbreak-research.json';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function importMetaFile(file){
 if(!file)return;
 if(file.size>32768){alert('32KB以下のJSONファイルを選択してください。');return}
 const reader=new FileReader();
 reader.onload=()=>{
  try{
   const data=JSON.parse(String(reader.result||''));
   if(data?.game!=='CYBER OUTBREAK'||data?.schema!==1||!data.levels||!Number.isFinite(data.rp))throw Error('format');
   if(!confirm('現在のRP・永続研究をこのセーブデータで置き換えますか？'))return;
   meta=PROG.sanitizeMeta(data);PROG.saveMeta(meta);render();
   alert('研究データを復元しました。効果は次の攻略から反映されます。');
  }catch(_){alert('正しいCYBER OUTBREAKセーブデータを読み込めませんでした。')}
 };
 reader.readAsText(file);
}
function impactChange(key,delta){if(state?.impact&&Object.hasOwn(state.impact,key))state.impact[key]=PROG.clamp(state.impact[key]+delta)}
function renderImpact(){
 const m=state.impact,hi=PROG.impactIndex(m);
 setText('hiValue',hi+' / 100');$('hiBar').style.width=hi+'%';
 [['info','impactInfo'],['systems','impactSystems'],['financial','impactFinancial'],['care','impactCare']].forEach(([k,id])=>setText(id,m[k]));
 setText('continuityValue',PROG.careContinuity(m)+'%');setText('virtualLoss',m.financial*20+'万円');
}
function renderMaturity(){
 setText('hospitalLabel',PROG.PROFILES[state.profileId].label);
 setText('maturityScore','成熟度 '+Math.round(PROG.averageMaturity(state.maturity))+' / 100');
 $('maturityBars').innerHTML=PROG.FIELDS.map(f=>{
  const v=state.maturity[f.key];
  return '<div class="maturity-item"><span>'+f.label+'</span><div class="maturity-track"><i style="width:'+v+'%"></i></div><b>'+v+'</b></div>';
 }).join('');
}
function changeMaturity(domain,delta){if(Object.hasOwn(state.maturity,domain))state.maturity[domain]=PROG.clamp(state.maturity[domain]+delta,5,99)}
function eventInfo(){return state.opportunity?PROG.OPPORTUNITIES.find(e=>e.id===state.opportunity.id):null}
function renderOpportunity(){
 const event=eventInfo(),chance=Math.round(PROG.opportunityChance(state.maturity)*100);
 setText('opportunityIntro','管理成熟度に応じて発生。現在の抽選確率：約'+chance+'％/ターン（ゲーム内設定）。');
 $('opportunityBadge').classList.toggle('active',!!event);
 if(event){
  const remain=Math.max(0,state.opportunity.expiresTurn-state.turn+1);
  setText('opportunityBadge','あと'+remain+'ターン');
  $('opportunityBody').innerHTML='<h3>'+event.title+'</h3><p>'+event.description+'</p><p class="opportunity-timer">残り'+remain+'ターン / 成功時 +'+event.bonus+' IP</p><p>行動力1を消費。成功は保証されず、病院側の警戒が高まります。</p>';
 }else{
  setText('opportunityBadge','OPPORTUNITY');
  $('opportunityBody').innerHTML='<p>現在は好機の発生待ちです。管理水準が低いほど発生しやすく、充実した病院でも発生率はゼロではありません。</p>';
 }
 $('opportunityUseBtn').disabled=state.ended||!!state.tutorial||!event||state.ap<1;
 $('opportunityPassBtn').disabled=state.ended||!!state.tutorial||!event;
}
function advanceOpportunity(){
 if(state.opportunity&&state.turn>state.opportunity.expiresTurn){log('期間限定の好機は期限切れとなりました。','info');state.opportunity=null;}
}
function rollOpportunity(){
 if(state.tutorial||state.ended||state.opportunity||Math.random()>=PROG.opportunityChance(state.maturity))return;
 const e=PROG.chooseOpportunity(state.maturity);
 state.opportunity={id:e.id,expiresTurn:state.turn+1+state.forecastLevel};
 state.opportunitiesSeen++;
 log('期間限定の好機が発生：「'+e.title+'」。好機タブを確認。','positive');
 document.querySelector('[data-landscape-view="opportunity"]')?.click();
}
function useOpportunity(){
 if(!state||state.ended||state.tutorial||state.ap<1||!state.opportunity)return;
 const e=eventInfo();if(!e)return;
 state.ap--;state.opportunity=null;state.opportunitiesUsed++;applyAlert(e.alert);
 if(Math.random()<.78){
  state.points+=e.bonus;state.total+=e.bonus;state.opportunityBonus+=e.bonus;
  log('好機イベント成功：'+e.title+'（+'+e.bonus+' IP）。','positive');
  impactChange('info',Math.ceil(e.bonus/5));
 }else log('好機を活用できませんでした。病院側の警戒度が上昇。','negative');
 earn('firstOpportunity');check();render();
}
function passOpportunity(){if(!state||state.ended||state.tutorial||!state.opportunity)return;log('期間限定の好機を見送りました。','info');state.opportunity=null;render()}

function renderFeed(){$('feed').innerHTML=state.log.map(e=>`<div class="feed-item ${e.kind}"><span class="feed-turn">T${String(e.turn).padStart(2,'0')}</span><span>${e.msg}</span></div>`).join('')}
function renderAwards(){setText('badgeCount',earned.size+' / '+ALL_AWARDS.length);$('awardBar').style.width=100*earned.size/ALL_AWARDS.length+'%';const list=ALL_AWARDS.filter(a=>awardFilter==='all'||(awardFilter==='earned'?earned.has(a.id):!earned.has(a.id)));$('achievementList').innerHTML=list.length?list.map(a=>{const yes=earned.has(a.id);return `<div class="award ${yes?'obtained':''}"><div class="medal" aria-hidden="true">${yes?a.icon:'?'}</div><div><strong>${yes?a.name:'??? 未発見'}</strong><small>${yes?a.desc:'条件を満たすと解除'}</small></div></div>`}).join(''):'<div class="empty-awards">この条件の実績はありません。</div>'}

function collect(id){if(!state||state.ended||state.ap<1||!tutorialAllows('collect',id))return;const n=node(id);if(!n||!isActive(n)||n.left<=0)return;
 const amount=Math.min(n.left,11+state.up.analysis*5);n.left-=amount;state.points+=amount;state.total+=amount;state.harvested+=amount;state.ap--;applyAlert(2);impactChange('info',Math.ceil(amount/4));impactChange('financial',1);log(n.name+'から模擬データ '+amount+' IPを回収。','positive');
 if(!n.harvestOnce){n.harvestOnce=true;if(n.artifact){const art=ARTIFACTS.find(a=>a.id===n.artifact);earn(art.id);log('隠し記録を発見：「'+art.name+'」','positive')}}
 if(state.harvested>=50)earn('wealth');check();render();tutorialSignal('collect',id)}
function expansionChance(n){const adj=Math.round((50-state.maturity.maintenance)*.10);return Math.min(96,Math.max(35,91-8*(n.security+n.bonusSecurity)+state.up.spread*10+adj-Math.floor(state.alert/29)*2-(state.difficulty==='hard'?6:0)))}
function expand(id){if(!state||state.ended||state.ap<1||!tutorialAllows('expand',id))return;const n=node(id);if(!n||n.owned||!reachable(n)||n.lockedUntil>=state.turn)return;
 const chance=expansionChance(n);
 state.ap--;if((state.tutorial&&id==='office')||Math.random()*100<chance){n.owned=true;applyAlert(3);impactChange('systems',5);impactChange('care',n.id==='records'||n.id==='lab'||n.id==='image'?4:2);log(n.name+'に影響が拡大しました（架空判定）。','positive');earn('first')}else{applyAlert(5);log(n.name+'への進出が失敗。病院側の防御が機能しました。','negative')}
 check();render();if(n.owned)tutorialSignal('expand',id)}
function install(id){if(!state||state.ended||state.ap<1||!tutorialAllows('install',id))return;const n=node(id);if(!n||!isActive(n)||!n.server||n.unitTurns||totalUnits()>=2||state.points<16)return;
 state.ap--;state.points-=16;n.unitTurns=3;applyAlert(3);log(n.name+'に継続収入ユニットを設置（残り3ターン）。','positive');check();render()}
function demand(id){if(!state||state.ended||state.ap<1||!tutorialAllows('demand',id))return;const n=node(id);if(!n||!isActive(n)||n.demanded||n.data-n.left<10)return;
 n.demanded=true;state.ap--;state.demandAttempts++;
 const chance=Math.max(.25,.70-state.alert/260);const ok=Math.random()<chance;applyAlert(ok?13:17);
 if(ok){impactChange('financial',5);impactChange('info',2);const amount=19+Math.min(n.security,3)*6;state.points+=amount;state.total+=amount;state.demandIncome+=amount;log('架空の要求イベント：交渉が成立し '+amount+' IPを獲得。','positive');earn('demand')}else{log('架空の要求イベント：病院側は要求に応じず、警戒が高まりました。','negative')}
 check();render()}
function buy(key){if(!state||state.ended||!UPGRADES[key]||!tutorialAllows('upgrade',key))return;const u=UPGRADES[key],lv=state.up[key],cost=u.costs[lv];if(lv>=3||state.points<cost)return;state.points-=cost;state.up[key]++;log(u.label+'をLv.'+state.up[key]+'に強化（-'+cost+' IP）。','positive');render();if(state.tutorial&&key==='analysis')closePanel(false);tutorialSignal('upgrade',key)}
function hospitalTurn(){const t=state.turn;const variant=t%4;
 const domain=['recovery','monitoring','maintenance','training'][variant];changeMaturity(domain,2);
 if(state.opportunity&&Math.random()<state.maturity.monitoring*.0015){log('病院側：緊急点検により好機が解消されました。','negative');state.opportunity=null;}
 if(variant===1){isolateRandom();}
 else if(variant===2){fortify();}
 else if(variant===3){applyAlert(3);log('病院側：職員報告を受け、監視・検知態勢を強化。','negative')}
 else{recover();}
 if(state.alert>65&&Math.random()<.28)recover();
 applyAlert(1);
}
function isolateRandom(){const options=state.edges.filter(e=>e.blockedUntil<state.turn&&((node(e.a).owned&&node(e.b).owned)||(node(e.a).owned&&!node(e.b).owned)||(node(e.b).owned&&!node(e.a).owned)));
 if(!options.length){fortify();return}
 const owned=options.filter(e=>node(e.a).owned&&node(e.b).owned);const pool=owned.length&&Math.random()<.65?owned:options;const e=pool[Math.floor(Math.random()*pool.length)];
 e.blockedUntil=state.turn+1+(Math.random()<.4?1:0);state.defenseHistory.isolations++;log('病院側：'+node(e.a).name+' ⇄ '+node(e.b).name+'の接続を分離（経路遮断）。','negative')}
function fortify(){const options=state.nodes.filter(n=>!n.owned&&visible(n));if(!options.length){applyAlert(4);log('病院側：資産点検と防御の見直しを実施。','negative');return}
 const n=options[Math.floor(Math.random()*options.length)];n.bonusSecurity=Math.min(2,n.bonusSecurity+1);log('病院側：'+n.name+'の防御を強化。','negative')}
function recover(){const occupied=state.nodes.filter(n=>n.owned&&n.id!=='gate');const unitNodes=occupied.filter(n=>n.unitTurns>0);const choices=unitNodes.length&&Math.random()<.65?unitNodes:occupied;
 if(choices.length&&state.alert>=45&&Math.random()<(.30+state.maturity.recovery*.002)){const n=choices[Math.floor(Math.random()*choices.length)];n.owned=false;state.defenseHistory.recoveredNodes++;if(n.unitTurns>0)state.defenseHistory.removedUnits++;n.unitTurns=0;n.lockedUntil=state.turn+1;impactChange('systems',-8);impactChange('care',-5);log('病院側：'+n.name+'を復旧し、継続収入があれば停止。','negative')}else{applyAlert(4);log('病院側：復旧手順と連絡体制を再確認。','negative')}
}
function payGenerators(){for(const n of state.nodes){if(n.unitTurns<=0)continue;
 if(isActive(n)){const amount=10+4*state.up.sustain;state.points+=amount;state.total+=amount;state.passive+=amount;state.unitsEarned+=amount;impactChange('systems',1);impactChange('financial',1);n.unitTurns--;log('継続収入：'+n.name+'から '+amount+' IP。残り '+n.unitTurns+' ターン。','positive');earn('stream');if(n.unitTurns===0)log(n.name+'の継続収入ユニットは期限終了。','info')}
 else{state.defenseHistory.blockedIncomeTurns++;state.defenseHistory.blockedIncomeIP+=10+4*state.up.sustain;log('継続収入：'+n.name+'は経路分離中のため停止（このターンの予定収入なし）。','negative')}
}}
function restoreRoutes(){for(const e of state.edges){if(e.blockedUntil===state.turn-1){log('病院側：'+node(e.a).name+' ⇄ '+node(e.b).name+'の接続を復旧。','info');earn('reconnect')}}}
function endTurn(){if(!state||state.ended||!tutorialAllows('turn','turn'))return;hospitalTurn();if(state.alert>=100){end(false,'病院側の封じ込めが完了しました。');return}
 if(state.turn>=state.rule.maxTurns){end(false,'制限ターンに達しました。');return}
 state.turn++;state.ap=3;restoreRoutes();payGenerators();advanceOpportunity();log('新しいターンが始まりました。','info');rollOpportunity();check();render();tutorialSignal('turn','turn');}
function check(){if(!state||state.ended)return;if(state.total>=state.rule.targetIP&&activeCount()>=state.rule.targetNodes)end(true,'仮想情報ポイントと接続中のノード目標を達成しました。');else if(state.alert>=100)end(false,'病院側の封じ込めが完了しました。')}
function debriefSummary(){
 const d=state.defenseHistory,notes=[];
 if(!d.isolations)notes.push('今回、ネットワーク分離は記録されませんでした。');
 else if(!d.blockedIncomeTurns)notes.push('ネットワーク分離は'+d.isolations+'回発生しましたが、継続収入の停止は記録されませんでした。');
 else notes.push('ネットワーク分離は'+d.isolations+'回、継続収入停止は'+d.blockedIncomeTurns+'回ありました（そのターンに予定されていた'+d.blockedIncomeIP+' IPが発生せず）。');
 if(d.recoveredNodes)notes.push('ノード復旧は'+d.recoveredNodes+'件'+(d.removedUnits?'、うち継続設備の撤去'+d.removedUnits+'件':'')+'でした。');
 else notes.push('この試行ではノード復旧を確認していません。');
 notes.push('継続収入の実獲得は'+state.passive+' IPです。すべてゲーム内の架空の結果です。');
 return notes.join(' ');
}
function end(won,reason){
 if(state.ended)return;closePanel(false);window.CyberOutbreakTutorial?.reset?.();state.ended=true;
 if(!state.wasTutorial){
  if(won)earn('victory');
  const first=won&&!meta.firstClears[state.profileId];
  if(state.turn>=3&&state.harvested>=12){
   meta.runs++;
   if(won){
    addRP(15,'clear');
    if(first)addRP(10,'firstClear');
    addRP(PROG.PROFILES[state.profileId].bonusRP,'profile');
    meta.firstClears[state.profileId]=true;
    log('攻略報酬を獲得。内訳は結果画面を参照。','positive');
   }else{addRP(3,'loss');log('攻略報酬：失敗分3 RPを獲得。','positive')}
  }
  if(won&&state.profileId==='A')earn('secureClear');
 }
 render();
 setText('resultIcon',won?'★':'⬡');setText('resultLabel',won?'MISSION COMPLETE':'MISSION ENDED');
 setText('resultTitle',won?'ミッション達成！':'病院側の防御成功');
 setText('resultLead',reason+(won?' 次の挑戦条件を選べます。':' 行動順序と投資先を調整して再挑戦できます。'));
 setText('resultData',state.total);setText('resultNodes',activeCount());setText('resultTurns',state.turn);
 setText('resultRP',state.rpEarned+' RP');setText('resultHI',PROG.impactIndex(state.impact)+' / 100');
 setText('resultCare',PROG.careContinuity(state.impact)+'%');setText('resultLoss',state.impact.financial*20+'万円');
 const total=state.harvested+state.passive+state.demandIncome+state.opportunityBonus;
 setText('resultIPDetails','通常回収 '+state.harvested+' ＋ 継続収入 '+state.passive+' ＋ 要求 '+state.demandIncome+' ＋ 好機 '+state.opportunityBonus+' ＝ '+total+' IP');
 const r=state.rpBreakdown;
 setText('resultRPDetails','実績 '+r.achievements+' ＋ 成功 '+r.clear+' ＋ 初回 '+r.firstClear+' ＋ 病院 '+r.profile+' ＋ 失敗 '+r.loss+' ＝ '+state.rpEarned+' RP');
 setText('debriefText',debriefSummary());
 const tutorial=state.wasTutorial;
 setText('resultSettings',(tutorial?'練習開始':'通常開始')+'／'+(tutorial?'カジュアル':state.difficulty)+'／'+PROG.PROFILES[state.profileId].label+'／目標'+state.rule.targetIP+' IP・'+state.rule.targetNodes+'ノード・期限'+state.rule.maxTurns+'ターン');
 setText('againBtn',tutorial?'練習を最初からやり直す':'同設定でもう一度プレイ');
 if(tutorial)setText('resultRewardNote','この攻略は練習から始まったため、続行後もRP・実績保存の対象外です。');
 else setText('resultRewardNote','RPは攻略報酬と初回実績報酬の合計です。');
 $('result').hidden=false;window.CyberOutbreakDialogs?.show?.('result');
}
function selectNode(id){if(!state||!node(id)||!tutorialAllows('select',id))return;state.selected=id;renderMap();renderDetail();renderShop();tutorialSignal('select',id)}
function startGame(){window.CyberOutbreakTutorial?.reset?.();closePanel(false);const d=$('difficulty').value;hasBegun=true;state=makeState(d,$('hospitalProfile').value);log(PROG.PROFILES[state.profileId].label+'の架空シミュレーションを開始しました。');log('経路遮断・継続収入・要求イベントと隠し記録を利用できます。');$('intro').hidden=true;$('result').hidden=true;render()}
function startTutorialGame(){
 if(hasBegun&&state&&!state.ended&&!confirm('現在のゲームは初期化されます。チュートリアルを開始しますか？'))return;
 closePanel(false);hasBegun=true;state=makeState('casual');
 state.tutorial=true;state.wasTutorial=true;state.points=65;state.ap=3;state.alert=state.rule.startAlert;
 // Training-only starting resources; the first step is deterministic.
 log('練習用IPを付与しました。画面の案内に沿って基本操作を覚えましょう。','info');
 $('intro').hidden=true;$('result').hidden=true;
 document.querySelector('[data-landscape-view="node"]')?.click();
 render();window.CyberOutbreakTutorial?.start?.();
}
function leaveTutorial(){if(!state?.tutorial)return;state.tutorial=false;log('チュートリアルを終了。ここから通常のゲームルールで続行できます。');render()}
function replaySameSettings(){if(!state)return;const practiced=state.wasTutorial;const d=state.difficulty,profile=state.profileId;if(practiced){startTutorialGame();return}$('difficulty').value=d;$('hospitalProfile').value=profile;startGame()}
function resultToMenu(){$('result').hidden=true;showHelp()}
function showHelp(){window.CyberOutbreakTutorial?.pause?.();closePanel(false);$('result').hidden=true;$('intro').hidden=false;$('continueBtn').hidden=!(hasBegun&&state&&!state.ended);$('startBtn').textContent=hasBegun&&!state.ended?'新しいゲームを開始 →':'ゲーム開始 →';window.CyberOutbreakDialogs?.show?.('intro')}

document.querySelectorAll('[data-panel]').forEach(b=>b.addEventListener('click',()=>openPanel(b.dataset.panel)));
$('closeDrawerBtn').addEventListener('click',()=>closePanel());
$('drawerBackdrop').addEventListener('click',()=>closePanel());
$('controlDrawer').addEventListener('keydown',trapPanel);
$('opportunityUseBtn').addEventListener('click',useOpportunity);
$('opportunityPassBtn').addEventListener('click',passOpportunity);
$('exportMetaBtn').addEventListener('click',exportMeta);
$('importMetaBtn').addEventListener('click',()=>$('importMetaFile').click());
$('importMetaFile').addEventListener('change',e=>{importMetaFile(e.target.files?.[0]);e.target.value=''});

$('network').addEventListener('click',e=>{const g=e.target.closest('[data-node]');if(g)selectNode(g.dataset.node)});
$('network').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-node]')){e.preventDefault();selectNode(e.target.closest('[data-node]').dataset.node)}});
$('startBtn').addEventListener('click',startGame);$('tutorialStartBtn').addEventListener('click',startTutorialGame);$('continueBtn').addEventListener('click',()=>{$('intro').hidden=true;window.CyberOutbreakTutorial?.resume?.()});$('endTurnBtn').addEventListener('click',endTurn);
$('againBtn').addEventListener('click',replaySameSettings);$('resultMenuBtn').addEventListener('click',resultToMenu);$('restartBtn').addEventListener('click',()=>{if(state&&!state.ended&&!confirm('現在のゲームを最初からやり直しますか？'))return;showHelp()});$('helpBtn').addEventListener('click',showHelp);$('guideBtn').addEventListener('click',showHelp);
$('fitMapBtn').addEventListener('click',()=>{const vp=$('mapViewport');const isFit=vp.classList.toggle('fit-map');$('fitMapBtn').setAttribute('aria-pressed',String(isFit));$('fitMapBtn').textContent=isFit?'拡大して見る ↗':'全体表示 ↗';});
 document.querySelectorAll('[data-award-filter]').forEach(btn=>btn.addEventListener('click',()=>{awardFilter=btn.dataset.awardFilter;document.querySelectorAll('[data-award-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));renderAwards()}));
 $('clearAwardsBtn').addEventListener('click',()=>{if(!confirm('このブラウザの実績記録をリセットしますか？'))return;earned=new Set();persistEarned();renderAwards()});
 state=makeState('normal');log('ゲーム開始ボタンを押すとプレイできます。');render();
 // デバッグ用。テストから架空の状態のみを確認します。
 window.CyberOutbreakGame={refresh:render,leaveTutorial,isTutorial:()=>!!state?.tutorial};
 window.CyberOutbreakDebug={startTutorialGame,leaveTutorial,useOpportunity,passOpportunity,rollOpportunity,buyResearch,getMeta:()=>JSON.parse(JSON.stringify(meta)),getState:()=>JSON.parse(JSON.stringify(state)),selectNode,collect,expand,buy,install,demand,purchaseAction,openPanel,closePanel,endTurn,startGame,earned:()=>[...earned]};
})();
