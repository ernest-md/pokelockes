/* PokéLockes 2026 — carnet visual, seguimiento, resultados, MVP y exportación. */
(function(){
"use strict";
const hero=document.getElementById("trainerHero");
if(!hero||!window.PokeDiaryUpgrades)return;
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const type=typeof RUN_TYPE==="string"?RUN_TYPE:(location.pathname.match(/(?:^|\/)(fuego|planta|agua)\.html$/)?.[1]||"fuego");
const colors={
 normal:["#bdac8d","#fff0ce"],fuego:["#f38e5f","#ffd7ad"],agua:["#71baf7","#d5f0ff"],
 planta:["#76d3a4","#e0ffd7"],electrico:["#f5c751","#fff3ae"],hielo:["#8be0eb","#e6fcff"],
 lucha:["#eb9b75","#ffe0cd"],veneno:["#b58ae5","#e5ccff"],tierra:["#d1a56b","#f8e2b2"],
 volador:["#9aadeb","#e9e8ff"],psiquico:["#e891b7","#ffe0f1"],bicho:["#9ac869","#dff7ad"],
 roca:["#c1ac86","#eae1c4"],fantasma:["#9886d4","#d7c4ff"],dragon:["#839af2","#cbd7ff"],
 siniestro:["#9f95b3","#e8ddef"],acero:["#93bbc7","#e6f1f5"],hada:["#eda6c9","#ffe2f4"]
};
const [accent,light]=colors[type]||colors.normal;
const avatars=["🧢","🎒","⚔️","🏆","👑","🧙","🧑‍🚀","🥷","🐉","🦊","🌟","🎮"];
const trainer=()=>run.trainer&&typeof run.trainer==="object"?run.trainer:{};
const trainerName=()=>String(trainer().name||"Entrenador sin nombre").trim().slice(0,40)||"Entrenador sin nombre";
const motto=()=>String(trainer().motto||"Cada captura cuenta una historia.").trim().slice(0,120);
const team=()=>{
 const ids=Array.isArray(run.teamOrder)?run.teamOrder:[];
 return run.mons.filter(m=>m.status==="equipo")
 .map((m,i)=>({m,i,r:ids.indexOf(m.id)}))
 .sort((a,b)=>(a.r<0?999:a.r)-(b.r<0?999:b.r)||a.i-b.i).map(x=>x.m).slice(0,6);
};
const goals=()=>new Set((run.bosses||[]).map(Number).filter(Number.isInteger));
const achievements=()=>typeof getAchievements==="function"?getAchievements():[];
const nextGoal=()=>B.findIndex((b,i)=>!goals().has(i));
const mvpRanking=()=>{
 const counts=new Map();
 for(const b of run.battles||[]){
   if(b.result!=="victoria"||!b.mvpId)continue;
   const found=run.mons.find(m=>m.id===b.mvpId);
   const record=counts.get(b.mvpId)||{id:b.mvpId,mon:found,name:found?.nickname||found?.name||b.participants?.find(p=>p.id===b.mvpId)?.nickname||b.participants?.find(p=>p.id===b.mvpId)?.name||"Pokémon",wins:0};
   record.wins++;counts.set(b.mvpId,record);
 }
 return [...counts.values()].sort((a,b)=>b.wins-a.wins||a.name.localeCompare(b.name));
};
const locks=()=>Object.entries(run.challengeRules?.mvpLocks||{})
 .map(([id,value])=>({id,mon:run.mons.find(m=>m.id===id),...value})).filter(x=>!!x.mon);
const credits=()=>{
 if(window.PokeLockeRules?.credits)return window.PokeLockeRules.credits();
 const used=new Set([...Object.keys(run.challengeRules?.teraUsed||{}).map(Number),...run.mons.filter(m=>m.teraBonus?.bossId!=null).map(m=>Number(m.teraBonus.bossId))]);
 return {earned:goals().size,used:used.size,available:Math.max(0,goals().size-used.size)};
};
const getTheme=()=>goals().size>=30?"legend":goals().size>=12?"elite":"starter";
const face=()=>{
 const index=Math.max(0,avatars.indexOf(trainer().avatar));
 const skin=["#eac09b","#bf8a6a","#f2c8a9","#c78d66"][index%4];
 const hair=["#3a2b3d","#603d31","#202331","#7c513b","#443449"][index%5];
 const coat=["#244561","#54406b","#315d62","#633b43"][index%4];
 const cap=index%3===0 || index===7;
 const hat=cap?'<path d="M28 65 Q35 26 71 28 Q101 29 105 67 Q78 75 27 68 Z" fill="'+hair+'"/><path d="M24 63 Q70 51 116 63 L117 72 Q62 81 24 72 Z" fill="'+accent+'"/><path d="M56 43 Q69 33 82 44" fill="none" stroke="'+light+'" stroke-width="4" stroke-linecap="round"/>':
  '<path d="M31 69 Q24 25 66 23 Q117 20 108 77 L99 56 Q78 53 72 39 Q55 64 38 61 Z" fill="'+hair+'"/>';
 const glasses=index===7||index===2?'<rect x="46" y="76" width="20" height="13" rx="4" fill="none" stroke="#17253a" stroke-width="3"/><rect x="75" y="76" width="20" height="13" rx="4" fill="none" stroke="#17253a" stroke-width="3"/><path d="M66 80 H75" stroke="#17253a" stroke-width="3"/>':"";
 return '<svg viewBox="0 0 140 166" role="img" aria-label="Retrato ilustrado de entrenador" xmlns="http://www.w3.org/2000/svg">'+
 '<defs><linearGradient id="tcportrait" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+accent+'"/><stop offset="1" stop-color="#182941"/></linearGradient></defs>'+
 '<rect width="140" height="166" fill="url(#tcportrait)"/><circle cx="108" cy="29" r="30" fill="#ffffff" opacity=".12"/>'+
 '<path d="M-20 165 Q-5 111 39 113 L49 116 L94 116 Q145 115 162 165 Z" fill="'+coat+'"/>'+
 '<path d="M55 110 L83 110 L87 142 L51 142 Z" fill="'+skin+'"/>'+
 '<path d="M38 69 Q39 42 71 42 Q104 42 105 77 L100 100 Q92 121 70 121 Q49 121 42 100 Z" fill="'+skin+'"/>'+
 '<path d="M44 88 Q52 83 60 88 M80 88 Q88 83 96 88" stroke="'+hair+'" stroke-width="3" stroke-linecap="round" fill="none"/>'+
 '<circle cx="55" cy="89" r="2.6" fill="#17263d"/><circle cx="88" cy="89" r="2.6" fill="#17263d"/>'+
 '<path d="M66 105 Q71 109 77 104" fill="none" stroke="#8e584b" stroke-width="2.5" stroke-linecap="round"/>'+
 hat+glasses+
 '<path d="M69 143 L55 166 L39 120 L48 116 Z M70 143 L84 166 L104 118 L92 114 Z" fill="#ffffff" opacity=".15"/>'+
 '<circle cx="111" cy="130" r="10" fill="#f0f3f7"/><path d="M101 129 H121" stroke="#263549" stroke-width="2"/>'+
 '<circle cx="111" cy="130" r="4" fill="'+accent+'" stroke="#263549" stroke-width="2"/>'+
 '</svg>';
};
const selectedAvatar=()=>{
 const catalog=window.PokeTrainerAvatars||{list:[],legacy:{}};
 const chosen=catalog.legacy?.[trainer().avatar]||trainer().avatar;
 return catalog.list.find(item=>item.id===chosen)||catalog.list[0]||null;
};
const avatarMarkup=()=>{
 const item=selectedAvatar();
 if(!item)return '<span class="tc-trainer-fallback">POKÉ</span>';
 const style=window.PokeTrainerAvatars?.style?.(item)||"";
 return '<span class="poke-avatar-frame" style="'+esc(style)+'">'+
   '<img class="tc-trainer-image" data-avatar-image="'+esc(item.id)+'" src="'+esc(item.src)+'" alt="'+esc(item.label)+'" loading="eager" referrerpolicy="no-referrer">'+
   (item.stamp?'<span class="poke-avatar-stamp">'+esc(item.stamp)+'</span>':'')+'</span>';
};
const sprite=mon=>mon&&typeof pokemonSprite==="function"?pokemonSprite(mon):null;
const edition=()=>run.gameVersion==="purpura"?"Púrpura":"Escarlata";
const bossDetails=id=>{
 if(id<0)return {name:"Todos los objetivos superados",category:"¡Campeón!",level:null,region:"Todas"};
 const b=B[id]||[];
 const regionName=typeof objectiveRegion==="function"?({paldea:"Paldea",kitakami:"Noroteo",terra:"Biodomo"}[objectiveRegion(id)]||"Paldea"):"Paldea";
 return {name:id===12?(run.gameVersion==="purpura"?"Ferrodada":"Colmilargo"):String(b[0]||"Objetivo"),category:String(b[1]||"Jefe"),level:Number.isFinite(b[3])?b[3]:null,region:regionName};
};
function draw(){
 const total=B.length,done=goals().size;
 const cap=credits(),rank=mvpRanking(),lock=locks(),next=nextGoal(),objective=bossDetails(next);
 const teamMons=team();
 const items=Array.from({length:6},(_,i)=>{
   const m=teamMons[i];
   if(!m)return '<div class="tc-squad-member empty" aria-label="Hueco libre"><span>＋</span><small>Libre</small></div>';
   const pic=sprite(m);
   return '<button class="tc-squad-member" type="button" data-pro-mon="'+esc(m.id)+'" title="Abrir la ficha de '+esc(m.nickname||m.name)+'">'+
   (m.isShiny?'<span class="tc-squad-shiny" aria-label="Shiny">✨</span>':'')+
   (pic?'<img src="'+esc(pic)+'" loading="lazy" alt="">':'<span>◉</span>')+
   '<strong>'+esc(m.nickname||m.name)+'</strong><small>Nv. '+esc(m.level||"?")+'</small></button>';
 }).join("");
 const unlocked=achievements().filter(a=>a.unlocked).length;
 const tier=getTheme();
 hero.className="trainer-banner trainer-pro";hero.dataset.tier=tier;
 hero.style.setProperty("--trainer-accent",accent);hero.style.setProperty("--trainer-alt",light);
 hero.innerHTML=
 '<div class="tc-top"><div class="tc-profile">'+
 '<div class="tc-portrait">'+avatarMarkup()+'</div>'+
 '<div class="tc-identity"><div class="tc-eyebrow">'+esc(TYPE_EMOJI)+' RETO MONOTIPO · '+esc(TYPE_NAME)+'</div>'+
 '<h2>'+esc(trainerName())+'</h2><p class="tc-motto">'+esc(motto())+'</p>'+
 '<div class="tc-chips"><span class="tc-chip tint">🎮 '+esc(edition())+'</span>'+
 '<span class="tc-chip">⚔️ '+teamMons.length+'/6 equipo</span>'+
 '<span class="tc-chip">🏅 '+unlocked+' logros</span>'+
 (tier==="legend"?'<span class="tc-chip tint">✦ Leyenda</span>':tier==="elite"?'<span class="tc-chip tint">✦ Élite</span>':'')+
 '</div></div></div><div class="tc-intel">'+
 '<div class="tc-intel-item highlight"><small>🎯 Siguiente objetivo sugerido</small><strong>'+esc(objective.name)+'</strong>'+
 '<p>'+esc(objective.category)+' · '+esc(objective.region)+(objective.level?' · Nv. '+objective.level:'')+'</p></div>'+
 '<div class="tc-intel-item"><small>🔒 MVP en descanso</small><strong>'+esc(lock.length?lock.map(x=>x.mon.nickname||x.mon.name).join(", "):"Ninguno")+'</strong>'+
 '<p>'+esc(lock.length?'Disponible tras superar otro objetivo':'Sin bloqueos activos')+'</p></div>'+
 '<div class="tc-intel-item"><small>💎 Teracapturas extra</small><strong>'+cap.available+' disponibles</strong>'+
 '<p>'+cap.used+' usadas · '+cap.earned+' objetivos conseguidos</p></div>'+
 '<div class="tc-intel-item"><small>🌟 Más MVP</small><strong>'+esc(rank[0]?.name||"Todavía ninguno")+'</strong>'+
 '<p>'+esc(rank[0]?rank[0].wins+' victoria'+(rank[0].wins===1?'':'s')+' como MVP':'Registra el primer combate')+'</p></div>'+
 '</div></div>'+
 '<div class="tc-center"><div class="tc-section-head"><strong>🏆 Progreso de la aventura</strong><span>'+done+' / '+total+' objetivos · '+(total?Math.round(done/total*100):0)+'%</span></div>'+
 '<div class="tc-progress" role="progressbar" aria-valuemin="0" aria-valuemax="'+total+'" aria-valuenow="'+done+'"><span style="width:'+Math.min(100,Math.round(done/Math.max(total,1)*100))+'%"></span></div>'+
 '<div class="tc-section-head"><strong>⚔️ Equipo titular</strong><span>Haz clic en un Pokémon para abrir su ficha</span></div>'+
 '<div class="tc-squad">'+items+'</div></div>'+
 '<div class="tc-foot"><div class="tc-metrics">'+
 '<div class="tc-metric"><strong>'+run.mons.filter(m=>m.status!=="baja").length+'</strong><small>Supervivientes</small></div>'+
 '<div class="tc-metric"><strong>'+run.mons.filter(m=>m.status==="baja").length+'</strong><small>Bajas</small></div>'+
 '<div class="tc-metric"><strong>'+run.mons.filter(m=>m.isShiny||m.shiny).length+'</strong><small>Shinies</small></div>'+
 '<div class="tc-metric"><strong>'+done+'</strong><small>Objetivos</small></div></div>'+
 '<div class="tc-actions"><button id="trainerEditBtn" type="button" class="primary">✎ Personalizar</button>'+
 '<button id="trainerHistoryBtn" type="button">↶ Historial</button>'+
 '<button id="trainerTeamBtn" type="button">⚔️ Equipo</button>'+
 '<button id="trainerShareBtn" type="button">⬇ Tarjeta PNG</button></div></div>';
 document.getElementById("trainerEditBtn").onclick=window.PokeDiaryUpgrades.openTrainerEditor;
 document.getElementById("trainerHistoryBtn").onclick=window.PokeDiaryUpgrades.openHistory;
 document.getElementById("trainerTeamBtn").onclick=()=>{tab="equipo";render();document.getElementById("equipo")?.scrollIntoView({behavior:"smooth",block:"start"})};
 document.getElementById("trainerShareBtn").onclick=exportCard;
 hero.querySelectorAll("[data-pro-mon]").forEach(b=>b.onclick=()=>{
   monSelected=b.dataset.proMon;tab="equipo";render();
   document.getElementById("equipo")?.scrollIntoView({behavior:"smooth",block:"start"});
 });
 const panelId="trainerProgressExtras";
 let panel=document.getElementById(panelId);
 if(!panel){panel=document.createElement("section");panel.id=panelId;hero.insertAdjacentElement("afterend",panel);}
 panel.className="tc-extra-grid";
 const top=rank.slice(0,5);
 const mvpRows=top.length?top.map((r,i)=>{
   const image=sprite(r.mon);
   return '<div class="tc-mvp-row"><div class="tc-mvp-pill">'+
     '<span class="tc-chip">'+(i+1)+'</span>'+
     (image?'<img loading="lazy" src="'+esc(image)+'" alt="">':'⭐')+
     '<strong>'+esc(r.name)+'</strong></div><small>'+r.wins+' MVP</small></div>';
 }).join(""):'<div class="tc-empty">Todavía no hay victorias con MVP.</div>';
 const recent=achievements().filter(a=>a.unlocked).slice(-8).reverse();
 const recentMon=[...run.mons].reverse()[0];
 const recentDead=[...run.mons].reverse().find(m=>m.status==="baja");
 const recentGoal=[...run.battles].reverse().find(b=>b.result==="victoria"&&goals().has(Number(b.boss)));
 const moments='<div class="tc-moments">'+
  '<div>🎒 Última captura <strong>'+esc(recentMon?recentMon.nickname||recentMon.name:"Ninguna")+'</strong></div>'+
  '<div>💀 Última baja <strong>'+esc(recentDead?recentDead.nickname||recentDead.name:"Ninguna")+'</strong></div>'+
  '<div>🏆 Última victoria <strong>'+esc(recentGoal?bossDetails(Number(recentGoal.boss)).name:"Ninguna registrada")+'</strong></div></div>';
 const medalRows=recent.length?recent.map(a=>
   '<div class="tc-mini-medal" title="'+esc(a.name)+' · '+esc(a.description)+'"><span>'+esc(a.icon)+'</span><small>✓</small></div>').join("")+
   Array.from({length:Math.max(0,5-recent.length)},()=>'<div class="tc-mini-medal locked" title="Logro pendiente"><span>🏅</span><small>🔒</small></div>').join(""):
   Array.from({length:5},()=>'<div class="tc-mini-medal locked" title="Logro pendiente"><span>🏅</span><small>🔒</small></div>').join("");
 panel.innerHTML='<article class="tc-extra-panel"><h3>🌟 Ranking de MVP de la run</h3>'+
   mvpRows+'<p class="tc-hint">Se contabilizan los MVP de victorias registradas. Las rotaciones obligatorias no suman MVP adicionales.</p></article>'+
   '<article class="tc-extra-panel"><h3>🏅 Vitrina de logros</h3><div class="tc-mini-medals">'+medalRows+'</div>'+
   '<p class="tc-hint">'+unlocked+' de '+achievements().length+' logros desbloqueados. '+(next<0?'¡Ya has completado todos los objetivos!':'Siguiente objetivo sugerido: '+esc(objective.name)+'.')+'</p>'+moments+
   '<button type="button" id="trainerNextObjective" class="ghost">🏆 Ver próximo objetivo</button></article>';
 document.getElementById("trainerNextObjective").onclick=()=>{
   tab="objetivos";
   if(next>=0&&typeof objectiveRegion==="function")region=objectiveRegion(next);
   render();
   if(next>=0&&typeof openFightBoss==="function")openFightBoss(next);
   document.getElementById("objetivos")?.scrollIntoView({behavior:"smooth",block:"start"});
 };
}
function showVictory(id){
 if(document.getElementById("tcVictoryShade"))return;
 const fight=[...(run.battles||[])].reverse().find(b=>Number(b.boss)===id&&b.result==="victoria");
 const name=bossDetails(id),mvp=fight?.mvpId?run.mons.find(m=>m.id===fight.mvpId):null;
 const fallen=fight?.participants?.filter(p=>p.fallen)||[];
 const currentLock=locks().find(x=>x.id===fight?.mvpId);
 const cap=credits();
 const overlay=document.createElement("div");overlay.id="tcVictoryShade";overlay.className="tc-victory-shade";
 overlay.innerHTML='<div class="tc-victory-modal" role="dialog" aria-modal="true" aria-labelledby="tcVictoryTitle">'+
  '<div class="tc-victory-kicker">✦ OBJETIVO SUPERADO ✦</div><h2 id="tcVictoryTitle">🏆 '+esc(name.name)+'</h2>'+
  '<p>Victoria registrada. Estos son los pasos para preparar el siguiente combate:</p>'+
  '<div class="tc-victory-facts">'+
   '<div><strong>'+esc(mvp?.nickname||mvp?.name||"Sin MVP")+'</strong><small>⭐ MVP de la victoria</small></div>'+
   '<div><strong>'+fallen.length+' bajas</strong><small>💀 Durante el combate</small></div>'+
   '<div><strong>'+(currentLock?'En reserva':'Revisar')+'</strong><small>🔒 Rotación del MVP</small></div>'+
   '<div><strong>+'+cap.available+' disponibles</strong><small>💎 Teracapturas extra</small></div></div>'+
  '<div class="tc-victory-next-steps">'+
   '<div><b>1</b><span><strong>Rotación del MVP</strong><small>'+(currentLock?esc(currentLock.mon.nickname||currentLock.mon.name)+' ya está bloqueado en reserva.':'Comprueba la rotación obligatoria del MVP.')+'</small></span></div>'+
   '<div><b>2</b><span><strong>Completar el equipo</strong><small>'+team().length+'/6 Pokémon titulares. Puedes elegir un sustituto desde las cajas.</small></span></div>'+
   '<div><b>3</b><span><strong>Captura extra de teratipo</strong><small>Úsala ahora o acumúlala para más adelante.</small></span></div></div>'+
  '<div class="tc-victory-actions"><button type="button" id="tcVictoryTeam">📦 Elegir sustituto</button>'+
   '<button type="button" id="tcVictoryTera" '+(cap.available<1?'disabled':'')+'>💎 Ver teracapturas</button>'+
   '<button type="button" id="tcVictoryClose">Continuar aventura →</button></div></div>';
 document.body.appendChild(overlay);
 const key=e=>{if(e.key==="Escape")close()};
 const close=()=>{overlay.remove();document.removeEventListener("keydown",key)};
 const jump=(target)=>{close();tab=target;render();document.getElementById(target)?.scrollIntoView({behavior:"smooth",block:"start"})};
 document.getElementById("tcVictoryTeam").onclick=()=>jump("equipo");
 document.getElementById("tcVictoryTera").onclick=()=>{
   close();
   if(window.PokeTeraGuide?.open)window.PokeTeraGuide.open();
   else jump("objetivos");
 };
 document.getElementById("tcVictoryClose").onclick=()=>{
   close();tab="objetivos";const next=nextGoal();
   if(next>=0&&typeof objectiveRegion==="function")region=objectiveRegion(next);
   render();
   if(next>=0&&typeof openFightBoss==="function")openFightBoss(next);
   document.getElementById("objetivos")?.scrollIntoView({behavior:"smooth",block:"start"});
 };
 overlay.addEventListener("click",e=>{if(e.target===overlay)close()});
 document.addEventListener("keydown",key);
 document.getElementById("tcVictoryTeam").focus();
}
function drawCanvasPortrait(ctx,x,y,w,h){
 const idx=Math.max(0,avatars.indexOf(trainer().avatar));
 ctx.save();ctx.fillStyle=accent;ctx.fillRect(x,y,w,h);
 ctx.fillStyle="#20344e";ctx.beginPath();ctx.ellipse(x+w*.5,y+h*1.02,w*.55,h*.36,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=["#eac09b","#bf8a6a","#f2c8a9","#c78d66"][idx%4];ctx.beginPath();ctx.ellipse(x+w*.5,y+h*.51,w*.27,h*.30,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=["#3a2b3d","#603d31","#202331"][idx%3];ctx.beginPath();ctx.ellipse(x+w*.5,y+h*.28,w*.34,h*.16,0,Math.PI,Math.PI*2);ctx.fill();
 ctx.fillStyle="#243653";ctx.fillRect(x+w*.17,y+h*.73,w*.66,h*.3);
 ctx.fillStyle="#15253b";ctx.beginPath();ctx.arc(x+w*.40,y+h*.52,2.6,0,Math.PI*2);ctx.arc(x+w*.60,y+h*.52,2.6,0,Math.PI*2);ctx.fill();
 ctx.restore();
}
async function fetchSprite(url){
 if(!url)return null;
 return await new Promise(resolve=>{
   const img=new Image();img.crossOrigin="anonymous";
   const timeout=setTimeout(()=>resolve(null),2500);
   img.onload=()=>{clearTimeout(timeout);resolve(img)};
   img.onerror=()=>{clearTimeout(timeout);resolve(null)};
   img.src=url;
 });
}
async function exportCard(){
 const button=document.getElementById("trainerShareBtn");
 if(button){button.disabled=true;button.textContent="Generando PNG…";}
 try{
   const canvas=document.createElement("canvas");canvas.width=1200;canvas.height=675;
   const ctx=canvas.getContext("2d");if(!ctx)throw Error("El navegador no permite generar imágenes.");
   const fill=(x,y,w,h,col)=>{ctx.fillStyle=col;ctx.fillRect(x,y,w,h)};
   const words=(value,x,y,size,col="#fff",weight="700")=>{ctx.font=weight+" "+size+"px system-ui, sans-serif";ctx.fillStyle=col;ctx.fillText(String(value),x,y)};
   const panel=(x,y,w,h)=>{ctx.fillStyle="#1b2b43";ctx.beginPath();ctx.roundRect(x,y,w,h,13);ctx.fill()};
   const bg=ctx.createLinearGradient(0,0,1200,675);bg.addColorStop(0,"#253c55");bg.addColorStop(1,"#0d172b");
   fill(0,0,1200,675,bg);fill(0,0,1200,12,accent);
   const avatar=selectedAvatar();
   const picture=await fetchSprite(avatar?.src)||(avatar?.fallbackSrc?await fetchSprite(avatar.fallbackSrc):null);
   const faceX=55,faceY=83,faceSize=185;
   fill(faceX,faceY,faceSize,faceSize,"#17304a");
   if(picture){
     // Match the live selector framing when exporting the PNG.
     const zoom=Math.max(1,Math.min(2.5,Number(avatar.zoom||1)));
     const cover=avatar.fit!=="contain";
     const ratio=(cover?Math.max(faceSize/picture.width,faceSize/picture.height):Math.min(faceSize/picture.width,faceSize/picture.height))*zoom;
     const w=picture.width*ratio,h=picture.height*ratio;
     const fx=Math.max(0,Math.min(1,Number(avatar.focusX??50)/100));
     const fy=Math.max(0,Math.min(1,Number(avatar.focusY??0)/100));
     ctx.save();ctx.beginPath();ctx.rect(faceX,faceY,faceSize,faceSize);ctx.clip();
     ctx.imageSmoothingEnabled=true;
     ctx.drawImage(picture,faceX+(faceSize-w)*fx,faceY+(faceSize-h)*fy,w,h);
     ctx.restore();
   }else words(trainerName().slice(0,1).toUpperCase(),110,203,60,"#fff","900");
   if(avatar?.stamp){
     const label=String(avatar.stamp).toUpperCase();
     fill(faceX+3,faceY+faceSize-34,faceSize-6,29,"#a72a45");
     const fontSize=label.length>21?11:label.length>15?13:16;
     ctx.font="900 "+fontSize+"px system-ui,sans-serif";ctx.fillStyle="#fff";
     ctx.textAlign="center";ctx.fillText(label,faceX+faceSize/2,faceY+faceSize-14,faceSize-12);ctx.textAlign="left";
   }
   words(TYPE_EMOJI+" RETO MONOTIPO "+TYPE_NAME.toUpperCase(),270,105,17,light,"900");
   words(trainerName().slice(0,23),270,166,43,"#ffffff","900");
   words(motto().slice(0,55),272,205,17,"#b6c9dd","500");
   words("Pokémon "+edition()+"  ·  "+goals().size+"/"+B.length+" objetivos",272,249,17,"#d3e4f5","700");
   const progress=Math.round(goals().size/B.length*100);
   panel(270,278,845,20);fill(274,282,Math.max(0,Math.min(837,837*progress/100)),12,accent);
   words("EQUIPO TITULAR",55,383,21,light,"900");
   const squad=team();
   for(let i=0;i<6;i++){
     const x=55+i*184;panel(x,403,172,161);
     const m=squad[i];
     if(m){
       const spriteImg=await fetchSprite(sprite(m));
       if(spriteImg)ctx.drawImage(spriteImg,x+44,413,86,86);
       else words("◉",x+73,469,27,light);
       words((m.nickname||m.name).slice(0,15),x+12,531,14,"#fff","800");
       words("Nv. "+(m.level||"?")+(m.isShiny?"  ✨":""),x+12,550,12,"#acc7e4","500");
     }else words("＋",x+71,487,28,"#7a8ca9","500");
   }
   words("SUPERVIVIENTES  "+run.mons.filter(m=>m.status!=="baja").length,55,615,18,"#d9eaf8");
   words("BAJAS  "+run.mons.filter(m=>m.status==="baja").length,365,615,18,"#d9eaf8");
   words("SHINIES  "+run.mons.filter(m=>m.isShiny||m.shiny).length,610,615,18,"#d9eaf8");
   words("TERACAPTURAS  "+credits().available,825,615,18,light);
   words("POKÉLOCKES",55,655,12,"#b3c8df","900");
   const blob=await new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error("No se pudo crear el PNG")),"image/png"));
   const url=URL.createObjectURL(blob);
   const a=document.createElement("a");a.href=url;
   a.download="Pokelockes_"+type+"_"+edition().toLowerCase()+"_trainer-card.png";
   a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
 }catch(e){alert("No se pudo exportar la tarjeta: "+e.message);}
 finally{if(button){button.disabled=false;button.textContent="⬇ Tarjeta PNG";}}
}
let tracked=new Set(goals());
const previousSave=save;
save=function(...args){
 const now=goals(),fresh=[...now].filter(id=>!tracked.has(id));
 const ret=previousSave.apply(this,args);
 tracked=new Set(now);
 if(fresh.length)setTimeout(()=>showVictory(fresh[fresh.length-1]),0);
 return ret;
};
const previousRender=render;
render=function(...args){
 const ret=previousRender.apply(this,args);
 draw();
 tracked=new Set(goals());
 return ret;
};
draw();
window.PokeTrainerPro={draw,nextGoal,mvpRanking,exportCard,showVictory,credits};
})();