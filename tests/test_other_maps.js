const M=require('./mock'),A=M.assert,H=__dirname+'/../host/',fs=require('fs');
let c=new M.Comp(),x=M.load([H+'akira_other.jsx',H+'akira_maps.jsx'],c),F=x.$._flex;
// dispatcher/versions
A.equal(F.run('saasVersion'),'0');A.equal(F.run('nope'),'ERR:Unknown function: nope');A.equal(F.flexTypeReAlignVersion(),'1.0.0');
A.equal(typeof x.flexProjectOrganizerVersion,'function');
// no comp / no sel
A.equal(M.load([H+'akira_other.jsx'],null).$._flex.trimToBelowLayer(),'ERR:Open a composition first.');
A.equal(M.load([H+'akira_other.jsx'],c,true).$._flex.trimToBelowLayer(),'ERR:locked');
A.equal(F.trimToBelowLayer(),'ERR:Select at least one layer.');
// effects inspector
let L=new M.TextLayer(c,'T');c._l.push(L);let b=new M.AVLayer(c,'B');b.inPoint=2;b.outPoint=5;c._l.push(b);L.selected=true;
let fx=L.property('ADBE Effect Parade');fx.addProperty('ADBE Glo2').name='Glow';fx.addProperty('ADBE Gaussian Blur 2').name='Blur';
let j=JSON.parse(F.getSelectedLayerEffects());A.equal(j.effects.length,2);A.equal(j.effects[1].matchName,'ADBE Gaussian Blur 2');
A.equal(F.toggleLayerEffectActive(1),'SUCCESS');A.equal(fx.property(1).enabled,false);
A.equal(F.deleteLayerEffect(9),'ERR:Effect not found.');A.equal(F.deleteLayerEffect(1),'SUCCESS');A.equal(fx.numProperties,1);
A.equal(F.deleteAllLayerEffects(),'SUCCESS');A.equal(fx.numProperties,0);
A.equal(F.applySystemLabelsToSelected(5),'SUCCESS');A.equal(L.label,5);A.equal(F.applySystemLabelsToSelected(),'SUCCESS');A.equal(L.label,1);
A.equal(F.trimToBelowLayer(),'SUCCESS');A.deepEqual([L.inPoint,L.outPoint],[2,5]);
A.equal(F.createExtrusion(80),'SUCCESS');A.equal(L.threeDLayer,true);A.equal(c.renderer,'ADBE Advanced 3d');A.equal(L.property('ADBE Extrsn Options Grp').property('ADBE Extrsn Depth').value,80);
// type anchor: rect left -50 top -20 w100 h40; pos 500,300 anchor 0,0
L.transform.position.setValue([500,300]);
A.equal(F.flexTypeSelection('TL'),'SUCCESS');A.deepEqual(L.transform.anchorPoint.value,[-50,-20]);A.deepEqual(L.transform.position.value,[450,280]);A.ok(L.comment.indexOf('akira-typepin:TL')===0);
L.rect={left:-100,top:-20,width:200,height:40};A.equal(F.flexTypeResetAnchor(),'SUCCESS');A.deepEqual(L.transform.anchorPoint.value,[-100,-20]);
A.equal(F.flexTypeSelection('XX'),'ERR:Unknown anchor position: XX');
A.equal(F.flexTypeCenter(),'SUCCESS');let p=L.transform.position.value,a=L.transform.anchorPoint.value;A.deepEqual([p[0]+(-100-a[0]),p[1]+(-20-a[1])],[860,520]);
A.equal(F.flexTypeAlign('BR'),'SUCCESS');p=L.transform.position.value;A.deepEqual([p[0]+(-100-a[0])+200,p[1]+(-20-a[1])+40],[1920,1080]);
A.equal(x.app&&M.undo(),0,'undo groups balanced');
// maps
L.selected=false;A.equal(F.flexMapEngineVersion(),'1.0.0');A.equal(F.flexMap_createFromFile(''),'ERR:No file chosen.');
let r=F.flexMap_createFromFile(encodeURIComponent(__filename));A.ok(/^OK:map\d+$/.test(r),r);let id=r.slice(3);
let rigs=JSON.parse(F.flexMap_listRigs());A.equal(rigs.length,1);A.equal(rigs[0].layers,5);
let view=c._l.find(l=>/:content$/.test(l.comment)),cp=view.property('ADBE Effect Parade').property(1);
A.equal(cp.matchName,'ADBE Corner Pin');A.ok(cp.property(1).expression.indexOf('Map '+id+' TL')>0);
let tl=c._l.find(l=>l.comment===`akira-map-rig:${id}:tl`);A.deepEqual(tl.transform.position.value,[960-320,540-180]);
A.equal(JSON.parse(F.flexMap_activeRig()).id,id);A.equal(F.flexMap_selectRig(id),'SUCCESS');A.equal(c._l.filter(l=>l.selected).length,5);A.equal(F.flexMap_selectRig('zz'),'ERR:Rig not found.');
cp.property(2).expression='';A.equal(F.flexMap_syncRigToView(id),'SUCCESS');A.ok(cp.property(2).expression.length>0);
fs.writeFileSync(require('os').tmpdir()+'/trk.json','{"fps":10,"frames":[{"f":0,"tl":[1,2],"tr":[3,4],"bl":[5,6],"br":[7,8]},{"t":0.5,"tl":[9,9],"tr":[9,9],"bl":[9,9],"br":[9,9]},{"t":1,"tl":[1]}]}');
A.equal(F.flexMap_createTrackerFromFile(encodeURIComponent(require('os').tmpdir()+'/trk.json'),id),'OK:2');A.deepEqual(tl.transform.position.keys,[[0,[1,2]],[0.5,[9,9]]]);
A.equal(F.flexMap_bakeRig(id),'OK:10');A.equal(cp.property(1).expression,'');A.equal(cp.property(1).keys.length,10);A.deepEqual(cp.property(1).keys[2][1],[2,4]);
A.equal(F.flexMap_replaceViewFromFile(encodeURIComponent(__filename),id),'SUCCESS');A.equal(view.source.width,640);
A.ok(/^OK:/.test(F.flexMap_traceOutlineFromFile(encodeURIComponent('{"points":[[0,0],[10,0],[10,10]],"rigId":"'+id+'"}'))));
A.equal(F.flexMap_traceOutlineFromFile(encodeURIComponent('{"points":[[0,0]]}')),'ERR:Outline needs at least 3 points.');
A.equal(JSON.parse(F.flexMap_listRigs())[0].layers,6);
A.equal(M.undo(),0,'undo groups balanced');
console.log('ALL TESTS PASSED');
