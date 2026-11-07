/* Fictional game constants v0.4 */
(()=>{'use strict';
const EDGES=[['gate','office'],['gate','shared'],['office','billing'],['office','lab'],['shared','lab'],['shared','image'],['billing','records'],['lab','records'],['image','operations'],['operations','records']];
const MAP=[
{id:'gate',name:'外縁ゲート',desc:'演習の開始地点。実際の接続方法を示すものではありません。',x:93,y:205,data:24,security:1,code:'01',server:false},
{id:'office',name:'事務情報',desc:'事務部門に相当する架空の情報資産群。',x:278,y:93,data:32,security:1,code:'02',server:false},
{id:'shared',name:'共有サービス',desc:'共同サービスに相当する架空の資産群。継続収入ユニットを配置できます。',x:278,y:319,data:29,security:1,code:'03',server:true},
{id:'billing',name:'医事会計',desc:'会計に関する架空の情報資産群。',x:471,y:67,data:39,security:2,code:'04',server:true},
{id:'lab',name:'検査部門',desc:'検査に関する架空の情報資産群。',x:471,y:199,data:40,security:2,code:'05',server:true},
{id:'image',name:'画像部門',desc:'画像部門に関する架空の情報資産群。',x:471,y:334,data:36,security:2,code:'06',server:true},
{id:'records',name:'診療記録',desc:'記録を表現した架空ノード。実際の電子カルテとは無関係です。',x:671,y:144,data:56,security:3,code:'07',server:true},
{id:'operations',name:'運用基盤',desc:'運用を表現した架空ノード。',x:671,y:320,data:45,security:3,code:'08',server:true}
];
const RULES={
 casual:{targetIP:85,targetNodes:4,maxTurns:13,startIP:24,startAlert:3,alertFactor:.60},
 normal:{targetIP:120,targetNodes:5,maxTurns:12,startIP:22,startAlert:7,alertFactor:.77},
 hard:{targetIP:155,targetNodes:6,maxTurns:11,startIP:18,startAlert:12,alertFactor:.94}
};
const UPGRADES={
 spread:{label:'拡張',icon:'↗',desc:'新しいノードへの進出成功率を高める',costs:[18,32,49]},
 analysis:{label:'解析',icon:'▤',desc:'模擬データ回収量を増やす',costs:[19,32,47]},
 adapt:{label:'適応',icon:'⬡',desc:'警戒度の増加を緩和する',costs:[21,37,53]},
 sustain:{label:'継続',icon:'◷',desc:'継続収入ユニットの毎ターン収入を増やす',costs:[25,40,58]}
};
const ARTIFACTS=[
{id:'memo',name:'匿名化の覚書',desc:'「模擬データと実データの境界」についての記録。'},
{id:'drill',name:'障害対応訓練記録',desc:'復旧連携の演習を振り返る資料。'},
{id:'backup',name:'復旧計画の断片',desc:'バックアップだけでは十分でないことを示す資料。'},
{id:'training',name:'職員教育の記録',desc:'職員からの報告が早期検知につながった記録。'},
{id:'mapping',name:'構成管理ノート',desc:'資産の把握と優先順位付けに関するメモ。'},
{id:'response',name:'初動連絡の手引き',desc:'担当部署と責任分担の重要性を示す資料。'}
];
const MILESTONES=[
{id:'first',name:'第一歩',desc:'新しいノードに進出した',icon:'◇'},
{id:'wealth',name:'データの山',desc:'模擬データ回収が累計50 IPに到達',icon:'▤'},
{id:'stream',name:'定期収入',desc:'継続収入ユニットでポイントを獲得',icon:'◷'},
{id:'demand',name:'交渉の結果',desc:'要求イベントでポイントを獲得',icon:'!'},
{id:'reconnect',name:'分断を越えて',desc:'ネットワーク分離の解消を確認した',icon:'⌁'},
{id:'victory',name:'ミッション達成',desc:'いずれかの難易度で勝利',icon:'★'}
];

window.CyberOutbreakData=Object.freeze({EDGES,MAP,RULES,UPGRADES,ARTIFACTS,MILESTONES});
})();
