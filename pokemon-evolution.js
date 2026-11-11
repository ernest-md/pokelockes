/* PokéLockes — Pokémon evolution workflow and species sprite/Dex synchronization. */
(function(){
"use strict";
const editor=document.getElementById("monEditor");
if(!editor||typeof renderMons!=="function")return;
const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const normalize=v=>String(v||"").trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[\s._]+/g,"-").replace(/[^a-z0-9-]/g,"");
const speciesId=n=>{
 const matches=typeof IDS!=="undefined"?IDS:{};
 return Number(matches[n]||Object.entries(matches).find(([key])=>normalize(key)===normalize(n))?.[1])||null;
};
const title=v=>String(v||"").split("-").map(w=>w?String(w[0]).toUpperCase()+w.slice(1):"").join(" ");
const labelFor=(slug,id)=>{
 const known=typeof IDS!=="undefined"?Object.entries(IDS).find(([key,dex])=>Number(dex)===id&&normalize(key)===normalize(slug))?.[0]:null;
 return known||title(slug);
};
const fallback={
 "fletchling":[["Fletchinder",662,"Nivel 17"]],
 "fletchinder":[["Talonflame",663,"Nivel 35"]],
 "fuecoco":[["Crocalor",910,"Nivel 16"]],
 "crocalor":[["Skeledirge",911,"Nivel 36"]],
 "sprigatito":[["Floragato",907,"Nivel 16"]],
 "floragato":[["Meowscarada",908,"Nivel 36"]],
 "quaxly":[["Quaxwell",913,"Nivel 16"]],
 "quaxwell":[["Quaquaval",914,"Nivel 36"]],
 "charcadet":[["Armarouge",936,"Armadura auspiciosa"],["Ceruledge",937,"Armadura maldita"]],
 "pawmi":[["Pawmo",922,"Nivel 18"]],
 "pawmo":[["Pawmot",923,"Caminar 1000 pasos y subir un nivel"]],
 "lechonk":[["Oinkologne",916,"Nivel 18"]],
 "smoliv":[["Dolliv",929,"Nivel 25"]],
 "dolliv":[["Arboliva",930,"Nivel 35"]],
 "tinkatink":[["Tinkatuff",958,"Nivel 24"]],
 "tinkatuff":[["Tinkaton",959,"Nivel 38"]],
 "nacli":[["Naclstack",933,"Nivel 24"]],
 "naclstack":[["Garganacl",934,"Nivel 38"]],
 "fidough":[["Dachsbun",927,"Nivel 26"]],
 "greavard":[["Houndstone",972,"Nivel 30, de noche"]],
 "finizen":[["Palafin",964,"Nivel 38 en cooperativo"]],
 "capsakid":[["Scovillain",952,"Piedra Fuego"]],
 "flittle":[["Espathra",956,"Nivel 35"]],
 "rellor":[["Rabsca",954,"Caminar 1000 pasos y subir un nivel"]],
 "paldean-wooper":[["Clodsire",980,"Nivel 20"]],
 "eevee":[["Vaporeon",134,"Piedra Agua"],["Jolteon",135,"Piedra Trueno"],["Flareon",136,"Piedra Fuego"],["Espeon",196,"Amistad, de día"],["Umbreon",197,"Amistad, de noche"],["Leafeon",470,"Piedra Hoja"],["Glaceon",471,"Piedra Hielo"],["Sylveon",700,"Amistad y movimiento Hada"]]
};
const image=id=>Number(id)>0?"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/"+Number(id)+".png":"";
const activeMon=()=>run.mons.find(x=>x.id===monSelected)||null;
const details=raw=>{
 if(!raw)return "Consulta los requisitos en el juego";
 const segments=[];
 if(raw.min_level!=null)segments.push("Nivel "+raw.min_level);
 if(raw.item?.name)segments.push("Objeto: "+raw.item.name.replaceAll("-"," "));
 if(raw.held_item?.name)segments.push("Equipar: "+raw.held_item.name.replaceAll("-"," "));
 if(raw.min_happiness!=null)segments.push("Amistad");
 if(raw.min_affection!=null)segments.push("Afecto");
 if(raw.time_of_day)segments.push(raw.time_of_day==="day"?"De día":raw.time_of_day==="night"?"De noche":raw.time_of_day);
 if(raw.known_move?.name)segments.push("Movimiento: "+raw.known_move.name.replaceAll("-"," "));
 if(raw.known_move_type?.name)segments.push("Movimiento "+raw.known_move_type.name);
 if(raw.location?.name)segments.push("Lugar especial");
 if(raw.needs_overworld_rain)segments.push("Con lluvia");
 if(raw.trigger?.name==="trade")segments.push("Intercambio");
 if(raw.trigger?.name==="shed")segments.push("Evolución especial");
 if(raw.gender!=null)segments.push(raw.gender===1?"Hembra":"Macho");
 if(raw.relative_physical_stats!=null)segments.push("Condición de estadísticas");
 if(raw.party_type?.name)segments.push("Equipo de tipo "+raw.party_type.name);
 if(raw.turn_upside_down)segments.push("Condición especial de orientación");
 return segments.length?segments.join(" · "):"Evolución especial; comprueba condiciones";
};
const getJSON=async route=>{
 const controller=typeof AbortController!=="undefined"?new AbortController():null;
 const timer=setTimeout(()=>controller?.abort(),6000);
 try{
  const response=await fetch("https://pokeapi.co/api/v2/"+route,{signal:controller?.signal});
  if(!response.ok)throw Error("PokéAPI respondió "+response.status);
  return await response.json();
 }finally{clearTimeout(timer)}
};
const fallbackChoices=name=>(fallback[normalize(name)]||[]).map(([label,dex,requirement])=>({name:label,id:dex,requirement}));
const findNode=(node,id,slug)=>{
 if(!node)return null;
 const code=Number(node.species?.url?.match(/\/pokemon-species\/(\d+)\/?$/)?.[1]);
 if(code===id||(node.species?.name===slug))return node;
 for(const next of node.evolves_to||[]){
  const found=findNode(next,id,slug);
  if(found)return found;
 }
 return null;
};
async function choicesFor(mon){
 const id=speciesId(mon.name)||Number(mon.dexNumber)||null;
 const slug=normalize(mon.name);
 try{
  const species=await getJSON("pokemon-species/"+encodeURIComponent(id||slug)+"/");
  const evolutionId=Number(species.evolution_chain?.url?.match(/\/evolution-chain\/(\d+)\/?$/)?.[1]);
  if(!evolutionId)throw Error("No se encontró cadena evolutiva");
  const chain=await getJSON("evolution-chain/"+evolutionId+"/");
  const node=findNode(chain.chain,Number(species.id),species.name);
  if(!node)throw Error("No se ha encontrado la especie en la cadena");
  const options=(node.evolves_to||[]).map(child=>{
   const dest=Number(child.species.url?.match(/\/pokemon-species\/(\d+)\/?$/)?.[1]);
   if(!dest||dest>1499)return null;
   return {name:labelFor(child.species.name,dest),id:dest,requirement:(child.evolution_details||[]).map(details).filter(Boolean).join(" / ")||"Consulta los requisitos en el juego"};
  }).filter(Boolean);
  return {options,offline:false};
 }catch(e){
  const options=fallbackChoices(mon.name);
  if(options.length)return {options,offline:true};
  throw Error("No se pudo consultar la cadena evolutiva. Comprueba la conexión y el nombre de la especie.");
 }
}
let backdrop=null,opener=null;
function close(){
 if(!backdrop)return;
 backdrop.remove();backdrop=null;
 document.removeEventListener("keydown",onKey);
 if(opener?.isConnected)opener.focus();
 opener=null;
}
function onKey(e){if(e.key==="Escape")close()}
function drawChoice(item,mon){
 const src=image(item.id);
 return '<button type="button" data-evolve-id="'+item.id+'" class="poke-evo-choice">'+
  '<img src="'+escapeHtml(src)+'" alt="" loading="lazy" onerror="this.hidden=true">'+
  '<span><strong>'+escapeHtml(item.name)+'</strong><small>'+escapeHtml(item.requirement)+'</small></span>'+
  '<span aria-hidden="true">→</span></button>';
}
async function openEvolution(){
 const m=activeMon();
 if(!m)return;
 if(m.status==="baja"){alert("Este Pokémon figura como baja. Corrige su estado si se trata de un error antes de evolucionarlo.");return}
 const input=document.getElementById("editName");
 if(input && input.value.trim()!==m.name){alert("Guarda primero los cambios de especie de la ficha antes de evolucionar.");return}
 close();opener=document.activeElement;
 const key=m.id,previous=m.name;
 backdrop=document.createElement("div");backdrop.className="poke-evo-overlay";
 backdrop.innerHTML='<section class="poke-evo-dialog" role="dialog" aria-modal="true" aria-labelledby="pokeEvoTitle">'+
  '<button type="button" class="poke-evo-close" id="pokeEvoClose" aria-label="Cerrar">✕</button>'+
  '<span class="poke-evo-kicker">🔄 EVOLUCIÓN</span>'+
  '<h2 id="pokeEvoTitle">Evolucionar a '+escapeHtml(m.nickname||m.name)+'</h2>'+
  '<p>Especie actual: <strong>'+escapeHtml(m.name)+'</strong>. Elige la siguiente evolución. Se conservarán el apodo, la captura, el historial y su estado.</p>'+
  '<div id="pokeEvoOptions" aria-live="polite"><p>Consultando evoluciones…</p></div>'+
  '<p class="poke-evo-note">PokéLockes registra una evolución que ya has realizado en el juego. No comprueba automáticamente requisitos, versión ni reglas monotipo.</p>'+
  '</section>';
 document.body.appendChild(backdrop);
 backdrop.addEventListener("click",e=>{if(e.target===backdrop)close()});
 document.getElementById("pokeEvoClose").onclick=close;
 document.addEventListener("keydown",onKey);
 document.getElementById("pokeEvoClose").focus();
 const area=document.getElementById("pokeEvoOptions");
 try{
  const {options,offline}=await choicesFor(m);
  if(!area.isConnected)return;
  if(!options.length){area.innerHTML='<p class="poke-evo-empty">Esta especie no tiene evoluciones posteriores registradas.</p>';return}
  area.innerHTML=(offline?'<p class="poke-evo-warning">Sin conexión a PokéAPI: opciones básicas disponibles localmente. Verifica evoluciones especiales.</p>':"")+
    '<div class="poke-evo-list">'+options.map(opt=>drawChoice(opt,m)).join("")+'</div>';
  area.querySelectorAll("[data-evolve-id]").forEach(b=>b.onclick=()=>{
   const selected=options.find(option=>String(option.id)===b.dataset.evolveId);
   if(!selected)return;
   const current=run.mons.find(x=>x.id===key);
   if(!current||current.name!==previous){alert("La ficha ha cambiado desde que abriste la evolución. Vuelve a intentarlo.");close();return}
   if(!confirm("¿Registrar evolución de "+current.name+" a "+selected.name+"? Se conservarán el apodo y la captura original."))return;
   const old=current.name;
   current.name=selected.name;current.dexNumber=selected.id;delete current.dexLookedUp;
   const description="🔄 "+old+" → "+selected.name;
   pushJournal("🔄 "+(current.nickname||old)+" ha evolucionado de "+old+" a "+selected.name+".");
   if(typeof recordMonEvent==="function")recordMonEvent(current,"evolucion",description);
   save();close();render();
  });
 }catch(e){if(area.isConnected)area.innerHTML='<div class="poke-evo-error">'+escapeHtml(e.message)+'</div>'}
}
function enhance(){
 const area=editor.querySelector(".actions"),save=editor.querySelector("#saveMon");
 const input=editor.querySelector("#editName"),dex=editor.querySelector("#editDex");
 if(!area||!save||!input||!dex)return;
 if(!editor.querySelector("#evolveMon")){
  const button=document.createElement("button");
  button.id="evolveMon";button.type="button";button.className="poke-evo-button";button.textContent="🔄 Evolucionar";
  button.title="Consultar las evoluciones y actualizar el sprite automáticamente";
  const mon=activeMon();
  if(mon?.status==="baja")button.disabled=true;
  save.insertAdjacentElement("beforebegin",button);
  button.onclick=openEvolution;
 }
 input.addEventListener("input",()=>{
  const current=activeMon();
  if(!current)return;
  const newName=input.value.trim();
  if(normalize(newName)===normalize(current.name)){
   dex.value=String(speciesId(current.name)||current.dexNumber||"");return;
  }
  // An old stored species ID must never remain attached to a new species.
  dex.value=String(speciesId(newName)||"");
 });
}
const oldRenderMons=renderMons;
renderMons=function(...args){
 const value=oldRenderMons.apply(this,args);
 enhance();
 return value;
};
enhance();
window.PokeEvolution={choicesFor,open:openEvolution,close,speciesId,normalize};
})();
