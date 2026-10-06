(function(){var RU=__RU__,K='sougetsu_lang';
function n(t){return t.replace(/\s+/g,' ').trim()}
function apply(l){var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:function(x){var p=x.parentNode&&x.parentNode.nodeName;return(p==='SCRIPT'||p==='STYLE'||p==='CODE')?2:1}});
 for(var x;x=w.nextNode();){if(x.__en===undefined){if(!RU[n(x.nodeValue)])continue;x.__en=x.nodeValue}var k=n(x.__en),pre=x.__en.match(/^\s*/)[0],post=x.__en.match(/\s*$/)[0];x.nodeValue=l==='ru'?pre+RU[k]+post:x.__en}
 document.documentElement.lang=l;if(document.__t===undefined)document.__t=document.title;document.title=l==='ru'&&RU[n(document.__t)]?RU[n(document.__t)]:document.__t;
 document.querySelectorAll('.lang button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.lang===l))});window.__lang=l}
window.__applyLang=function(){apply(window.__lang||'en')};
var l='en';try{l=localStorage.getItem(K)||((navigator.language||'').slice(0,2)==='ru'?'ru':'en')}catch(e){}
document.querySelectorAll('.lang button').forEach(function(b){b.addEventListener('click',function(){apply(b.dataset.lang);try{localStorage.setItem(K,b.dataset.lang)}catch(e){}})});apply(l)})();
