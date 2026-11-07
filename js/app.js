(()=>{
'use strict';
const $=id=>document.getElementById(id);
const SVG_NS='http://www.w3.org/2000/svg';
const {EDGES,MAP,RULES,UPGRADES,ARTIFACTS,MILESTONES}=window.CyberOutbreakData;
const ALL_AWARDS=[...MILESTONES,...ARTIFACTS.map(a=>({...a,icon:'▣'}))];
const STORAGE_KEY='cyber-outbreak:achievements:v02';
let state=null,hasBegun=false;let awardFilter='all',lastToastKey='',toastTimer=null;
let earned=readEarned();
function readEarned(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return new Set(Array.isArray(value)?value.filter(v=>ALL_AWARDS.some(a=>a.id===v)):[])}catch(_){return new Set()}}
function persistEarned(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify([...earned]))}catch(_){/* local data may be disabled */}}
function earn(id){if(!ALL_AWARDS.some(a=>a.id===id)||earned.has(id))return;earned.add(id);persistEarned();const a=ALL_AWARDS.find(a=>a.id===id);log('実績解除：「'+a.name+'」','positive')}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function makeState(difficulty='normal'){
 const rule=RULES[difficulty]||RULES.normal;const artifacts=shuffle(ARTIFACTS.map(a=>a.id)).slice(0,3),targets=shuffle(MAP.filter(n=>n.id!=='gate').map(n=>n.id)).slice(0,3);
 const artifactsOnNodes=Object.fromEntries(targets.map((id,i)=>[id,artifacts[i]]));
 return {difficulty,rule,turn:1,ap:3,points:rule.startIP,total:0,harvested:0,passive:0,demandIncome:0,alert:rule.startAlert,selected:'gate',up:{spread:0,analysis:0,adapt:0,sustain:0},
 nodes:MAP.map(n=>({...n,left:n.data,owned:n.id==='gate',bonusSecurity:0,lockedUntil:0,unitTurns:0,demanded:false,harvestOnce:false,artifact:artifactsOnNodes[n.id]||null})),
 edges:EDGES.map(([a,b])=>({a,b,blockedUntil:0})),log:[],ended:false,started:true,demandAttempts:0,unitsEarned:0,shopBoostedTurn:0}
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
function applyAlert(value){state.alert=Math.max(0,Math.min(100,state.alert+Math.max(1,Math.round(value*state.rule.alertFactor)-state.up.adapt)))}
function setText(id,text){const el=$(id);if(el)el.textContent=text}

const PANEL_INFO={shop:['戦術ショップ','TACTICAL SHOP'],upgrade:['進化研究所','UPGRADE LAB']};
let activePanel=null,returnFocus=null;
function openPanel(name){
 if(!PANEL_INFO[name]||!$('intro').hidden||!$('result').hidden)return;
 if(activePanel===name){closePanel();return}
 if(!activePanel)returnFocus=document.activeElement;
 activePanel=name;
 setText('drawerTitle',PANEL_INFO[name][0]);setText('drawerKicker',PANEL_INFO[name][1]);
 document.querySelectorAll('[data-panel-view]').forEach(v=>v.hidden=v.dataset.panelView!==name);
 document.querySelectorAll('[data-panel]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.panel===name)));
 const d=$('controlDrawer');d.inert=false;d.setAttribute('aria-hidden','false');d.classList.add('open');
 $('drawerBackdrop').classList.add('open');document.body.classList.add('drawer-open');
 $('closeDrawerBtn').focus({preventScroll:true});
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
 setText('pointsVal',state.points+' IP');setText('shopHeaderPoints',state.points+' IP');setText('harvestVal',state.total+' IP');setText('ownedVal',activeCount()+' / '+state.nodes.length);setText('turnVal',state.turn+' / '+state.rule.maxTurns);
 setText('incomeHint','継続収入 '+state.nodes.filter(n=>n.unitTurns>0&&isActive(n)).length+' 台稼働');setText('apHint','残り行動力 '+('● '.repeat(state.ap)||'なし')+'('+state.ap+'/3)');
 setText('harvestHint','目標 '+state.rule.targetIP+' IP（全収入）');setText('ownedHint','接続中の目標 '+state.rule.targetNodes+' ノード');
 setText('goalIPText',state.total+' / '+state.rule.targetIP+' IP');setText('goalNodeText',activeCount()+' / '+state.rule.targetNodes);setText('alertText',state.alert+' / 100');
 $('goalIPBar').style.width=Math.min(100,state.total/state.rule.targetIP*100)+'%';$('goalNodeBar').style.width=Math.min(100,activeCount()/state.rule.targetNodes*100)+'%';$('alertBar').style.width=state.alert+'%';
 setText('alertMessage',state.alert>=80?'病院側が重点対応中。継続収入が停止される可能性も高まっています。':state.alert>=55?'警戒度上昇。ネットワーク分離・復旧に注意。':state.alert>=25?'病院側が兆候を検知し、経路遮断や防御強化を検討しています。':'病院側は通常監視中。警戒度100で終了します。');
 $('statusChips').innerHTML=`<span class="status-chip">遮断経路 ${state.edges.filter(e=>e.blockedUntil>=state.turn).length}</span><span class="status-chip">継続ユニット ${totalUnits()}/2</span><span class="status-chip">回収 ${state.harvested} IP</span><span class="status-chip">継続収入 ${state.passive} IP</span><span class="status-chip ${state.demandAttempts?'alert':''}">要求イベント ${state.demandIncome} IP</span>`;
 setText('mapStatus',state.ended?'SIMULATION COMPLETE':'ROUND '+String(state.turn).padStart(2,'0')+' / AP '+state.ap);
 updateHUD();
 renderMap();renderDetail();renderUpgrades();renderShop();renderFeed();renderAwards();$('endTurnBtn').disabled=state.ended;
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
 const canCollect=n.owned&&active&&n.left>0&&state.ap>0&&!state.ended;
 const canExpand=!n.owned&&reachable(n)&&n.lockedUntil<state.turn&&state.ap>0&&!state.ended;
 const canInstall=n.owned&&active&&n.server&&n.unitTurns===0&&totalUnits()<2&&state.points>=16&&state.ap>0&&!state.ended;
 const canDemand=n.owned&&active&&!n.demanded&&n.data-n.left>=10&&state.ap>0&&!state.ended;
 const primary=n.owned?(n.left>0?'▤  模擬データ回収  /  1 AP':'模擬データ回収済み'):!visible(n)?'探索範囲外':n.lockedUntil>=state.turn?'一時保護中':!reachable(n)?'経路遮断中':'↗  ノードへ進出  /  1 AP';
 const gems=Array.from({length:5},(_,i)=>'<i class="'+(i<defense?'filled':'')+'"></i>').join('');
 $('detailContent').innerHTML=`<div class="detail-title"><div class="detail-icon">${visible(n)?n.code:'??'}</div><div><div class="detail-status">${status}</div><div class="detail-name">${visible(n)?n.name:'未確認ノード'}</div></div></div>
 <p class="description">${desc}</p>
 <div class="kv"><div class="kv-item"><small>DEFENSE / 防御強度</small><div class="defense-pips" aria-label="防御強度 ${defense} / 5">${gems}</div></div><div class="kv-item"><small>SIMULATED DATA / 残量</small><strong>${data}</strong></div></div>
 <div class="detail-note">${disconnected?'病院側が経路を分離中。接続が戻るまで行動・継続収入が停止します。':n.owned&&n.unitTurns>0?'継続収入ユニット設置中。残り '+n.unitTurns+' ターン。':n.owned?'模擬データを回収するか、継続収入・要求イベントを選択できます。':'進出は抽象的な成功・失敗判定で処理します。'}</div>
 <div class="action-stack"><button class="primary" id="nodeAction" type="button" ${canCollect||canExpand?'':'disabled'}>${primary}</button>
 <button class="secondary amber-button" id="nodeShopBtn" type="button">◈ このノードの戦術ショップを開く ↗</button><div class="action-sub">継続収入ユニット、要求イベント、追加行動力はショップから選択します。</div></div>`;
 $('nodeAction').addEventListener('click',()=>n.owned?collect(n.id):expand(n.id));$('nodeShopBtn').addEventListener('click',()=>openPanel('shop'));
}
function renderUpgrades(){$('upgrades').innerHTML=Object.entries(UPGRADES).map(([key,u])=>{const lv=state.up[key],cost=u.costs[lv],ticks=Array.from({length:3},(_,i)=>'<span class="'+(lv>i?'on':'')+'"></span>').join('');return `<div class="upgrade-item"><div class="upgrade-icon" aria-hidden="true">${u.icon}</div><div><div class="upgrade-name">${u.label} <span class="level">LV ${lv} / 3</span></div><div class="upgrade-description">${u.desc}</div><div class="upgrade-ticks">${ticks}</div></div><button class="upgrade-button" data-upgrade="${key}" ${lv>=3||state.points<cost||state.ended?'disabled':''}>${lv>=3?'MAX':cost+' IP'}</button></div>`}).join('');$('upgrades').querySelectorAll('[data-upgrade]').forEach(b=>b.addEventListener('click',()=>buy(b.dataset.upgrade)))}

function renderShop(){
 const n=node(state.selected),active=isActive(n);
 const generator=!state.ended&&n.owned&&active&&n.server&&n.unitTurns===0&&totalUnits()<2&&state.points>=16&&state.ap>0;
 const boost=!state.ended&&state.points>=24&&state.shopBoostedTurn!==state.turn;
 const request=!state.ended&&n.owned&&active&&!n.demanded&&n.data-n.left>=10&&state.ap>0;
 setText('shopNodeName',visible(n)?n.name:'未発見');
 setText('shopIpBalance',state.points+' IP');
 const list=[
  {key:'generator',icon:'◷',name:'継続収入ユニット',price:'16 IP / 1 AP',desc:'選択サーバーノードから3ターン収入。病院側の経路分離・復旧で停止します。',ok:generator,hint:n.server?'サーバー限定・最大2台':'サーバーノードを選択してください'},
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
 if(!state||state.ended||state.points<24||state.shopBoostedTurn===state.turn)return;
 state.points-=24;state.ap++;state.shopBoostedTurn=state.turn;
 log('戦術ショップ：24 IPを使って行動力を1補充。','positive');render();
}

function renderFeed(){$('feed').innerHTML=state.log.map(e=>`<div class="feed-item ${e.kind}"><span class="feed-turn">T${String(e.turn).padStart(2,'0')}</span><span>${e.msg}</span></div>`).join('')}
function renderAwards(){setText('badgeCount',earned.size+' / '+ALL_AWARDS.length);$('awardBar').style.width=100*earned.size/ALL_AWARDS.length+'%';const list=ALL_AWARDS.filter(a=>awardFilter==='all'||(awardFilter==='earned'?earned.has(a.id):!earned.has(a.id)));$('achievementList').innerHTML=list.length?list.map(a=>{const yes=earned.has(a.id);return `<div class="award ${yes?'obtained':''}"><div class="medal" aria-hidden="true">${yes?a.icon:'?'}</div><div><strong>${yes?a.name:'??? 未発見'}</strong><small>${yes?a.desc:'条件を満たすと解除'}</small></div></div>`}).join(''):'<div class="empty-awards">この条件の実績はありません。</div>'}

function collect(id){if(!state||state.ended||state.ap<1)return;const n=node(id);if(!n||!isActive(n)||n.left<=0)return;
 const amount=Math.min(n.left,11+state.up.analysis*5);n.left-=amount;state.points+=amount;state.total+=amount;state.harvested+=amount;state.ap--;applyAlert(2);log(n.name+'から模擬データ '+amount+' IPを回収。','positive');
 if(!n.harvestOnce){n.harvestOnce=true;if(n.artifact){const art=ARTIFACTS.find(a=>a.id===n.artifact);earn(art.id);log('隠し記録を発見：「'+art.name+'」','positive')}}
 if(state.harvested>=50)earn('wealth');check();render()}
function expand(id){if(!state||state.ended||state.ap<1)return;const n=node(id);if(!n||n.owned||!reachable(n)||n.lockedUntil>=state.turn)return;
 const chance=Math.min(96,Math.max(39,91-8*(n.security+n.bonusSecurity)+state.up.spread*10-Math.floor(state.alert/29)*2-(state.difficulty==='hard'?6:0)));
 state.ap--;if(Math.random()*100<chance){n.owned=true;applyAlert(3);log(n.name+'に影響が拡大しました（架空判定）。','positive');earn('first')}else{applyAlert(5);log(n.name+'への進出が失敗。病院側の防御が機能しました。','negative')}
 check();render()}
function install(id){if(!state||state.ended||state.ap<1)return;const n=node(id);if(!n||!isActive(n)||!n.server||n.unitTurns||totalUnits()>=2||state.points<16)return;
 state.ap--;state.points-=16;n.unitTurns=3;applyAlert(3);log(n.name+'に継続収入ユニットを設置（残り3ターン）。','positive');check();render()}
function demand(id){if(!state||state.ended||state.ap<1)return;const n=node(id);if(!n||!isActive(n)||n.demanded||n.data-n.left<10)return;
 n.demanded=true;state.ap--;state.demandAttempts++;
 const chance=Math.max(.25,.70-state.alert/260);const ok=Math.random()<chance;applyAlert(ok?13:17);
 if(ok){const amount=19+Math.min(n.security,3)*6;state.points+=amount;state.total+=amount;state.demandIncome+=amount;log('架空の要求イベント：交渉が成立し '+amount+' IPを獲得。','positive');earn('demand')}else{log('架空の要求イベント：病院側は要求に応じず、警戒が高まりました。','negative')}
 check();render()}
function buy(key){if(!state||state.ended||!UPGRADES[key])return;const u=UPGRADES[key],lv=state.up[key],cost=u.costs[lv];if(lv>=3||state.points<cost)return;state.points-=cost;state.up[key]++;log(u.label+'をLv.'+state.up[key]+'に強化（-'+cost+' IP）。','positive');render()}
function hospitalTurn(){const t=state.turn;const variant=t%4;
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
 e.blockedUntil=state.turn+1+(Math.random()<.4?1:0);log('病院側：'+node(e.a).name+' ⇄ '+node(e.b).name+'の接続を分離（経路遮断）。','negative')}
function fortify(){const options=state.nodes.filter(n=>!n.owned&&visible(n));if(!options.length){applyAlert(4);log('病院側：資産点検と防御の見直しを実施。','negative');return}
 const n=options[Math.floor(Math.random()*options.length)];n.bonusSecurity=Math.min(2,n.bonusSecurity+1);log('病院側：'+n.name+'の防御を強化。','negative')}
function recover(){const occupied=state.nodes.filter(n=>n.owned&&n.id!=='gate');const unitNodes=occupied.filter(n=>n.unitTurns>0);const choices=unitNodes.length&&Math.random()<.65?unitNodes:occupied;
 if(choices.length&&state.alert>=45&&Math.random()<.45){const n=choices[Math.floor(Math.random()*choices.length)];n.owned=false;n.unitTurns=0;n.lockedUntil=state.turn+1;log('病院側：'+n.name+'を復旧し、継続収入があれば停止。','negative')}else{applyAlert(4);log('病院側：復旧手順と連絡体制を再確認。','negative')}
}
function payGenerators(){for(const n of state.nodes){if(n.unitTurns<=0)continue;
 if(isActive(n)){const amount=10+4*state.up.sustain;state.points+=amount;state.total+=amount;state.passive+=amount;state.unitsEarned+=amount;n.unitTurns--;log('継続収入：'+n.name+'から '+amount+' IP。残り '+n.unitTurns+' ターン。','positive');earn('stream');if(n.unitTurns===0)log(n.name+'の継続収入ユニットは期限終了。','info')}
 else{log('継続収入：'+n.name+'は経路分離中のため停止。','negative')}
}}
function restoreRoutes(){for(const e of state.edges){if(e.blockedUntil===state.turn-1){log('病院側：'+node(e.a).name+' ⇄ '+node(e.b).name+'の接続を復旧。','info');earn('reconnect')}}}
function endTurn(){if(!state||state.ended)return;hospitalTurn();if(state.alert>=100){end(false,'病院側の封じ込めが完了しました。');return}
 if(state.turn>=state.rule.maxTurns){end(false,'制限ターンに達しました。');return}
 state.turn++;state.ap=3;restoreRoutes();payGenerators();log('新しいターンが始まりました。','info');check();render();}
function check(){if(!state||state.ended)return;if(state.total>=state.rule.targetIP&&activeCount()>=state.rule.targetNodes)end(true,'仮想情報ポイントと接続中のノード目標を達成しました。');else if(state.alert>=100)end(false,'病院側の封じ込めが完了しました。')}
function end(won,reason){if(state.ended)return;closePanel(false);state.ended=true;if(won)earn('victory');render();setText('resultIcon',won?'★':'⬡');setText('resultLabel',won?'MISSION COMPLETE':'MISSION ENDED');setText('resultTitle',won?'ミッション達成！':'病院側の防御成功');setText('resultLead',reason+(won?' 次は隠し記録の収集や別の戦略に挑戦できます。':' 行動順序と投資先を調整して再挑戦できます。'));
 setText('resultData',state.total);setText('resultNodes',activeCount());setText('resultTurns',state.turn);
 setText('debriefText','病院側のネットワーク分離は接続関係を断ち、継続収入を停止させました。復旧は影響ノードの状態を戻します。情報管理・監視・BCPを組み合わせた対策が重要です。本ゲームは現実のリスクを数値化したものではありません。');$('result').hidden=false;
}
function selectNode(id){if(!state||!node(id))return;state.selected=id;renderMap();renderDetail();renderShop()}
function startGame(){closePanel(false);const d=$('difficulty').value;hasBegun=true;state=makeState(d);log('架空の病院シミュレーションを開始しました。');log('経路遮断・継続収入・要求イベントと隠し記録を利用できます。');$('intro').hidden=true;$('result').hidden=true;render()}
function showHelp(){closePanel(false);$('intro').hidden=false;$('continueBtn').hidden=!(hasBegun&&state&&!state.ended);$('startBtn').textContent=hasBegun&&!state.ended?'新しいゲームを開始 →':'ゲーム開始 →'}

document.querySelectorAll('[data-panel]').forEach(b=>b.addEventListener('click',()=>openPanel(b.dataset.panel)));
$('closeDrawerBtn').addEventListener('click',()=>closePanel());
$('drawerBackdrop').addEventListener('click',()=>closePanel());
$('controlDrawer').addEventListener('keydown',trapPanel);

$('network').addEventListener('click',e=>{const g=e.target.closest('[data-node]');if(g)selectNode(g.dataset.node)});
$('network').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-node]')){e.preventDefault();selectNode(e.target.closest('[data-node]').dataset.node)}});
$('startBtn').addEventListener('click',startGame);$('continueBtn').addEventListener('click',()=>{$('intro').hidden=true});$('endTurnBtn').addEventListener('click',endTurn);
$('againBtn').addEventListener('click',startGame);$('restartBtn').addEventListener('click',()=>{if(state&&!state.ended&&!confirm('現在のゲームを最初からやり直しますか？'))return;showHelp()});$('helpBtn').addEventListener('click',showHelp);$('guideBtn').addEventListener('click',showHelp);
$('fitMapBtn').addEventListener('click',()=>{const vp=$('mapViewport');const isFit=vp.classList.toggle('fit-map');$('fitMapBtn').setAttribute('aria-pressed',String(isFit));$('fitMapBtn').textContent=isFit?'拡大して見る ↗':'全体表示 ↗';});
 document.querySelectorAll('[data-award-filter]').forEach(btn=>btn.addEventListener('click',()=>{awardFilter=btn.dataset.awardFilter;document.querySelectorAll('[data-award-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));renderAwards()}));
 $('clearAwardsBtn').addEventListener('click',()=>{if(!confirm('このブラウザの実績記録をリセットしますか？'))return;earned=new Set();persistEarned();renderAwards()});
 state=makeState('normal');log('ゲーム開始ボタンを押すとプレイできます。');render();
 // デバッグ用。テストから架空の状態のみを確認します。
 window.CyberOutbreakDebug={getState:()=>JSON.parse(JSON.stringify(state)),selectNode,collect,expand,buy,install,demand,purchaseAction,openPanel,closePanel,endTurn,startGame,earned:()=>[...earned]};
})();
