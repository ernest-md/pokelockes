/* PokéLockes · reglas obligatorias: MVP a reserva + captura extra por teratipo. */
(function(){
  "use strict";
  const type=typeof RUN_TYPE==="string"?RUN_TYPE:(location.pathname.match(/(?:^|\/)(fuego|planta|agua)\.html$/)?.[1]||"fuego");
  const BONUS="Captura extra teratipo";
  const $id=id=>document.getElementById(id);
  const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const text=m=>(m?.nickname||m?.name||"Pokémon");
  const uniqueGoals=()=>[...new Set((run.bosses||[]).map(Number).filter(Number.isInteger))];
  const mon=id=>run.mons.find(m=>m.id===id);
  const ruleState=()=>{
    if(!run.challengeRules||typeof run.challengeRules!=="object")run.challengeRules={};
    const r=run.challengeRules;
    // Existing victories remain historical: do not automatically bench old MVPs.
    if(!Array.isArray(r.processedBosses))r.processedBosses=uniqueGoals();
    if(!r.mvpLocks||typeof r.mvpLocks!=="object")r.mvpLocks={};
    if(!r.teraUsed||typeof r.teraUsed!=="object")r.teraUsed={};
    return r;
  };
  const activeLock=id=>{
    const lock=ruleState().mvpLocks[id];
    return lock&&typeof lock==="object"?lock:null;
  };
  const completed=()=>uniqueGoals();
  const consumed=newSet=>{
    const r=ruleState();
    const keys=Object.keys(r.teraUsed).map(Number);
    for(const m of run.mons){
      if(m.teraBonus?.bossId!=null)keys.push(Number(m.teraBonus.bossId));
    }
    return new Set(keys.filter(Number.isInteger));
  };
  const unused=()=>{const used=consumed();return completed().filter(id=>!used.has(id))};
  const credits=()=>({earned:completed().length,used:consumed().size,available:unused().length});
  function blockedMessage(m){
    const lock=activeLock(m.id);
    return "🔒 "+text(m)+" fue el MVP de "+(lock?.bossName||"un objetivo")+
      " y no puede regresar al equipo hasta vencer el siguiente objetivo nuevo.";
  }
  const deny=(event,message)=>{
    event.preventDefault();event.stopImmediatePropagation();alert(message);
  };

  // New objective victories require a living MVP that was in the main team.
  document.addEventListener("click",event=>{
    const button=event.target.closest?.("#saveBattle");
    if(!button)return;
    if($id("fightResult")?.value!=="victoria")return;
    const boss=Number($id("fightBoss")?.value);
    if(completed().includes(boss))return; // rematch, no new award.
    const id=$id("fightMVP")?.value;
    const selected=mon(id);
    if(!id||!selected||selected.status!=="equipo"){
      deny(event,"Selecciona un MVP que esté actualmente en el equipo principal. Tras esta victoria irá a una caja hasta completar otro objetivo.");
      return;
    }
    if(document.querySelector('#casualtiesList .casualty-row[data-id="'+CSS.escape(id)+'"] input[type="checkbox"]:checked')){
      deny(event,"El MVP elegido está marcado como baja en este combate. Elige un Pokémon del equipo que haya sobrevivido.");
      return;
    }
    if(!firstFreeBoxSlot(null,id)){
      deny(event,"No queda espacio en las 32 cajas para rotar al MVP. Libera un hueco antes de registrar la victoria.");
    }
  },true);

  // Centralized protection covers PC changes and direct edits on the original Pokémon form.
  document.addEventListener("click",event=>{
    if(!event.target.closest?.("#saveMon"))return;
    if($id("editStatus")?.value!=="equipo")return;
    const m=mon(monSelected)||run.mons[0];
    if(m&&activeLock(m.id))deny(event,blockedMessage(m));
  },true);

  function processNewWins(){
    const r=ruleState(), seen=new Set(r.processedBosses.map(Number));
    const fresh=completed().filter(id=>!seen.has(id));
    if(!fresh.length)return;
    for(const boss of fresh){
      // A fresh objective releases the MVP(s) from the preceding objective.
      const oldIds=Object.keys(r.mvpLocks);
      for(const id of oldIds){
        const m=mon(id);
        if(m&&typeof recordMonEvent==="function")
          recordMonEvent(m,"equipo","🔓 Fin del bloqueo del MVP tras completar "+bossDisplay(boss));
        delete r.mvpLocks[id];
      }
      const battle=[...run.battles].reverse().find(b=>Number(b.boss)===boss&&b.result==="victoria");
      const m=battle?.mvpId?mon(battle.mvpId):null;
      if(m&&m.status==="equipo"){
        const slot=firstFreeBoxSlot(null,m.id);
        if(slot){
          m.status="reserva";
          m.box=slot.box;m.slot=slot.slot;
          run.teamOrder=Array.isArray(run.teamOrder)?run.teamOrder.filter(id=>id!==m.id):[];
          const bossName=bossDisplay(boss);
          r.mvpLocks[m.id]={bossId:boss,bossName,battleId:battle.id,lockedAt:stamp()};
          run.rotationsLog=Array.isArray(run.rotationsLog)?run.rotationsLog:[];
          run.rotationsLog.push({id:newId("rotation"),kind:"mvp",bossId:boss,battleId:battle.id,
            outId:m.id,outName:text(m),outSpecies:m.name,date:stamp(),
            notes:"MVP enviado a reserva hasta completar el siguiente objetivo."});
          run.rotations=(Number(run.rotations)||0)+1;
          pushJournal("⭐ MVP "+text(m)+" rotado a la caja "+(slot.box+1)+" tras "+bossName+
            ". Bloqueado hasta la siguiente victoria de objetivo.");
          if(typeof recordMonEvent==="function")
            recordMonEvent(m,"equipo","🔒 MVP: rotación obligatoria tras "+bossName);
        }else{
          pushJournal("⚠️ No pudo ejecutarse la rotación automática del MVP: cajas llenas.");
        }
      }else{
        pushJournal("⚠️ Objetivo "+bossDisplay(boss)+" registrado sin MVP rotado. Revisa el combate.");
      }
      seen.add(boss);
    }
    r.processedBosses=[...seen];
  }

  // All saved states, including the cloud sync, contain the actual locks and credits.
  ruleState();
  const previousSave=save;
  save=function(...args){
    processNewWins();
    return previousSave.apply(this,args);
  };

  function teraSummary(){
    const c=credits();
    const names=Object.values(ruleState().mvpLocks).map(x=>x?.bossName).filter(Boolean);
    const top='<div class="locke-rule-panel" id="teraRulePanel"><h3>⭐ MVP obligatorio · 💎 Teracapturas extra</h3>'+
      '<p>Tras cada objetivo nuevo, el MVP del equipo pasa automáticamente a una caja. No puede volver hasta superar el siguiente objetivo.</p>'+
      '<div class="locke-rule-stats"><span>🏆 '+c.earned+' objetivos</span>'+
      '<span>💎 '+c.available+' capturas extra disponibles</span>'+
      '<span>✅ '+(c.earned-c.available)+' usadas</span></div>'+
      (names.length?'<p>🔒 MVP bloqueado hasta otra victoria: '+safe(names.join(", "))+'</p>':'')+
      '<p>Una captura extra por objetivo: puede ser de cualquier especie, pero debes confirmar que tiene <strong>teratipo '+safe(TYPE_NAME)+'</strong>. No consume el encuentro normal de una zona.</p>'+
      '<button type="button" id="registerTeraBonus" '+(!c.available?'disabled':'')+
      '>＋ Registrar teracaptura extra'+(c.available?' ('+c.available+')':'')+'</button></div>';
    return top;
  }
  function renderTeraPanel(){
    const where=$id("rotationSummary");
    if(!where)return;
    let root=$id("teraRulePanel");
    if(root)root.remove();
    where.insertAdjacentHTML("beforebegin",teraSummary());
    $id("registerTeraBonus")?.addEventListener("click",()=>{
      tab="equipo";addMonExpanded=true;render();renderAddForm();
      const sel=$id("addOrigin");if(sel){sel.value=BONUS;sel.dispatchEvent(new Event("change",{bubbles:true}))}
      $id("addSpecies")?.focus();
      $id("addMonPanel")?.scrollIntoView({behavior:"smooth",block:"start"});
    });
  }
  function annotateLocks(){
    document.querySelectorAll("#boxGrid .pc-slot[data-mon]").forEach(el=>{
      const lock=activeLock(el.dataset.mon);
      el.classList.toggle("locke-locked",!!lock);
      if(lock)el.title="🔒 MVP bloqueado hasta vencer otro objetivo: "+lock.bossName;
    });
    document.querySelectorAll("#teamShowcase [data-team-id]").forEach(el=>{
      el.classList.toggle("locke-locked",!!activeLock(el.dataset.teamId));
    });
    const rules=$id("rulesList");
    if(rules){
      const entries=rules.querySelectorAll(".rule");
      for(const entry of entries){
        const title=entry.querySelector("strong")?.textContent;
        const value=entry.querySelector("span");
        if(!value)continue;
        if(title==="Rotación tras jefe"){
          value.textContent="Al ganar un objetivo nuevo, debes seleccionar un MVP vivo del equipo. Se envía automáticamente a caja y no puede volver hasta vencer el siguiente objetivo. En los objetivos anteriores no se fuerza una rotación retroactiva.";
        }else if(title==="Capturas por zona"){
          value.textContent="Una captura normal por zona y, adicionalmente, una captura con teratipo "+TYPE_NAME+" por cada objetivo superado. Cada bono se registra con su objetivo de origen y no consume la captura de zona.";
        }
      }
    }
  }

  function enrichCaptureForm(){
    if(!addMonExpanded||!$id("addOrigin"))return;
    const select=$id("addOrigin");
    if(![...select.options].some(o=>o.value===BONUS)){
      const opt=document.createElement("option");opt.value=BONUS;opt.textContent="💎 "+BONUS;
      select.appendChild(opt);
    }
    const box=document.createElement("div");
    box.className="field full locke-tera-fields";box.id="lockeTeraDetails";
    const available=unused();
    box.innerHTML='<strong>💎 Captura adicional por objetivo</strong>'+
      '<p>Este registro consume un bono obtenido al vencer un objetivo; no ocupa la captura normal de la zona.</p>'+
      '<label for="lockeTeraBoss">Objetivo que permite la captura</label>'+
      '<select id="lockeTeraBoss">'+(available.length?available.map(id=>
        '<option value="'+id+'">'+safe(bossDisplay(id))+'</option>').join(""):
        '<option value="">No hay bonos disponibles</option>')+'</select>'+
      '<label class="locke-check"><input type="checkbox" id="lockeTeraConfirm">Confirmo que el Pokémon capturado tiene teratipo '+safe(TYPE_NAME)+'</label>'+
      '<p>La especie puede tener otro tipo natural. El teratipo se guardará como '+safe(TYPE_NAME)+
      ' y la victoria que permitió esta captura quedará registrada.</p>';
    const field=select.closest(".field") || select.parentElement;
    field.insertAdjacentElement("afterend",box);
    function refresh(){
      box.hidden=select.value!==BONUS;
      const button=$id("saveNewMon");
      if(button&&select.value===BONUS&&!available.length)button.disabled=true;
      else if(button)button.disabled=false;
    }
    select.addEventListener("change",refresh);
    refresh();
    const button=$id("saveNewMon");
    const original=button?.onclick;
    if(!button||typeof original!=="function")return;
    button.onclick=function(event){
      if(select.value!==BONUS)return original.call(this,event);
      const boss=Number($id("lockeTeraBoss")?.value);
      if(!available.includes(boss)||!unused().includes(boss)){
        alert("No tienes capturas extra disponibles para ese objetivo.");return;
      }
      if(!$id("lockeTeraConfirm")?.checked){
        alert("Confirma que el Pokémon tiene teratipo "+TYPE_NAME+" antes de usar el bono.");return;
      }
      const before=run.mons.length;
      const result=original.call(this,event);
      if(run.mons.length!==before+1)return result;
      const m=run.mons[run.mons.length-1];
      if(m.origin!==BONUS)return result;
      m.teraType=type;
      m.teraBonus={bossId:boss,bossName:bossDisplay(boss),date:stamp(),teraType:type};
      ruleState().teraUsed[String(boss)]={monId:m.id,date:m.teraBonus.date};
      pushJournal("💎 Captura extra tras "+bossDisplay(boss)+": "+text(m)+" · teratipo "+TYPE_NAME+".");
      save();render();
      return result;
    };
  }
  const prevAdd=renderAddForm;
  renderAddForm=function(...args){
    const result=prevAdd.apply(this,args);
    enrichCaptureForm();return result;
  };
  const prevMons=renderMons;
  renderMons=function(...args){
    const result=prevMons.apply(this,args);
    annotateLocks();return result;
  };
  const prevBosses=renderBosses;
  renderBosses=function(...args){
    const result=prevBosses.apply(this,args);
    renderTeraPanel();return result;
  };
  const prevRender=render;
  render=function(...args){
    ruleState();
    const result=prevRender.apply(this,args);
    annotateLocks();
    return result;
  };
  render();
  window.PokeLockeRules={
    isLocked:id=>!!activeLock(id),
    getLock:activeLock,
    credits,
    unused,
    processNewWins,
    renderTeraPanel,
  };
})();