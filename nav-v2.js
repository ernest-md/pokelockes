/* PokéLockes V2: one clear dashboard and five primary navigation groups. */
(function(){
"use strict";
const nav=document.querySelector("nav.tabs");
if(!nav||typeof render!=="function"||typeof run!=="object"||typeof B==="undefined")return;
const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const groups=[
 {id:"inicio",label:"⌂ Inicio",tabs:["inicio"]},
 {id:"capturas",label:"📍 Capturas",tabs:["mapa","zonas","teracapturas"]},
 {id:"equipo",label:"⚔️ Equipo",tabs:["equipo"]},
 {id:"combates",label:"🏆 Combates",tabs:["objetivos"]},
 {id:"historia",label:"📖 Historia",tabs:["diario","album","logros","reglas"]}
];
const choices={inicio:"inicio",capturas:"mapa",equipo:"equipo",combates:"objetivos",historia:"diario"};
const original=[...nav.querySelectorAll("[data-tab]")];
const primary=document.createElement("div");primary.className="nav-v2-primary";primary.setAttribute("role","group");primary.setAttribute("aria-label","Apartados principales");
const secondary=document.createElement("div");secondary.className="nav-v2-secondary";secondary.setAttribute("role","group");secondary.setAttribute("aria-label","Páginas del apartado");
for(const g of groups){
 const button=document.createElement("button");button.type="button";button.dataset.navGroup=g.id;button.textContent=g.label;
 button.onclick=()=>{tab=choices[g.id];render();document.getElementById(tab)?.scrollIntoView({behavior:"smooth",block:"start"})};
 primary.appendChild(button);
}
original.forEach(button=>secondary.appendChild(button));
nav.classList.add("nav-v2");nav.replaceChildren(primary,secondary);
const dashboard=document.createElement("section");dashboard.id="inicio";dashboard.className="pane nav-v2-home";
nav.insertAdjacentElement("afterend",dashboard);
function openPage(page){
 tab=page;render();document.getElementById(page)?.scrollIntoView({behavior:"smooth",block:"start"});
}
function drawDashboard(){
 const goals=new Set((run.bosses||[]).map(Number));
 const next=B.findIndex((_b,i)=>!goals.has(i));
 const boss=next<0?"Todos los objetivos superados":String(B[next]?.[0]||"Próximo objetivo");
 const level=next<0?null:B[next]?.[3];
 const mons=run.mons||[];
 const alive=mons.filter(x=>x.status!=="baja");
 const team=mons.filter(x=>x.status==="equipo");
 const locked=Object.entries(run.challengeRules?.mvpLocks||{}).filter(([id])=>mons.some(x=>x.id===id));
 const bonus=window.PokeLockeRules?.credits?.().available??Math.max(0,goals.size-Object.keys(run.challengeRules?.teraUsed||{}).length);
 const recent=(run.journal||[]).slice(-3).reverse();
 dashboard.innerHTML='<div class="nav-v2-welcome"><div><span class="nav-v2-eyebrow">'+escapeHtml(TYPE_EMOJI)+' RETO '+escapeHtml(TYPE_NAME.toUpperCase())+'</span>'+
  '<h2>Tu próxima aventura empieza aquí</h2><p>Todo lo importante para seguir tu Nuzlocke, sin buscar entre ocho pestañas.</p></div>'+
  '<div class="nav-v2-bonus"><small>PROGRESO DE LA RUN</small><strong>'+goals.size+' / '+B.length+'</strong><span>objetivos completados</span></div></div>'+
 '<div class="nav-v2-actions">'+
  '<button type="button" data-v2-quick="capture"><strong>＋ Capturar Pokémon</strong><small>Registrar captura, teratipo o shiny</small></button>'+
  '<button type="button" data-v2-quick="team"><strong>⚔️ Gestionar equipo</strong><small>'+team.length+'/6 titulares · '+alive.length+' supervivientes</small></button>'+
  '<button type="button" data-v2-quick="battle"><strong>🏆 Próximo combate</strong><small>'+escapeHtml(boss)+(level?" · Nv. "+level:"")+'</small></button>'+
  '<button type="button" data-v2-quick="map"><strong>📍 Explorar mapa</strong><small>Encuentros y zonas de Paldea y DLC</small></button></div>'+
 '<div class="nav-v2-overview">'+
  '<article class="nav-v2-panel"><h3>🎯 Siguiente objetivo</h3><strong>'+escapeHtml(boss)+'</strong>'+
   '<p>'+(next<0?"Reto completado. ¡Enhorabuena!":"Prepara tus Pokémon y revisa el nivel máximo antes del combate.")+'</p>'+
   '<button type="button" data-v2-quick="battle">Abrir objetivos →</button></article>'+
  '<article class="nav-v2-panel"><h3>🔒 Reglas especiales</h3>'+
   '<strong>'+locked.length+' MVP bloqueados</strong><p>💎 '+bonus+' teracapturas extra pendientes</p>'+
   '<button type="button" data-v2-quick="tera">💎 Guía de teracapturas →</button>'+
   '<button type="button" data-v2-quick="rules">Consultar reglas →</button></article></div>'+
 '<article class="nav-v2-panel nav-v2-recent"><h3>📖 Últimos recuerdos</h3>'+
  (recent.length?recent.map(x=>'<p>'+escapeHtml(typeof x==="string"?x:x.text||x.message||x.title||"Actividad registrada")+'</p>').join(""):'<p>Todavía no hay recuerdos. Las capturas y victorias aparecerán en tu diario.</p>')+
  '<button type="button" data-v2-quick="diary">Abrir diario →</button></article>';
 dashboard.querySelectorAll("[data-v2-quick]").forEach(b=>b.onclick=()=>{
  const kind=b.dataset.v2Quick;
  if(kind==="capture"){
   tab="equipo";addMonExpanded=true;render();renderAddForm();
   document.getElementById("addMonPanel")?.scrollIntoView({behavior:"smooth",block:"start"});
   document.getElementById("addSpecies")?.focus();return;
  }
  if(kind==="team")return openPage("equipo");
  if(kind==="map")return openPage("mapa");
  if(kind==="diary")return openPage("diario");
  if(kind==="rules")return openPage("reglas");
  if(kind==="tera")return openPage("teracapturas");
  if(kind==="battle"){
   const next=B.findIndex((_b,i)=>!(run.bosses||[]).includes(i));
   tab="objetivos";
   if(next>=0&&typeof objectiveRegion==="function")region=objectiveRegion(next);
   render();
   if(next>=0&&typeof openFightBoss==="function")openFightBoss(next);
   document.getElementById("objetivos")?.scrollIntoView({behavior:"smooth",block:"start"});
  }
 });
}
function updateMenu(){
 const current=groups.find(g=>g.tabs.includes(tab))||groups[0];
 choices[current.id]=tab;
 primary.querySelectorAll("[data-nav-group]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.navGroup===current.id)));
 original.forEach(b=>{b.hidden=!current.tabs.includes(b.dataset.tab);b.setAttribute("aria-current",b.dataset.tab===tab?"page":"false")});
 secondary.hidden=current.tabs.length<2;
 dashboard.classList.toggle("on",tab==="inicio");
 if(tab==="inicio")drawDashboard();
}
const originalRender=render;
render=function(...args){const out=originalRender.apply(this,args);updateMenu();return out};
tab="inicio";
render();
})();