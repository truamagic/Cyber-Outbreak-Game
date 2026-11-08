/* CYBER OUTBREAK v0.7.3 regression: run using node tests/stability.test.cjs */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('index.html');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(new Set(ids).size,ids.length,'HTML must have unique IDs');

class FakeElement {
 constructor(id,doc){
  this.id=id;this.doc=doc;this.hidden=false;this.disabled=false;this.inert=false;this.isConnected=true;
  this.innerHTML='';this.textContent='';this.dataset={};this.attrs={};this.events={};this.value=id==='difficulty'?'casual':id==='hospitalProfile'?'D':'';
  this.style={setProperty(){}};this.offsetWidth=260;this.offsetHeight=120;
  const set=new Set();
  this.classList={add:x=>set.add(x),remove:x=>set.delete(x),contains:x=>set.has(x),toggle:(x,v)=>v?set.add(x):set.delete(x)};
 }
 addEventListener(type,handler){(this.events[type]??=[]).push(handler)}
 click(){for(const h of this.events.click||[])h({target:this})}
 append(){}setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]}
 querySelectorAll(selector){
  if(selector.startsWith('button')&&this.id==='controlDrawer')return [this.doc.getElementById('closeDrawerBtn')];
  return [];
 }
 contains(el){return this.id==='controlDrawer'?el.id==='closeDrawerBtn':el===this}
 closest(){return null}
 getClientRects(){return [1]}
 focus(){this.doc.activeElement=this}
 scrollIntoView(){}
 getBoundingClientRect(){return {left:100,right:180,top:125,bottom:190}}
 matches(selector){return selector==='[data-node]'&&this.id.includes('data-node')}
}
function makeStorage(){
 return {
  data:{},deny:false,
  getItem(k){return this.data[k]??null},
  setItem(k,v){if(this.deny)throw Error('storage denied');this.data[k]=v}
 };
}
function makeGame(storage){
 const elements=new Map(),frames=[];
 const doc={
  activeElement:null,events:{},
  getElementById(id){if(!elements.has(id))elements.set(id,new FakeElement(id,this));return elements.get(id)},
  createElementNS(_ns,name){return new FakeElement(name,this)},
  createElement(name){return new FakeElement(name,this)},
  querySelectorAll(sel){return sel==='.tutorial-spotlight'?[...elements.values()].filter(e=>e.classList.contains('tutorial-spotlight')):[]},
  querySelector(sel){
   if(sel==='.wrap')return this.getElementById('wrap');
   if(sel[0]==='#')return this.getElementById(sel.slice(1));
   if(sel[0]==='[')return this.getElementById(sel);
   return null;
  },
  addEventListener(type,handler){(this.events[type]??=[]).push(handler)}
 };
 for(const id of ids)doc.getElementById(id);
 doc.body=doc.getElementById('body');doc.activeElement=doc.body;
 doc.getElementById('intro').hidden=true;doc.getElementById('result').hidden=true;
 const win={
  innerWidth:844,innerHeight:390,matchMedia:()=>({matches:false}),
  CyberOutbreakDialogs:{
   getActive:()=>null,
   hide:()=>{doc.getElementById('wrap').inert=false}
  }
 };
 const math=Object.create(Math);math.random=()=>0.1;
 const sandbox={
  window:win,document:doc,localStorage:storage,Math:math,
  requestAnimationFrame:cb=>{frames.push(cb);return frames.length},
  setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>true,alert:()=>{}
 };
 vm.createContext(sandbox);
 vm.runInContext(read('js/game-data.js'),sandbox,{filename:'game-data.js'});
 vm.runInContext(read('js/progression.js'),sandbox,{filename:'progression.js'});
 // Add direct end/check probes to the test copy only. The shipped game does not expose them.
 const probeSource=read('js/app.js').replace('window.CyberOutbreakDebug={',
  'window.CyberOutbreakDebug={_testEnd:end,_testCheck:check,_testSet:(key,v)=>{state[key]=v},_testOwnAll:()=>state.nodes.forEach(n=>n.owned=true),');
 assert.notEqual(probeSource,read('js/app.js'),'Test probes must be injected');
 vm.runInContext(probeSource,sandbox,{filename:'app.js'});
 vm.runInContext(read('js/tutorial.js'),sandbox,{filename:'tutorial.js'});
 return {
  window:win,doc,game:win.CyberOutbreakDebug,tutorial:win.CyberOutbreakTutorial,
  flush(){for(let i=0;i<4&&frames.length;i++){const scheduled=frames.splice(0);scheduled.forEach(f=>f())}},
  key(key,shiftKey=false){
   const event={key,shiftKey,prevented:false,stopped:false,preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true}};
   for(const h of doc.events.keydown||[])h(event);
   return event;
  }
 };
}

