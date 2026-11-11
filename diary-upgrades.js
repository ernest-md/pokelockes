/* PokéLockes — Entrenador, equipo y restauración de versiones compartidas. */
(function () {
  "use strict";
  const hero = document.getElementById("trainerHero");
  const teamView = document.getElementById("teamShowcase");
  const overlay = document.getElementById("pokeUpgradeModal");
  if (!hero || !teamView || !overlay) return;

  const type = typeof RUN_TYPE !== "undefined" ? RUN_TYPE :
    (location.pathname.match(/(?:^|\/)(fuego|planta|agua)\.html$/)?.[1] || "fuego");
  const typeColor = (window.POKE_TYPES?.meta?.[type]?.color ||
    { fuego:"#ff965b",planta:"#7fd5a1",agua:"#78b9f9" }[type] || "#d3b3ff");
  const avatarData=window.PokeTrainerAvatars||{list:[],legacy:{},defaultId:"red"};
  const avatars=avatarData.list;
  const getAvatar=id=>avatars.find(item=>item.id===id)||avatars.find(item=>item.id===avatarData.legacy?.[id])||avatars[0];

  let dialogOpener = null;
  let dragId = null;

  const safe = value => String(value ?? "").replace(/[&<>"']/g,
    c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const getTrainer = () => (run && run.trainer && typeof run.trainer === "object") ? run.trainer : {};
  const chosenAvatar = () => getAvatar(getTrainer().avatar)?.id || "red";
  const currentEdition = () => run.gameVersion === "purpura" ? "Púrpura" : "Escarlata";

  function orderedTeam() {
    const original = run.mons.filter(m => m.status === "equipo");
    const rank = Array.isArray(run.teamOrder) ? run.teamOrder : [];
    return original.map((m,i) => ({m,i,r:rank.indexOf(m.id)}))
      .sort((a,b) => (a.r<0?999:a.r)-(b.r<0?999:b.r) || a.i-b.i).map(x=>x.m);
  }

  function renderTrainer() {
    const trainer = getTrainer(), alive = run.mons.filter(m => m.status !== "baja").length;
    const deaths = run.mons.filter(m => m.status === "baja").length;
    const shiny = run.mons.filter(m => m.isShiny || m.shiny).length;
    const goals = new Set(run.bosses || []).size;
    const name = (typeof trainer.name === "string" && trainer.name.trim()) ?
      trainer.name.slice(0,40) : "Entrenador sin nombre";
    const motto = (typeof trainer.motto === "string" && trainer.motto.trim()) ?
      trainer.motto.slice(0,120) : "Cada captura cuenta una historia.";
    hero.style.setProperty("--trainer-accent",typeColor);
    hero.innerHTML = '<div class="trainer-avatar" aria-hidden="true">'+safe(chosenAvatar())+'</div>'+
      '<div class="trainer-main"><span class="trainer-eyebrow">'+safe(TYPE_EMOJI)+' RETO MONOTIPO '+safe(TYPE_NAME)+'</span>'+
      '<h2>'+safe(name)+'</h2><p class="trainer-motto">'+safe(motto)+'</p>'+
      '<div class="trainer-tags"><span class="trainer-tag">🎮 '+safe(currentEdition())+'</span>'+
      '<span class="trainer-tag">⚔️ '+orderedTeam().length+'/6 en el equipo</span>'+
      '<span class="trainer-tag">🗺️ 53 zonas</span></div></div>'+
      '<div class="trainer-stats" aria-label="Resumen de la aventura">'+
      '<div class="trainer-stat"><strong>'+alive+'</strong><small>Supervivientes</small></div>'+
      '<div class="trainer-stat"><strong>'+goals+'</strong><small>Objetivos</small></div>'+
      '<div class="trainer-stat"><strong>'+deaths+'</strong><small>Bajas</small></div>'+
      '<div class="trainer-stat"><strong>'+shiny+'</strong><small>Shinies</small></div></div>'+
      '<div class="trainer-actions"><button id="trainerEditBtn" type="button">✎ Personalizar</button>'+
      '<button id="trainerHistoryBtn" type="button">↶ Historial</button>'+
      '<button id="trainerTeamBtn" type="button">⚔️ Ver equipo</button></div>';
    document.getElementById("trainerEditBtn").onclick = openTrainerEditor;
    document.getElementById("trainerHistoryBtn").onclick = openHistory;
    document.getElementById("trainerTeamBtn").onclick = () => {
      tab = "equipo"; render();
      document.getElementById("equipo")?.scrollIntoView({behavior:"smooth",block:"start"});
    };
  }

  function renderTeam() {
    const team = orderedTeam();
    const card = (m, i) => {
      const label = safe(m.nickname || m.name);
      const species = safe(m.name || "Sin especie");
      const sprite = pokemonSprite(m);
      return '<article class="team-showcase-card'+(m.id===monSelected?' is-selected':'')+
        '" draggable="true" data-team-id="'+safe(m.id)+'" role="listitem">'+
        '<button type="button" class="team-card-open" data-team-open="'+safe(m.id)+
        '" aria-label="Abrir ficha de '+label+'"></button>'+
        '<div class="team-card-sprite">'+(sprite?'<img src="'+safe(sprite)+'" alt="" loading="lazy">':'🔴')+'</div>'+
        '<div class="team-card-detail"><strong class="team-card-name">'+label+
        (m.isShiny?' ✨':'')+'</strong><span class="team-card-species">'+species+
        '</span><span class="team-card-level">Nv. '+safe(m.level || "?")+'</span></div>'+
        '<div class="team-card-actions"><button type="button" data-team-move="'+safe(m.id)+
        '" data-step="-1" title="Subir posición" aria-label="Mover '+label+' hacia arriba" '+(i===0?'disabled':'')+
        '>←</button><button type="button" data-team-move="'+safe(m.id)+
        '" data-step="1" title="Bajar posición" aria-label="Mover '+label+' hacia abajo" '+(i===team.length-1?'disabled':'')+
        '>→</button></div></article>';
    };
    teamView.innerHTML='<div class="team-showcase-title"><h3>⚔️ Equipo titular · '+team.length+
      '/6</h3><small>Arrastra para reordenar o usa las flechas (también en móvil)</small></div>'+
      '<div class="team-card-grid" role="list">'+
      Array.from({length:6},(_,i)=>team[i]?card(team[i],i):
        '<div class="team-showcase-card is-empty" role="listitem"><span class="team-card-empty-icon">＋</span> Hueco libre</div>').join("")+
      '</div>';
    teamView.querySelectorAll("[data-team-open]").forEach(el=>el.onclick=()=>{
      monSelected=el.dataset.teamOpen;tab="equipo";render();
      document.getElementById("monEditor")?.scrollIntoView({behavior:"smooth",block:"nearest"});
    });
    teamView.querySelectorAll("[data-team-move]").forEach(el=>el.onclick=e=>{
      e.stopPropagation();
      const list=orderedTeam().map(m=>m.id);
      const a=list.indexOf(el.dataset.teamMove), b=a+Number(el.dataset.step);
      if(a<0||b<0||b>=list.length)return;
      [list[a],list[b]]=[list[b],list[a]];
      run.teamOrder=list;save();render();
    });
    teamView.querySelectorAll("[data-team-id]").forEach(el=>{
      el.addEventListener("dragstart",e=>{
        dragId=el.dataset.teamId;
        el.classList.add("is-dragging");
        if(e.dataTransfer){e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",dragId);}
      });
      el.addEventListener("dragover",e=>{
        e.preventDefault();el.classList.add("is-over");
        if(e.dataTransfer)e.dataTransfer.dropEffect="move";
      });
      el.addEventListener("dragleave",()=>el.classList.remove("is-over"));
      el.addEventListener("dragend",()=>{
        dragId=null;
        teamView.querySelectorAll(".team-showcase-card").forEach(x=>x.classList.remove("is-over","is-dragging"));
      });
      el.addEventListener("drop",e=>{
        e.preventDefault();
        const source=dragId || e.dataTransfer?.getData("text/plain");
        const target=el.dataset.teamId;
        const order=orderedTeam().map(m=>m.id);
        const a=order.indexOf(source), b=order.indexOf(target);
        dragId=null;
        if(a<0||b<0||a===b)return;
        order.splice(a,1);order.splice(b,0,source);
        run.teamOrder=order;save();render();
      });
    });
  }

  function closeDialog(){
    overlay.hidden=true;overlay.innerHTML="";
    document.body.style.removeProperty("overflow");
    if(dialogOpener && dialogOpener.isConnected)dialogOpener.focus();
    dialogOpener=null;
  }
  overlay.addEventListener("click",e=>{
    if(e.target===overlay||e.target.closest("[data-pu-close]"))closeDialog();
  });
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape" && !overlay.hidden)closeDialog();
  });
  function openDialog(title,description,contents){
    dialogOpener=document.activeElement;
    overlay.innerHTML='<div class="poke-upgrade-dialog" role="dialog" aria-modal="true" aria-labelledby="puTitle">'+
      '<button type="button" class="pu-close" data-pu-close aria-label="Cerrar">✕</button>'+
      '<h2 id="puTitle">'+safe(title)+'</h2><p>'+safe(description)+'</p>'+contents+'</div>';
    overlay.hidden=false;document.body.style.overflow="hidden";
    overlay.querySelector("[data-pu-close]")?.focus();
  }

  function openTrainerEditor(){
    const trainer=getTrainer();
    let avatar=chosenAvatar();
    openDialog("Tu tarjeta de entrenador","Personaliza el aspecto de esta run. Los cambios serán visibles para todos los jugadores con acceso.",
      '<form id="puTrainerForm">'+
      '<label for="puTrainerName">Nombre del entrenador</label>'+
      '<input id="puTrainerName" maxlength="40" placeholder="Ej.: Entrenador Escarlata" value="'+safe(trainer.name||"")+'">'+
      '<label for="puTrainerMotto">Frase de la aventura</label>'+
      '<textarea id="puTrainerMotto" maxlength="120" placeholder="¡A por la Liga Pokémon!">'+safe(trainer.motto||"")+'</textarea>'+
      '<label>Elige un entrenador o un meme</label>'+
      '<div class="poke-avatars" id="puTrainerAvatars">'+
      [{category:"trainer",label:"🧑‍🏫 Entrenadores legendarios"},{category:"meme",label:"🎮 Memes del competitivo"}].map(group=>
       '<div class="poke-avatar-group"><strong>'+safe(group.label)+'</strong>'+
       '<div class="poke-avatar-grid">'+avatars.filter(x=>x.category===group.category).map(x=>
         '<button type="button" class="poke-avatar-tile" data-pu-avatar="'+safe(x.id)+'"'+
         ' aria-label="Elegir '+safe(x.label)+'" title="'+safe(x.label)+'" aria-pressed="'+(x.id===avatar?'true':'false')+'">'+
         '<img src="'+safe(x.src)+'" loading="lazy" alt=""><span>'+safe(x.label)+'</span></button>'
       ).join("")+'</div></div>'
      ).join("")+'</div>'+
      '<p class="poke-avatar-credits">Entrenadores: <a href="https://play.pokemonshowdown.com/sprites/trainers/" target="_blank" rel="noopener noreferrer">Pokémon Showdown (créditos de los artistas)</a>. Los memes incluyen imágenes de PokéAPI y referencias externas de sus creadores; se muestran sin modificar.</p>'+
      '<div class="poke-upgrade-actions"><button type="button" data-pu-close>Cancelar</button>'+
      '<button type="submit" class="pu-primary">Guardar tarjeta</button></div></form>');
    overlay.querySelectorAll("[data-pu-avatar]").forEach(b=>b.onclick=()=>{
      avatar=b.dataset.puAvatar;
      overlay.querySelectorAll("[data-pu-avatar]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
    });
    document.getElementById("puTrainerForm").onsubmit=e=>{
      e.preventDefault();
      run.trainer={
        name:document.getElementById("puTrainerName").value.trim().slice(0,40),
        motto:document.getElementById("puTrainerMotto").value.trim().slice(0,120),
        avatar,
      };
      save();closeDialog();render();
    };
  }

  async function openHistory(){
    openDialog("Historial de la run","Selecciona una copia anterior para recuperar la partida. La versión actual se guardará también como copia de seguridad.",
      '<div id="puHistoryList" aria-live="polite"><div class="poke-history-empty">Consultando copias de seguridad en Supabase…</div></div>'+
      '<div class="pu-status" id="puHistoryStatus"></div>');
    const panel=document.getElementById("puHistoryList");
    const status=document.getElementById("puHistoryStatus");
    try{
      const history=await window.PokeAccess.request("history",{run:type});
      if(overlay.hidden||!panel.isConnected)return;
      const versions=Array.isArray(history.versions)?history.versions:[];
      if(!versions.length){
        panel.innerHTML='<div class="poke-history-empty">Todavía no hay copias anteriores. Se generarán automáticamente al guardar cambios.</div>';
        status.textContent="El historial empezará a llenarse con los siguientes guardados.";return;
      }
      status.textContent="Se guardan hasta 40 versiones de esta run. Cada restauración también conserva el progreso anterior.";
      panel.innerHTML=versions.map(x=>{
        const isCurrent=Number(x.version)===Number(history.currentVersion);
        const when=Date.parse(x.capturedAt);
        const label=Number.isFinite(when)?new Date(when).toLocaleString("es-ES",{dateStyle:"medium",timeStyle:"short"}):"Fecha desconocida";
        return '<div class="poke-history-row"><div><strong>Versión #'+safe(x.version)+
          (isCurrent?' · Actual':'')+'</strong><small>'+safe(label)+'</small></div>'+
          (isCurrent?'<span class="trainer-tag">En uso</span>':
          '<button type="button" data-restore-version="'+safe(x.version)+'">Restaurar</button>')+'</div>';
      }).join("");
      panel.querySelectorAll("[data-restore-version]").forEach(button=>button.onclick=async()=>{
        const snapshotVersion=Number(button.dataset.restoreVersion);
        const sync=window.PokeDiarySync;
        const state=sync?.status?.();
        if(!sync||!state?.ready||state.paused||state.busy||state.dirty){
          status.textContent="⚠️ Hay cambios sin sincronizar o la conexión no está lista. Guarda o carga la nube antes de restaurar.";
          return;
        }
        if(!confirm("¿Restaurar la versión #"+snapshotVersion+"? Sustituirá el estado actual compartido. Se conservará una copia de la versión anterior."))return;
        button.disabled=true;status.textContent="Restaurando versión #"+snapshotVersion+"…";
        try{
          const restored=await sync.restore(snapshotVersion);
          closeDialog();
          alert("Versión #"+snapshotVersion+" restaurada. La run compartida está ahora en la versión #"+restored.version+".");
        }catch(err){
          status.textContent="⚠️ "+err.message;
          button.disabled=false;
        }
      });
    }catch(err){
      if(!overlay.hidden)panel.innerHTML='<div class="poke-history-empty">No se pudo consultar el historial: '+safe(err.message)+'</div>';
    }
  }

  const beforeRender=render;
  render=function(...args) {
    const result=beforeRender.apply(this,args);
    renderTrainer();renderTeam();return result;
  };
  renderTrainer();renderTeam();
  window.PokeDiaryUpgrades={openHistory,openTrainerEditor,renderTrainer,renderTeam};
})();