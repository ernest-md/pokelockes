/* PokéLockes — optional wild Tera guide; no area restriction, no zone encounter consumption. */
(function(){
"use strict";
const catalog=window.PokeTeraWildGuide;
if(!catalog||!Array.isArray(catalog.data)||typeof render!=="function")return;
const safe=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const $=id=>document.getElementById(id);
const names={paldea:"Paldea",kitakami:"Noroteo",terra:"Biodomo"};
const regionOrder={paldea:0,kitakami:1,terra:2};
const type=typeof RUN_TYPE==="string"?RUN_TYPE:"fuego";
let filter="all",query="";
const nav=document.querySelector("nav.tabs");
if(!nav)return;
const tabButton=document.createElement("button");
tabButton.type="button";tabButton.dataset.tab="teracapturas";tabButton.textContent="💎 Teracapturas";
nav.appendChild(tabButton);
tabButton.onclick=()=>{tab="teracapturas";render();$("teracapturas")?.scrollIntoView({behavior:"smooth",block:"start"})};
const pane=document.createElement("section");pane.className="pane";pane.id="teracapturas";
pane.setAttribute("aria-label","Guía de teracapturas extra");
nav.insertAdjacentElement("afterend",pane);
const regionFromQuery=key=>names[key]||key;
const candidates=()=>catalog.data.filter(x=>x.tera===type).sort((a,b)=>a.level-b.level||regionOrder[a.region]-regionOrder[b.region]);
const imgUrl=e=>{
 const species=e.species.replace(/\s*\(.*?\)\s*$/,"");
 const dex=typeof IDS!=="undefined"?(IDS[e.species]||IDS[species]):null;
 return Number.isInteger(Number(dex))&&Number(dex)>0?
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/"+Number(dex)+".png":"";
};
const available=()=>window.PokeLockeRules?.credits?.().available||0;
function beginCapture(entry){
 if(available()<=0){alert("Necesitas superar un objetivo nuevo para disponer de una teracaptura extra.");return}
 tab="equipo";addMonExpanded=true;render();renderAddForm();
 const sel=$("addOrigin");if(sel){sel.value="Captura extra teratipo";sel.dispatchEvent(new Event("change",{bubbles:true}))}
 if(entry){
  $("addSpecies").value=entry.species;
  $("addLevel").value=String(entry.level);
  $("addOriginDetail").value="Teracristalizado salvaje · "+entry.area+" ("+regionFromQuery(entry.region)+")";
  const dex=typeof IDS!=="undefined"?IDS[entry.species]:null;
  if(dex)$("addDex").value=String(dex);
  const notice=$("lockeTeraDetails");
  if(notice){
   const p=document.createElement("p");p.className="tera-suggestion-note";
   p.textContent="Sugerencia de la guía, no requisito. Puedes editar la especie, nivel o lugar antes de guardar. Confirma el teratipo real en el juego.";
   notice.appendChild(p);
  }
 }
 $("addMonPanel")?.scrollIntoView({behavior:"smooth",block:"start"});
 $("addSpecies")?.focus();
}
function draw(){
 const all=candidates();
 const visible=all.filter(e=>(filter==="all"||e.region===filter)&&
  (!query||(e.species+" "+e.area+" "+regionFromQuery(e.region)).toLocaleLowerCase("es").includes(query)));
 const credits=window.PokeLockeRules?.credits?.()||{earned:0,used:0,available:0};
 pane.innerHTML=
 '<div class="tera-guide-heading"><div><span class="tera-guide-eyebrow">💎 GUÍA DE TERACAPTURAS</span>'+
 '<h2>Pokémon teracristalizados de tipo '+safe(TYPE_NAME)+'</h2>'+
 '<p><strong>Sin restricciones por zona.</strong> Cada objetivo nuevo da derecho a una captura extra con teratipo '+safe(TYPE_NAME)+
 '. Puede ser en cualquier lugar de Paldea, Noroteo o Biodomo y nunca consume el encuentro normal de una zona.</p>'+
 '<p>Esta lista es solo una ayuda para encontrar ejemplares salvajes. También puedes registrar otro Pokémon que cumpla la regla, aunque no aparezca aquí.</p></div>'+
 '<div class="tera-guide-balance"><small>Bonos disponibles</small><strong>'+credits.available+'</strong><span>'+credits.used+' usados de '+credits.earned+' ganados</span></div></div>'+
 '<div class="tera-guide-toolbar"><label><span>Buscar Pokémon o lugar</span><input id="teraSearch" type="search" placeholder="Ej.: Kirlia, provincia…" value="'+safe(query)+'"></label>'+
 '<label><span>Región sugerida</span><select id="teraRegion">'+
 '<option value="all"'+(filter==="all"?" selected":"")+'>Todas las regiones</option>'+
 Object.entries(names).map(([id,name])=>'<option value="'+id+'"'+(filter===id?" selected":"")+'>'+name+'</option>').join("")+
 '</select></label>'+
 '<button type="button" id="teraManual"'+(credits.available<=0?" disabled":"")+'>＋ Registrar libremente</button></div>'+
 '<div class="tera-guide-info">Encontrados <strong>'+visible.length+'</strong> de '+all.length+
 ' encuentros de teratipo '+safe(TYPE_NAME)+' · Ordenados por nivel. El filtro de región solo afecta a la guía, nunca a tus capturas.</div>'+
 (visible.length?
 '<div class="tera-guide-grid">'+visible.map(e=>{
  const image=imgUrl(e);
  return '<article class="tera-guide-card"><div class="tera-guide-visual">'+
   (image?'<img src="'+safe(image)+'" alt="" loading="lazy" onerror="this.style.display=\'none\'">':'<span class="tera-guide-fallback">💎</span>')+
   '</div><div class="tera-guide-detail"><small>'+safe(regionFromQuery(e.region))+'</small>'+
   '<strong>'+safe(e.species)+'</strong><span>🔹 Teratipo '+safe(TYPE_NAME)+' · Nv. '+e.level+'</span>'+
   '<p>📍 '+safe(e.area)+'</p>'+
   '<button type="button" data-tera-pick="'+safe(e.id)+'"'+(credits.available<=0?" disabled":"")+'>'+
     (credits.available>0?"＋ Registrar esta captura":"Sin bonos disponibles")+'</button></div></article>';
 }).join("")+'</div>':
 '<div class="tera-guide-empty"><strong>No hay encuentros en este filtro.</strong><p>Prueba otra región o registra manualmente un Pokémon válido.</p></div>')+
 '<p class="tera-guide-source">Datos orientativos de <a href="'+catalog.source+'" target="_blank" rel="noopener noreferrer">Serebii: Wild Tera Type Pokémon</a>. '+
 'Consulta también <a href="'+catalog.alternative+'" target="_blank" rel="noopener noreferrer">Game8</a>. No se garantiza que la lista sea exhaustiva; los DLC tienen requisitos de acceso. No se valida una captura por su zona de origen.</p>';
 $("teraSearch").oninput=e=>{query=e.target.value.trim().toLocaleLowerCase("es");draw();const input=$("teraSearch");input.focus();input.setSelectionRange(input.value.length,input.value.length)};
 $("teraRegion").onchange=e=>{filter=e.target.value;draw()};
 $("teraManual").onclick=()=>beginCapture(null);
 pane.querySelectorAll("[data-tera-pick]").forEach(b=>b.onclick=()=>{
  const candidate=catalog.data.find(e=>e.id===b.dataset.teraPick&&e.tera===type);
  if(candidate)beginCapture(candidate);
 });
}
const oldRender=render;
render=function(...args){
 const result=oldRender.apply(this,args);
 if(tab==="teracapturas")draw();
 return result;
};
// Direct access from the battle rule summary / victory guide, without changing zone state.
document.addEventListener("click",event=>{
 const button=event.target.closest?.("#openTeraGuide");
 if(!button)return;
 event.preventDefault();tab="teracapturas";render();pane.scrollIntoView({behavior:"smooth",block:"start"});
});
window.PokeTeraGuide={candidates,beginCapture,open:()=>{tab="teracapturas";render()},source:catalog.source};
})();