/* CYBER OUTBREAK v0.7 - fictional profiles and permanent progression */
(()=>{'use strict';
const FIELDS=[
 {key:'maintenance',label:'システム保守'},{key:'training',label:'職員教育'},
 {key:'access',label:'アクセス管理'},{key:'monitoring',label:'監視・検知'},
 {key:'recovery',label:'復旧体制'}];
const PROFILES={
 A:{label:'A：高度管理病院',subtitle:'保守・教育・監視が充実',values:[91,92,88,91,90],bonusRP:8},
 B:{label:'B：標準管理病院',subtitle:'一定の対策があるが、部門差あり',values:[72,67,76,69,73],bonusRP:4},
 C:{label:'C：改善途上の病院',subtitle:'保守と職員教育に課題が残る',values:[45,38,52,44,49],bonusRP:2},
 D:{label:'D：管理体制が不十分な病院',subtitle:'好機は多いが、防御対応も発生',values:[24,22,31,28,33],bonusRP:0}
};
const OPPORTUNITIES=[
 {id:'maintenance',domain:'maintenance',title:'更新計画の遅延',description:'共有システムで保守計画の遅れが見つかりました。仮想情報ボーナスを狙える期間限定イベントです。',bonus:15,alert:5},
 {id:'note',domain:'access',title:'パスワードのメモを紛失',description:'架空の職員による認証情報の管理不備イベント。実際の認証情報や利用方法は表示されません。',bonus:14,alert:9},
 {id:'training',domain:'training',title:'職員教育の未実施',description:'教育計画に空白が見つかり、仮想データ探索で一時的な好機が生じます。',bonus:12,alert:5},
 {id:'monitoring',domain:'monitoring',title:'監視体制の空白',description:'架空システムで点検周期のずれが発生し、短期間だけ戦略上の選択肢が増えます。',bonus:16,alert:7},
 {id:'recovery',domain:'recovery',title:'復旧手順の更新遅れ',description:'復旧手順の見直しが遅れています。関連する仮想資料を得られる可能性があります。',bonus:11,alert:6}
];
const RESEARCH={
 funding:{label:'初期資金支援',desc:'次回開始時のIP +5 / Lv',costs:[10,20,35]},
 initiative:{label:'初動の行動余力',desc:'次回開始ターンのAP +1（最大1）',costs:[25]},
 forecast:{label:'好機予測',desc:'次回以降の好機の有効期間 +1ターン / Lv',costs:[20,35]},
 readiness:{label:'警戒分析',desc:'次回開始時の警戒度 -2 / Lv',costs:[15,30]}
};
const META_KEY='cyber-outbreak:meta:v07';
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Number.isFinite(n)?n:min));
function emptyMeta(){return {schema:1,rp:0,levels:Object.fromEntries(Object.keys(RESEARCH).map(k=>[k,0])),runs:0,firstClears:{A:false,B:false,C:false,D:false}}}
function sanitizeMeta(raw){
 const base=emptyMeta();
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return base;
 base.rp=Math.floor(clamp(Number(raw.rp),0,100000));
 base.runs=Math.floor(clamp(Number(raw.runs),0,100000));
 for(const [k,r] of Object.entries(RESEARCH))base.levels[k]=Math.floor(clamp(Number(raw.levels?.[k]),0,r.costs.length));
 for(const k of Object.keys(PROFILES))base.firstClears[k]=raw.firstClears?.[k]===true;
 return base;
}
function loadMeta(storage){try{const store=storage||localStorage;return sanitizeMeta(JSON.parse(store.getItem(META_KEY)||'null'))}catch(_){return emptyMeta()}}
function saveMeta(meta,storage){try{const store=storage||localStorage;store.setItem(META_KEY,JSON.stringify(sanitizeMeta(meta)));return true}catch(_){return false}}
function initialMaturity(id='B',random=Math.random){
 const p=PROFILES[id]||PROFILES.B;
 return Object.fromEntries(FIELDS.map((f,i)=>[f.key,Math.round(clamp(p.values[i]+(random()-.5)*10,5,99))]));
}
function averageMaturity(m){return FIELDS.reduce((sum,f)=>sum+clamp(Number(m?.[f.key])),0)/FIELDS.length}
function opportunityChance(m){return clamp(.06+(100-averageMaturity(m))*.0056,.06,.62)}
function chooseOpportunity(m,random=Math.random){
 const weights=OPPORTUNITIES.map(e=>Math.max(8,110-clamp(Number(m?.[e.domain]))));
 const total=weights.reduce((a,b)=>a+b,0);
 let draw=random()*total;
 for(let i=0;i<weights.length;i++){draw-=weights[i];if(draw<0)return OPPORTUNITIES[i]}
 return OPPORTUNITIES[OPPORTUNITIES.length-1];
}
function impactIndex(m){return Math.round(clamp(Number(m.info))*.35+clamp(Number(m.systems))*.30+clamp(Number(m.financial))*.15+clamp(Number(m.care))*.20)}
function careContinuity(m){return Math.round(clamp(100-clamp(Number(m.care))*.65-clamp(Number(m.systems))*.2))}
function runReward(won,turn,harvested,profile,firstClear){
 if(turn<3||harvested<12)return 0;
 return (won?15:3)+(won?(PROFILES[profile]||PROFILES.B).bonusRP:0)+(won&&firstClear?10:0);
}
window.CyberOutbreakProgression=Object.freeze({FIELDS,PROFILES,OPPORTUNITIES,RESEARCH,META_KEY,emptyMeta,sanitizeMeta,loadMeta,saveMeta,initialMaturity,averageMaturity,opportunityChance,chooseOpportunity,impactIndex,careContinuity,runReward,clamp});
})();