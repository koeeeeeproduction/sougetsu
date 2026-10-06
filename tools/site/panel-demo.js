/* ---------- interactive panel preview (visual mockup only; the real panel runs inside After Effects) ---------- */
(function(){
 const pnl=$('#pnl');if(!pnl)return;
 const comp=$('#comp'),A=$('#lyA'),B=$('#lyB'),T=$('#lyT'),grid=$('#gridOv'),wave=$('#wave'),tag=$('#compTag'),sel=$('#compSel'),st=$('#pnlStatus'),ph=$('#ph'),area=$('#toolArea'),nameEl=$('#pnlName'),kfs=$$('.tl .kf');
 const E='cubic-bezier(.22,1,.36,1)',anims=[];let extra=[],timer=0,ac=null;
 for(let i=0;i<28;i++)wave.appendChild(document.createElement('i'));
 const TABS={
  core:{name:'CORE TOOLKIT',anchor:true,tools:[['bounce','Bounce'],['elastic','Elastic'],['dup','True Dup'],['explode','Text Exploder'],['center','Center Layer',1]]},
  fx:{name:'EFFECTS LAB',tools:[['shake','Shakes'],['glass','Glass Morph'],['counter','Number Counter'],['orbs','Orb Generator']]},
  shape:{name:'SHAPE FORGE',tools:[['morph','Layer Morph',1],['grid','Akira Grid'],['round','Corner Round']]},
  type:{name:'TYPE STUDIO',tools:[['pop','Pop In'],['type','Typewriter'],['wave','Wave'],['split','Split Lines']]},
  sound:{name:'SOUND LAB',sound:true}
 };
 const SOUNDS=[['Soft Click 02','Clicks & Taps',[[0,0,.05]]],['Power Up 03','Power-ups & Zaps',[[0,0,.09],[4,.07,.09],[7,.14,.09],[12,.21,.22]]],['Jingle Sax 04','Jingles',[[7,0,.14],[4,.13,.14],[9,.26,.3]]],['Laser 01','Power-ups & Zaps',[[19,0,.18,'saw',-14]]]];
 function say(t,ok){st.classList.toggle('ok',!!ok);st.lastElementChild.textContent=t}
 function stop(){anims.splice(0).forEach(a=>{try{a.cancel()}catch(e){}});extra.splice(0).forEach(e=>e.remove());clearTimeout(timer);comp.classList.remove('shk')}
 function reset(){
  stop();
  A.removeAttribute('style');A.className='lyr sel';B.removeAttribute('style');B.hidden=false;T.hidden=true;T.textContent='';T.removeAttribute('style');
  grid.classList.remove('on');wave.classList.remove('on');tag.textContent='BEFORE';tag.classList.remove('after');sel.textContent='Shape Layer 1';kfs.forEach(k=>k.classList.remove('on'));ph.style.left='10px';
 }
 function play(dur){ // playhead + keyframes on the mini timeline
  kfs.forEach(k=>k.classList.add('on'));
  if(reduce)return;
  anims.push(ph.animate([{left:'10px'},{left:'calc(100% - 12px)'}],{duration:dur,easing:'linear',fill:'forwards'}));
 }
 function after(t){tag.textContent='AFTER';tag.classList.add('after');say(t,true)}
 function an(el,kf,o){const a=el.animate(kf,Object.assign({duration:reduce?1:900,easing:E,fill:'forwards'},o));anims.push(a);return a}
 function text(s){T.hidden=false;T.innerHTML=s.split('').map(c=>'<span>'+(c===' '?'&nbsp;':c)+'</span>').join('');sel.textContent='Text Layer';return[...T.children]}
 function hideShapes(){A.style.opacity=0;B.hidden=true}
 /* ---- tools ---- */
 const RUN={
  anchor(ix){const col=ix%3,row=Math.floor(ix/3),w=15,h=15*16/9,x=[4,50-w/2,96-w][col],y=[6,50-h/2,94-h][row];
   an(A,[{left:A.style.left||'22%',top:A.style.top||'30%'},{left:x+'%',top:y+'%'}]).onfinish=()=>{A.style.left=x+'%';A.style.top=y+'%'};
   play(900);after('Snapped Shape Layer 1 to '+['top left','top','top right','left','center','right','bottom left','bottom','bottom right'][ix]+'.')},
  center(){RUN.anchor(4)},
  bounce(){an(A,[{transform:'translateY(0)'},{transform:'translateY(-70%)',offset:.25,easing:'cubic-bezier(.3,0,.7,1)'},{transform:'translateY(0)',offset:.5},{transform:'translateY(-28%)',offset:.68},{transform:'translateY(0)',offset:.82},{transform:'translateY(-8%)',offset:.91},{transform:'translateY(0)'}],{duration:1500,easing:'ease-out',fill:'none'});play(1500);after('Bounce: 3 decaying hops, no keyframes to tweak.')},
  elastic(){an(A,[{transform:'scale(0)'},{transform:'scale(1.35)',offset:.3},{transform:'scale(.86)',offset:.5},{transform:'scale(1.1)',offset:.68},{transform:'scale(.97)',offset:.84},{transform:'scale(1)'}],{duration:1300,easing:'ease-out',fill:'none'});play(1300);after('Elastic overshoot added to Scale.')},
  dup(){const d=A.cloneNode();d.removeAttribute('id');d.className='lyr';comp.appendChild(d);extra.push(d);const l=parseFloat(getComputedStyle(A).left)/comp.clientWidth*100,t=parseFloat(getComputedStyle(A).top)/comp.clientHeight*100;
   d.style.left=l+'%';d.style.top=t+'%';d.style.filter='hue-rotate(70deg)';an(d,[{opacity:0,transform:'translate(0,0)'},{opacity:1,transform:'translate(70%,40%)'}]);sel.textContent='Shape Layer 1 copy';play(900);after('True duplicate: an unlinked copy, safe to edit on its own.')},
  explode(){hideShapes();const s=text('SOUGETSU');s.forEach((c,i)=>an(c,[{transform:'translate(0,0) rotate(0)'},{transform:`translate(${(i-3.5)*22}%,${(i%2?-1:1)*(40+i*6)}%) rotate(${(i%2?-1:1)*14}deg)`,offset:.45},{transform:'translate(0,0) rotate(0)'}],{duration:1800,delay:i*40}));sel.textContent='8 layers (one per letter)';play(1800);after('Text exploded into 8 letter layers, positions kept.')},
  shake(){comp.classList.remove('shk');void comp.offsetWidth;comp.classList.add('shk');play(1100);after('Camera shake on an adjustment layer. Intensity and speed stay editable.')},
  glass(){const g=document.createElement('div');g.style.cssText='position:absolute;z-index:3;left:30%;top:22%;width:44%;height:56%;border-radius:14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 20px 40px -20px #000';comp.appendChild(g);extra.push(g);
   an(g,[{opacity:0,transform:'translateY(14%) scale(.94)'},{opacity:1,transform:'none'}]);sel.textContent='Glass Card';play(900);after('Glass Morph: frosted card that blurs whatever is behind it.')},
  counter(){hideShapes();T.hidden=false;sel.textContent='Counter';const t0=performance.now(),end=1284;(function s(n){const p=Math.min(1,(n-t0)/1400),e=1-Math.pow(1-p,3);T.textContent=Math.round(end*e).toLocaleString('en-US');if(p<1&&!T.hidden)requestAnimationFrame(s)})(t0);play(1400);after('Number counter driven by one slider. Commas, decimals and prefixes built in.')},
  orbs(){for(let i=0;i<9;i++){const o=document.createElement('div'),a=i/9*Math.PI*2;o.style.cssText=`position:absolute;z-index:2;left:${50+Math.cos(a)*28-2.5}%;top:${50+Math.sin(a)*38-4.5}%;width:5%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff,var(--ac) 45%,#3f6212)`;comp.appendChild(o);extra.push(o);
   an(o,[{opacity:0,transform:'scale(0)'},{opacity:1,transform:'scale(1)'}],{delay:i*60,duration:600})}hideShapes();sel.textContent='Orb Cloner';play(1200);after('9 orbs cloned around a ring, each one driven by the effector.')},
  morph(){const ca=comp.getBoundingClientRect(),ra=A.getBoundingClientRect(),rb=B.getBoundingClientRect(),dx=(rb.left+rb.width/2-ra.left-ra.width/2)/ra.width*100,dy=(rb.top+rb.height/2-ra.top-ra.height/2)/ra.height*100,sc=rb.width/ra.width;
   an(A,[{transform:'translate(0,0) rotate(0) scale(1)',opacity:1,borderRadius:'14%'},{transform:`translate(${dx/2}%,${dy/2-90}%) rotate(16deg) scale(${(1+sc)/2*.88})`,opacity:1,offset:.5,borderRadius:'32%'},{transform:`translate(${dx}%,${dy}%) rotate(0) scale(${sc})`,opacity:.9,offset:.8,borderRadius:'50%'},{transform:`translate(${dx}%,${dy}%) rotate(0) scale(${sc})`,opacity:0,borderRadius:'50%'}],{duration:1500,easing:'cubic-bezier(.45,0,.2,1)',fill:'none'});
   an(B,[{transform:'scale(1)',opacity:1},{transform:'scale(.85)',opacity:0,offset:.05},{transform:'scale(.85)',opacity:0,offset:.7},{transform:'scale(1.08)',opacity:1,offset:.88},{transform:'scale(1)',opacity:1}],{duration:1500,easing:'ease-out',fill:'none'});
   timer=setTimeout(()=>{A.style.opacity=0},reduce?0:1500);sel.textContent='Shape Layer 1 → Circle';play(1500);after('Layer Morph: flies on an arc, squashes, turns and lands as the target.')},
  grid(){grid.classList.add('on');an(grid,[{opacity:0},{opacity:1}],{duration:500});sel.textContent='Akira Grid';play(600);after('Akira Grid: 3×3 framing guides with corner markers, all editable.')},
  round(){an(A,[{borderRadius:'14%'},{borderRadius:'50%',offset:.6},{borderRadius:'36%'}]);play(900);after('Corners rounded live with one slider.')},
  pop(){hideShapes();const s=text('Motion work');s.forEach((c,i)=>an(c,[{transform:'scale(0) translateY(30%)',opacity:0},{transform:'scale(1.25)',opacity:1,offset:.6},{transform:'scale(1)',opacity:1}],{delay:i*55,duration:520}));play(1200);after('Pop In by character, stagger 2 frames.')},
  type(){hideShapes();const s=text('minus the busywork');s.forEach(c=>c.style.opacity=0);s.forEach((c,i)=>an(c,[{opacity:0},{opacity:1}],{delay:i*55,duration:1}));play(s.length*55+200);after('Typewriter reveal with a blinking cursor option.')},
  wave(){hideShapes();const s=text('Sougetsu');s.forEach((c,i)=>an(c,[{transform:'translateY(0)'},{transform:'translateY(-35%)',offset:.25},{transform:'translateY(18%)',offset:.6},{transform:'translateY(0)'}],{delay:i*70,duration:900,iterations:2,fill:'none'}));play(2300);after('Wave: a travelling sine through the letters.')},
  split(){hideShapes();T.hidden=false;T.innerHTML='<span>Motion work,</span><br><span>minus the busywork.</span>';T.style.lineHeight='1.1';T.style.textAlign='center';sel.textContent='2 line layers';[...T.querySelectorAll('span')].forEach((c,i)=>an(c,[{transform:'translateX(0)'},{transform:`translateX(${i?14:-14}%)`,offset:.5},{transform:'translateX(0)'}],{duration:1100,delay:i*120}));play(1300);after('Split Lines: one text layer becomes one layer per line.')}
 };
 /* ---- sound: tiny synth previews (the real Sound Lab plays your library files) ---- */
 function tone(seq){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();const t0=ac.currentTime+.01;
  seq.forEach(n=>{const o=ac.createOscillator(),g=ac.createGain();o.type=n[3]||'triangle';o.frequency.setValueAtTime(660*Math.pow(2,n[0]/12),t0+n[1]);if(n[4])o.frequency.exponentialRampToValueAtTime(660*Math.pow(2,(n[0]+n[4])/12),t0+n[1]+n[2]);
   g.gain.setValueAtTime(0,t0+n[1]);g.gain.linearRampToValueAtTime(.12,t0+n[1]+.01);g.gain.exponentialRampToValueAtTime(.0001,t0+n[1]+n[2]);o.connect(g);g.connect(ac.destination);o.start(t0+n[1]);o.stop(t0+n[1]+n[2]+.05)})}catch(e){}}
 function playSound(i,row){reset();hideShapes();wave.classList.add('on');$$('.snd-row').forEach(r=>r.classList.toggle('on',r===row));tone(SOUNDS[i][2]);sel.textContent=SOUNDS[i][0];
  const bars=[...wave.children],t0=performance.now(),len=Math.max(.35,SOUNDS[i][2].reduce((m,n)=>Math.max(m,n[1]+n[2]),0))*1000+250;
  (function s(n){const p=(n-t0)/len;bars.forEach((b,k)=>b.style.height=(p<1?Math.max(6,Math.abs(Math.sin(k*.7+n/90))*90*(1-p)*(.4+.6*Math.random())):6)+'%');if(p<1&&wave.classList.contains('on'))requestAnimationFrame(s)})(t0);
  play(len);after('Previewing '+SOUNDS[i][0]+'. Press + to drop it at the playhead.')}
 /* ---- render a tab ---- */
 function tab(id){
  reset();const t=TABS[id];nameEl.textContent=t.name;$$('.pnl-rail button').forEach(b=>b.classList.toggle('on',b.dataset.tab===id));
  let h='';
  if(t.sound){h='<div class="snd"><div class="snd-search">⌕&nbsp; Search sounds… (click, whoosh, jingle)</div>'+SOUNDS.map((s,i)=>`<button class="snd-row" data-snd="${i}"><span class="pl">▶</span>${s[0]}<small>${s[1]}</small><span class="pl" data-add="${i}" title="Add to comp">＋</span></button>`).join('')+'</div>';say('Click a sound to hear it. 100+ sounds in the real library.')}
  else{const tools='<div class="tools">'+t.tools.map(x=>`<button class="tool${x[2]?' wide':''}" data-tool="${x[0]}">${x[1]}</button>`).join('')+'</div>';
   h=t.anchor?'<div class="row2"><div class="anc" aria-label="Anchor grid">'+['↖','↑','↗','←','•','→','↙','↓','↘'].map((c,i)=>`<button data-anc="${i}" title="Snap to ${['top left','top','top right','left','center','right','bottom left','bottom','bottom right'][i]}">${c}</button>`).join('')+'</div>'+tools+'</div>':tools;
   say('Pick a tool. Nothing here touches a real project.')}
  area.innerHTML=h}
 area.addEventListener('click',e=>{const add=e.target.closest('[data-add]');if(add){e.stopPropagation();kfs.forEach(k=>k.classList.add('on'));say(SOUNDS[+add.dataset.add][0]+' added at 0:02 in Comp 1.',true);return}
  const r=e.target.closest('.snd-row');if(r){playSound(+r.dataset.snd,r);return}
  const a=e.target.closest('[data-anc]');if(a){$$('.tool').forEach(b=>b.classList.remove('on'));if(!T.hidden||B.hidden||extra.length||A.style.opacity==='0')reset();RUN.anchor(+a.dataset.anc);return}
  const b=e.target.closest('[data-tool]');if(!b)return;$$('.tool').forEach(x=>x.classList.toggle('on',x===b));
  reset();RUN[b.dataset.tool]()});
 pnl.querySelector('.pnl-rail').addEventListener('click',e=>{const b=e.target.closest('button[data-tab]');if(b)tab(b.dataset.tab)});
 tab('core');
})();