const storage=makeStorage();
storage.setItem('cyber-outbreak:meta:v07',JSON.stringify({
 schema:1,rp:65,levels:{funding:1,initiative:0,forecast:0,readiness:0},runs:0,
 firstClears:{A:false,B:false,C:false,D:false}
}));
storage.setItem('cyber-outbreak:achievements:v02',JSON.stringify(['first']));
let session=makeGame(storage),g=session.game;
assert.equal(g.getMeta().schema,2);
assert.equal(g.getMeta().rp,65);
assert.ok(g.getMeta().claimedRewards.includes('first'));
g.startGame();g.expand('office');
assert.equal(g.getMeta().rp,65,'Claimed achievement must not be rewarded twice');
session.doc.getElementById('clearAwardsBtn').click();
g.startGame();g.expand('office');
assert.equal(g.getMeta().rp,65,'Resetting visible achievements must not reset RP claim ledger');

g.openPanel('shop');session.flush();
assert.equal(session.doc.activeElement.id,'closeDrawerBtn');
assert.equal(session.doc.getElementById('wrap').inert,true);
assert.equal(session.key('Tab').prevented,true);
assert.equal(session.key('Escape').prevented,true);
assert.equal(session.doc.getElementById('controlDrawer').inert,true);
assert.equal(session.doc.getElementById('wrap').inert,false);

g.startGame();g.collect('gate');g.collect('gate');g._testSet('turn',3);g._testEnd(true,'test');
const stored=JSON.parse(storage.getItem('cyber-outbreak:meta:v07'));
assert.equal(stored.firstClears.D,true,'First-clear flag must be persisted before completing game');
assert.equal(stored.runs,1);
const previousRP=g.getMeta().rp;
session=makeGame(storage);g=session.game;
g.startGame();g.collect('gate');g.collect('gate');g._testSet('turn',3);g._testEnd(true,'test');
assert.equal(g.getState().rpBreakdown.firstClear,0,'Second clear must not award +10 RP');
assert.equal(g.getMeta().rp,previousRP+15);

session=makeGame(storage);g=session.game;
g.startGame();g._testOwnAll();g._testSet('total',300);g._testSet('alert',100);g._testCheck();
assert.equal(session.doc.getElementById('resultTitle').textContent,'病院側の防御成功');

session=makeGame(storage);g=session.game;
g.startGame();storage.deny=true;g.buyResearch('funding');
assert.equal(session.doc.getElementById('storageNotice').hidden,false);
storage.deny=false;

session=makeGame(storage);g=session.game;
g.startTutorialGame();session.flush();
assert.equal(session.doc.activeElement.id,'[data-node="gate"]','Initial tutorial focus must target the node');
const actions=[
 ['selectNode','gate'],['collect','gate'],['selectNode','office'],['expand','office'],['collect','office'],
 ['openPanel','upgrade'],['buy','analysis'],['openPanel','shop'],['purchaseAction',null],
 ['collect','office'],['endTurn',null]
];
for(let i=0;i<actions.length;i++){
 const [action,arg]=actions[i];
 g[action](arg);
 if(i===8)g.closePanel();
 session.flush();
 assert.equal(session.tutorial.getStep(),i+1,'Tutorial failed on step '+(i+1));
}
assert.equal(g.getState().wasTutorial,true);
assert.equal(g.getMeta().rp,storage.data['cyber-outbreak:meta:v07']?JSON.parse(storage.data['cyber-outbreak:meta:v07']).rp:0);
console.log('CYBER OUTBREAK v0.7.3 integration stability checks passed');
