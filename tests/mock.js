const vm=require('vm'),fs=require('fs'),assert=require('assert');
let undo=0;
class Prop{constructor(name,mn,val,parent){this.name=name;this.matchName=mn||name;this._v=val;this.expression='';this.enabled=true;this.keys=[];this.children=[];this.parentProperty=parent;}
 get value(){return this._v} setValue(v){this._v=v} get numProperties(){return this.children.length}
 property(k){if(typeof k==='number')return this.children[k-1];let c=this.children.find(c=>c.matchName===k||c.name===k);if(!c&&MAKE[k]){c=MAKE[k](this);}return c}
 addProperty(mn){const p=new Prop(mn,mn,null,this);(SUB[mn]||(()=>{}))(p);this.children.push(p);return p}
 remove(){const a=this.parentProperty.children;a.splice(a.indexOf(this),1)}
 get numKeys(){return this.keys.length} removeKey(i){this.keys.splice(i-1,1)}
 setValuesAtTimes(t,v){this.keys=t.map((x,i)=>[x,v[i]])} valueAtTime(t){return this.expression?[t*10,t*20]:this._v}}
const MAKE={'ADBE Extrsn Options Grp':p=>{const g=p.addProperty('ADBE Extrsn Options Grp');g.children.push(new Prop('Depth','ADBE Extrsn Depth',0,g));return g}};
const SUB={'ADBE Corner Pin':p=>{for(let i=1;i<=4;i++)p.children.push(new Prop('c'+i,'ADBE Corner Pin-000'+i,[0,0],p))},
 'ADBE Vector Group':p=>{p.children.push(new Prop('Contents','ADBE Vectors Group',null,p))},
 'ADBE Vector Shape - Group':p=>{p.children.push(new Prop('Path','ADBE Vector Shape',null,p))},
 'ADBE Vector Graphic - Stroke':p=>{p.children.push(new Prop('c','ADBE Vector Stroke Color',0,p),new Prop('w','ADBE Vector Stroke Width',0,p))}};
class Layer{constructor(comp,name,kind){this.comp=comp;this.name=name;this.comment='';this.selected=false;this.label=0;this.inPoint=0;this.outPoint=10;this.kind=kind;
 this.root=new Prop('root','root');const fx=new Prop('Effects','ADBE Effect Parade',null,this.root);this.root.children.push(fx,new Prop('Contents','ADBE Root Vectors Group',null,this.root));
 this.transform={anchorPoint:new Prop('a','a',[0,0]),position:new Prop('p','p',[0,0]),scale:new Prop('s','s',[100,100])};this.rect={left:-50,top:-20,width:100,height:40};this.source={width:400,height:200};}
 property(k){return this.root.property(k)} get index(){return this.comp._l.indexOf(this)+1}
 remove(){this.comp._l.splice(this.comp._l.indexOf(this),1)} moveAfter(o){this.remove();this.comp._l.splice(o.index,0,this)}
 replaceSource(it){this.source=it}}
class ShapeLayer extends Layer{} class TextLayer extends Layer{} class AVLayer extends Layer{}
class Comp{constructor(){this._l=[];this.width=1920;this.height=1080;this.time=0;this.frameRate=10;this.frameDuration=0.1;this.workAreaStart=0;this.workAreaDuration=1;
 const c=this;this.layers={addNull(){const l=new AVLayer(c,'Null','null');c._l.unshift(l);return l},addShape(){const l=new ShapeLayer(c,'Shape','shape');c._l.unshift(l);return l},add(it){const l=new AVLayer(c,'Foot','av');l.source=it;l.transform.anchorPoint.setValue([it.width/2,it.height/2]);c._l.unshift(l);return l}}}
 get numLayers(){return this._l.length} layer(i){return this._l[i-1]}}
function load(files,comp,locked){undo=0;
 const ctx={console,$:{global:null},app:{beginUndoGroup(){undo++},endUndoGroup(){undo--},project:{importFile(o){return{width:640,height:360,f:o.f}}}},
  File:function(p){this.p=p;this.exists=fs.existsSync(p);this.open=()=>true;this.read=()=>fs.readFileSync(p,'utf8');this.close=()=>{}},
  ImportOptions:function(f){this.f=f},Shape:function(){},ShapeLayer,TextLayer,AVLayer};
 ctx.File.openDialog=()=>null;ctx.$.global=ctx;vm.createContext(ctx);
 ctx.$._flex={isLocked:!!locked,_h:{locked:()=>locked?'ERR:locked':null,activeComp:()=>comp,selectedLayers:c=>c._l.filter(l=>l.selected),sourceRect:l=>l.rect}};
 files.forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f}));return ctx;}
module.exports={load,Comp,ShapeLayer,TextLayer,AVLayer,Layer,Prop,assert,undo:()=>undo};
