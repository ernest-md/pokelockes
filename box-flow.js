/* PokéLockes: drag-and-drop sin guardar manualmente, bajas y rotaciones reales. */
(function () {
  "use strict";
  const pane=document.getElementById("equipo"), summary=document.getElementById("rotationSummary");
  if(!pane||!summary)return;
  const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const label=m=>m?(m.nickname||m.name||"Pokémon"):"Pokémon desconocido";
  const byId=id=>run.mons.find(m=>m.id===id);
  const stored=m=>m && m.status!=="equipo" && m.status!=="baja";
  const team=()=>{
    const order=Array.isArray(run.teamOrder)?run.teamOrder:[];
    return run.mons.filter(m=>m.status==="equipo").map((m,i)=>({m,i,r:order.indexOf(m.id)}))
      .sort((a,b)=>(a.r<0?999:a.r)-(b.r<0?999:b.r)||a.i-b.i).map(x=>x.m);
  };
  const rotations=()=>Array.isArray(run.rotationsLog)?run.rotationsLog:[];
  const contextList=()=>{
    const seen=new Set();
    const list=[];
    for(const battle of [...run.battles].reverse()){
      if(battle.result!=="victoria"||battle.boss==null)continue;
      const key="battle:"+battle.id;
      seen.add(Number(battle.boss));
      list.push({key,battleId:battle.id,bossId:Number(battle.boss),
        name:bossDisplay(Number(battle.boss))+" · "+formatDate(battle.date)});
    }
    for(const id of [...run.bosses].reverse()){
      if(seen.has(Number(id)))continue;
      list.push({key:"boss:"+id,battleId:null,bossId:Number(id),name:bossDisplay(Number(id))+" · Victoria antigua"});
    }
    return list;
  };
  let modal=null,dragging=null,highlight=null,statusMessage="",lastFocus=null;
  const nearest=(el,selector)=>el?.closest?.(selector)||null;
  const status=(msg)=>{statusMessage=msg;const el=document.getElementById("pcFlowStatus");if(el)el.textContent=msg};
  const saved=(msg)=>{movingMonId=null;save();render();status(msg)};
  const nameSnap=id=>{const m=byId(id);return m?label(m):"Pokémon ya eliminado"};

  function closeModal(){
    if(!modal)return;
    modal.remove();modal=null;
    if(lastFocus?.isConnected)lastFocus.focus();
    lastFocus=null;
  }
  function openModal(title,description,markup){
    closeModal();
    lastFocus=document.activeElement;
    modal=document.createElement("div");
    modal.className="pc-flow-dialog";modal.setAttribute("role","presentation");
    modal.innerHTML='<div class="pc-flow-modal" role="dialog" aria-modal="true" aria-labelledby="pcFlowTitle">'+
      '<h2 id="pcFlowTitle">'+safe(title)+'</h2><p>'+safe(description)+'</p>'+markup+'</div>';
    document.body.appendChild(modal);
    modal.addEventListener("click",e=>{if(e.target===modal||nearest(e.target,"[data-close-pc]"))closeModal()});
    modal.querySelector("button,input,select")?.focus();
    return modal;
  }
  document.addEventListener("keydown",e=>{if(modal&&e.key==="Escape")closeModal()});

  function clearBoxFields(m){delete m.box;delete m.slot;}
  function ensureTeamRank(ids){run.teamOrder=ids;}
  function insertTeam(id,replacedId=null){
    const list=team().map(m=>m.id);
    if(replacedId && list.includes(replacedId))list[list.indexOf(replacedId)]=id;
    else if(!list.includes(id))list.push(id);
    ensureTeamRank([...new Set(list)]);
  }
  function moveToBox(m,box,slot){
    if(!m||m.status==="baja")return false;
    box=Number(box);slot=Number(slot);
    if(!Number.isInteger(box)||box<0||box>=BOX_COUNT||!Number.isInteger(slot)||slot<0||slot>=BOX_SIZE)return false;
    const occupied=run.mons.find(other=>other.id!==m.id&&stored(other)&&other.box===box&&other.slot===slot);
    if(m.status==="equipo"){
      if(occupied){
        occupied.status="equipo";clearBoxFields(occupied);
        insertTeam(occupied.id,m.id);
      }else ensureTeamRank(team().filter(x=>x.id!==m.id).map(x=>x.id));
      m.status="reserva";m.box=box;m.slot=slot;
      saved(occupied?'↔ '+label(m)+' y '+label(occupied)+' intercambiados automáticamente.':'📦 '+label(m)+' enviado a la caja '+(box+1)+'.');
      return true;
    }
    if(m.box===box&&m.slot===slot)return false;
    const previousBox=m.box,previousSlot=m.slot;
    if(occupied){
      occupied.box=previousBox;occupied.slot=previousSlot;
    }
    m.box=box;m.slot=slot;
    boxPage=box;
    saved("📦 "+label(m)+" movido a la caja "+(box+1)+(occupied?", intercambiando su hueco con "+label(occupied):"")+".");
    return true;
  }
  function moveToTeam(m,targetId=null){
    if(!stored(m))return false;
    const target=targetId?byId(targetId):null;
    if(targetId&&(!target||target.status!=="equipo"))return false;
    if(!target && team().length>=6){
      alert("El equipo está lleno. Suelta el Pokémon sobre uno de los seis miembros para intercambiarlos.");
      return false;
    }
    const originalBox=m.box,originalSlot=m.slot;
    const order=team().map(x=>x.id);
    if(target){
      target.status="reserva";
      target.box=Number.isInteger(originalBox)?originalBox:boxPage;
      target.slot=Number.isInteger(originalSlot)?originalSlot:0;
      order[order.indexOf(target.id)]=m.id;
    }else order.push(m.id);
    run.teamOrder=[...new Set(order)];
    m.status="equipo";clearBoxFields(m);
    saved(target?'↔ '+label(m)+' entra en el equipo por '+label(target)+'.':'⚔️ '+label(m)+' añadido al equipo.');
    return true;
  }
  function moveToFreeBox(m){
    if(!m||m.status==="baja")return false;
    if(stored(m)){status("Este Pokémon ya está en una caja. Arrástralo a otro hueco para moverlo.");return false;}
    const free=firstFreeBoxSlot();
    if(!free){alert("No hay huecos libres en las cajas.");return false;}
    return moveToBox(m,free.box,free.slot);
  }
  function selectTeamSwap(m){
    const list=team();
    if(list.length<6)return moveToTeam(m);
    const choices=list.map(x=>'<option value="'+safe(x.id)+'">'+safe(label(x))+' · Nv. '+safe(x.level)+'</option>').join("");
    const root=openModal("Cambiar un Pokémon del equipo","El equipo ya tiene seis miembros. Elige quién irá a la caja. Esto será un cambio normal, no una rotación de gimnasio.",
      '<label for="pcSwapTarget">Sale del equipo</label><select id="pcSwapTarget">'+choices+'</select>'+
      '<div class="pc-flow-buttons"><button type="button" data-close-pc>Cancelar</button>'+
      '<button type="button" id="pcConfirmSwap" class="primary">Intercambiar y guardar</button></div>');
    root.querySelector("#pcConfirmSwap").onclick=()=>{
      const id=root.querySelector("#pcSwapTarget").value;
      closeModal();moveToTeam(m,id);
    };
  }

  function openDeath(id){
    const m=byId(id);
    if(!m||m.status==="baja")return;
    const fights=[...run.battles].reverse().map(b=>'<option value="'+safe(b.id)+'">'+
      safe(bossDisplay(b.boss))+' · '+safe(formatDate(b.date))+'</option>').join("");
    const root=openModal("💀 Registrar baja de "+label(m),
      "Este Pokémon pasará al memorial inmediatamente. La ficha y los combates anteriores se conservarán.",
      '<div class="pc-flow-warning">Esta acción modifica el equipo. Confírmala solo si el Pokémon ha caído realmente.</div>'+
      '<label for="pcDeathBattle">Combate relacionado (opcional)</label><select id="pcDeathBattle">'+
      '<option value="">Encuentro libre o sin combate registrado</option>'+fights+'</select>'+
      '<label for="pcDeathKiller">¿Quién lo derrotó?</label><input id="pcDeathKiller" maxlength="120" placeholder="Pokémon o entrenador rival">'+
      '<label for="pcDeathContext">Contexto / zona</label><input id="pcDeathContext" maxlength="150" placeholder="Ej.: gimnasio, ruta, incursión...">'+
      '<label for="pcDeathWords">Últimas palabras (opcional)</label><textarea id="pcDeathWords" maxlength="250"></textarea>'+
      '<div class="pc-flow-buttons"><button type="button" data-close-pc>Cancelar</button>'+
      '<button type="button" class="danger" id="pcConfirmDeath">Confirmar baja</button></div>');
    root.querySelector("#pcConfirmDeath").onclick=()=>{
      const fightId=root.querySelector("#pcDeathBattle").value;
      const fight=run.battles.find(b=>b.id===fightId);
      m.death={
        ...(m.death||{}),
        date:stamp(),battleId:fightId||null,bossId:fight?.boss??null,
        killer:root.querySelector("#pcDeathKiller").value.trim(),
        context:root.querySelector("#pcDeathContext").value.trim()||(fight?bossDisplay(fight.boss):""),
        lastWords:root.querySelector("#pcDeathWords").value.trim(),
      };
      m.status="baja";
      ensureTeamRank(team().filter(x=>x.id!==m.id).map(x=>x.id));
      pushJournal("💀 "+label(m)+" ha caído"+(fight?" contra "+bossDisplay(fight.boss):"")+".");
      if(typeof recordMonEvent==="function")recordMonEvent(m,"baja","💀 Baja registrada desde el equipo");
      closeModal();saved("💀 "+label(m)+" añadido al memorial.");
    };
  }

  function pendingDecisions(){
    const ids=new Set(rotations().map(r=>r.battleId).filter(Boolean));
    return run.battles.filter(b=>b.result==="victoria"&&!ids.has(b.id)).length;
  }
  function renderRotationPanel(){
    const records=rotations(),old=Math.max(0,(Number(run.rotations)||0)-records.filter(x=>x.kind==="swap").length);
    const completed=records.filter(r=>r.kind==="swap");
    const none=records.filter(r=>r.kind==="none");
    summary.innerHTML='<div class="pc-rotation-summary">'+
      '<div class="pc-rotation-count"><strong>'+completed.length+'</strong><small>Rotaciones detalladas</small></div>'+
      '<div class="pc-rotation-count"><strong>'+pendingDecisions()+'</strong><small>Victorias sin respuesta</small></div>'+
      '<div class="pc-rotation-count"><strong>'+none.length+'</strong><small>Sin rotación</small></div></div>'+
      (old?'<div class="pc-rotation-legacy">📜 '+old+' rotación'+(old!==1?'es':'')+
      ' antigua'+(old!==1?'s':'')+' sin detalle. Se conserva el contador anterior.</div>':'')+
      [...records].reverse().slice(0,12).map(r=>{
        const when=safe(formatDate(r.date));
        const boss=r.bossId!=null?bossDisplay(r.bossId):"Objetivo no especificado";
        return '<div class="pc-rotation-entry"><div class="pc-rotation-head">'+
          '<strong>'+(r.kind==="none"?"✓ Sin rotación":"↪ Rotación")+' · '+safe(boss)+'</strong>'+
          (r.kind==="none"?'<button type="button" data-pc-correct="'+safe(r.id)+'">Corregir</button>':'')+
          '</div><p>'+(r.kind==="none"?'No se modificó el equipo.':
          safe(r.outName||"Pokémon saliente")+' → '+safe(r.inName||"Pokémon entrante"))+
          (r.notes?" · "+safe(r.notes):"")+'</p><small>'+when+'</small></div>';
      }).join("")+
      (!records.length&&!old?'<p class="hint">Registra quién sale y quién entra tras una victoria. Los movimientos normales de caja no cuentan.</p>':'');
    document.getElementById("rotationBtn").disabled=contextList().length===0;
    document.getElementById("rotationBtn").textContent="↪ Indicar quién rota";
    document.getElementById("rotationBtn").onclick=()=>openRotation();
    summary.querySelectorAll("[data-pc-correct]").forEach(b=>b.onclick=()=>{
      const index=run.rotationsLog?.findIndex(r=>r.id===b.dataset.pcCorrect)??-1;
      if(index<0)return;
      const entry=run.rotationsLog[index];
      if(!confirm("¿Quitar la respuesta «sin rotación» de "+bossDisplay(entry.bossId)+"? Podrás registrar la rotación después."))return;
      run.rotationsLog.splice(index,1);
      saved("Respuesta anterior retirada. Ahora puedes registrar una rotación.");
    });
    const cards=[...document.querySelectorAll("#battlesHistory .battle-card")];
    const history=[...run.battles].reverse();
    cards.forEach((card,i)=>{
      const battle=history[i];
      if(!battle||battle.result!=="victoria")return;
      const related=records.filter(r=>r.battleId===battle.id);
      const row=document.createElement("div");row.className="pc-battle-rotation";
      const decision=related.find(r=>r.kind==="none");
      const swaps=related.filter(r=>r.kind==="swap");
      if(swaps.length)row.innerHTML="<small>✓ "+swaps.length+" rotación(es) registrada(s) tras esta victoria</small> ";
      else if(decision)row.innerHTML="<small>✓ Confirmado: sin rotación</small> ";
      else row.innerHTML="<small>¿Qué pasó con el equipo después?</small> ";
      const button=document.createElement("button");
      button.type="button";button.textContent=swaps.length?"↪ Otra rotación":"↪ Indicar quién rota";
      button.onclick=()=>openRotation({battleId:battle.id});
      row.appendChild(button);
      if(!swaps.length&&!decision){
        const no=document.createElement("button");
        no.type="button";no.textContent="Sin rotación";
        no.onclick=()=>recordNoRotation({battleId:battle.id,bossId:battle.boss});
        row.appendChild(no);
      }
      card.appendChild(row);
    });
  }

  function getContext(key){
    return contextList().find(x=>x.key===key)||null;
  }
  function recordNoRotation(ctx){
    if(!ctx)return;
    const same=rotations().some(r=>
      (ctx.battleId&&r.battleId===ctx.battleId)||(!ctx.battleId&&!r.battleId&&Number(r.bossId)===Number(ctx.bossId)));
    if(same){status("Ya existe una respuesta para ese combate. Corrígela antes si corresponde.");return;}
    if(!confirm("¿Confirmar que no hubo rotación tras "+bossDisplay(ctx.bossId)+"?"))return;
    if(!Array.isArray(run.rotationsLog))run.rotationsLog=[];
    run.rotationsLog.push({id:newId("rotation"),kind:"none",date:stamp(),bossId:ctx.bossId,battleId:ctx.battleId||null,
      notes:""});
    pushJournal("↪ Sin rotación tras "+bossDisplay(ctx.bossId)+".");
    saved("✓ Registrado: sin rotación tras "+bossDisplay(ctx.bossId)+".");
  }
  function openRotation(opts={}){
    const contexts=contextList();
    if(!contexts.length){
      alert("Primero registra una victoria en Objetivos. Después podrás indicar qué Pokémon rota.");
      return;
    }
    const wanted=opts.battleId?"battle:"+opts.battleId:opts.bossId!=null?"boss:"+opts.bossId:null;
    const chosen=contexts.find(x=>x.key===wanted)||contexts[0];
    const outgoing=team(),incoming=run.mons.filter(stored);
    const root=openModal("↪ Registrar rotación tras victoria",
      "Selecciona el combate y los Pokémon que cambian. Esto cuenta como rotación real; mover Pokémon entre cajas NO cuenta.",
      '<label for="pcRotateBoss">Victoria / objetivo relacionado</label><select id="pcRotateBoss">'+contexts.map(c=>
        '<option value="'+safe(c.key)+'" '+(c.key===chosen.key?'selected':'')+'>'+safe(c.name)+'</option>'
      ).join("")+'</select>'+
      '<label for="pcRotateOut">Pokémon que SALE del equipo</label><select id="pcRotateOut">'+
      '<option value="">Elige quién sale…</option>'+outgoing.map(m=>'<option value="'+safe(m.id)+'" '+
      (opts.outId===m.id?'selected':'')+'>'+safe(label(m))+' · '+safe(m.name)+'</option>').join("")+'</select>'+
      '<label for="pcRotateIn">Pokémon que ENTRA desde una caja</label><select id="pcRotateIn">'+
      '<option value="">Elige quién entra…</option>'+incoming.map(m=>'<option value="'+safe(m.id)+'">'+
      safe(label(m))+' · '+safe(m.name)+'</option>').join("")+'</select>'+
      '<label for="pcRotateNotes">Notas (opcional)</label>'+
      '<textarea id="pcRotateNotes" maxlength="500" placeholder="Motivo de la rotación, anécdotas…"></textarea>'+
      ((!outgoing.length||!incoming.length)?'<div class="pc-flow-warning">Necesitas al menos un Pokémon en el equipo y uno disponible en cajas para realizar una rotación.</div>':'')+
      '<div class="pc-flow-buttons"><button type="button" data-close-pc>Cancelar</button>'+
      '<button type="button" id="pcNoRotation">No hubo rotación</button>'+
      '<button type="button" class="primary" id="pcSaveRotation" '+(!outgoing.length||!incoming.length?'disabled':'')+
      '>Confirmar intercambio</button></div><div class="pc-flow-live" id="pcRotationFeedback" role="status"></div>');
    const feedback=root.querySelector("#pcRotationFeedback");
    root.querySelector("#pcNoRotation").onclick=()=>{
      const ctx=getContext(root.querySelector("#pcRotateBoss").value);
      closeModal();recordNoRotation(ctx);
    };
    root.querySelector("#pcSaveRotation").onclick=()=>{
      const ctx=getContext(root.querySelector("#pcRotateBoss").value);
      const out=byId(root.querySelector("#pcRotateOut").value);
      const incomingMon=byId(root.querySelector("#pcRotateIn").value);
      if(!ctx||!out||out.status!=="equipo"||!incomingMon||!stored(incomingMon)){
        feedback.textContent="Selecciona un Pokémon del equipo y uno de las cajas.";return;
      }
      const locationBox=incomingMon.box,locationSlot=incomingMon.slot;
      if(!Number.isInteger(locationBox)||!Number.isInteger(locationSlot)){
        ensureBoxes();
      }
      const box=incomingMon.box,slot=incomingMon.slot;
      if(!Number.isInteger(box)||!Number.isInteger(slot)){
        feedback.textContent="No se ha encontrado un hueco válido en las cajas.";return;
      }
      if(!Array.isArray(run.rotationsLog))run.rotationsLog=[];
      // A previous «sin rotación» for this victory is corrected by the actual exchange.
      run.rotationsLog=run.rotationsLog.filter(r=>!(r.kind==="none"&&
        ((ctx.battleId&&r.battleId===ctx.battleId)||(!ctx.battleId&&!r.battleId&&Number(r.bossId)===Number(ctx.bossId)))));
      const oldName=label(out),newName=label(incomingMon);
      const teamOrder=team().map(x=>x.id);
      out.status="reserva";out.box=box;out.slot=slot;
      incomingMon.status="equipo";clearBoxFields(incomingMon);
      teamOrder[teamOrder.indexOf(out.id)]=incomingMon.id;
      run.teamOrder=[...new Set(teamOrder)];
      const record={id:newId("rotation"),kind:"swap",date:stamp(),bossId:ctx.bossId,battleId:ctx.battleId,
        outId:out.id,inId:incomingMon.id,outName:oldName,inName:newName,
        outSpecies:out.name,inSpecies:incomingMon.name,notes:root.querySelector("#pcRotateNotes").value.trim()};
      run.rotationsLog.push(record);
      run.rotations=(Number(run.rotations)||0)+1;
      pushJournal("↪ Rotación tras "+bossDisplay(ctx.bossId)+": "+oldName+" sale del equipo y "+newName+" entra.");
      if(typeof recordMonEvent==="function"){
        recordMonEvent(out,"equipo","↪ Sale tras "+bossDisplay(ctx.bossId));
        recordMonEvent(incomingMon,"equipo","↪ Entra tras "+bossDisplay(ctx.bossId));
      }
      closeModal();
      saved("↪ Rotación registrada: "+oldName+" → "+newName+".");
    };
  }

  function decoratePC(){
    if(!document.getElementById("pcFlowTeamDrop")){
      const teamSlots=document.getElementById("teamSlots");
      const row=document.createElement("div");
      row.id="pcFlowTeamDrop";row.className="pc-flow-zone";
      row.dataset.pcTarget="team";
      row.innerHTML='<span>⚔️ Suelta aquí un Pokémon para añadirlo al equipo</span><small>Si hay seis, arrástralo sobre uno para intercambiar.</small>';
      teamSlots?.parentElement?.insertBefore(row,teamSlots);
    }
    const teamSlots=document.getElementById("teamSlots");
    if(teamSlots)teamSlots.dataset.pcTarget="team";
    for(const el of document.querySelectorAll("#teamSlots .team-slot")){
      el.dataset.pcTarget="team";
      if(el.dataset.mon)el.draggable=true;
    }
    const box=document.getElementById("boxGrid");
    if(box)box.dataset.pcTarget="box";
    for(const el of document.querySelectorAll("#boxGrid .pc-slot")){
      el.dataset.pcTarget="box-slot";
      if(el.dataset.mon)el.draggable=true;
    }
    if(!document.getElementById("pcFlowBoxDrop")){
      const grid=document.getElementById("boxGrid");
      const drop=document.createElement("div");
      drop.id="pcFlowBoxDrop";drop.className="pc-flow-zone";drop.dataset.pcTarget="box";
      drop.innerHTML='<span>📦 Suelta aquí para guardar en la caja actual</span><small>O suelta sobre un hueco concreto para mover o intercambiar.</small>';
      grid?.parentElement?.insertBefore(drop,grid);
    }
    if(!document.getElementById("pcFlowMemorialDrop")){
      const memorial=document.getElementById("memorialList");
      const drop=document.createElement("div");
      drop.id="pcFlowMemorialDrop";drop.className="pc-flow-zone";drop.dataset.pcTarget="memorial";
      drop.innerHTML='<span>💀 Suelta aquí para registrar una baja</span><small>Siempre solicita confirmación antes de mover al memorial.</small>';
      memorial?.parentElement?.insertBefore(drop,memorial);
    }
    const help=document.getElementById("boxHelp");
    if(help){
      help.textContent="Arrastra Pokémon entre equipo y cajas; se guardan solos. En móvil, usa las acciones rápidas.";
      if(!document.getElementById("pcFlowQuick")){
        const div=document.createElement("div");div.id="pcFlowQuick";div.className="pc-flow-actions";
        help.insertAdjacentElement("afterend",div);
        const msg=document.createElement("div");msg.id="pcFlowStatus";msg.className="pc-flow-help";msg.setAttribute("role","status");
        div.insertAdjacentElement("afterend",msg);
      }
    }
    const actionRow=document.getElementById("pcFlowQuick");
    const chosen=byId(monSelected) || run.mons[0];
    if(actionRow){
      actionRow.innerHTML=chosen?'<button type="button" data-pc-action="team">⚔️ Equipo</button>'+
        '<button type="button" data-pc-action="box">📦 Caja</button>'+
        '<button type="button" data-pc-action="rotate">↪ Rotar</button>'+
        '<button type="button" data-pc-action="death" class="danger">💀 Baja</button>':"";
      actionRow.querySelectorAll("[data-pc-action]").forEach(b=>{
        b.disabled=(chosen.status==="baja"&&b.dataset.pcAction!=="death")||
          (b.dataset.pcAction==="death"&&chosen.status==="baja");
        b.onclick=()=>{
          const action=b.dataset.pcAction;
          if(action==="team" && stored(chosen))selectTeamSwap(chosen);
          else if(action==="box")moveToFreeBox(chosen);
          else if(action==="rotate")openRotation({outId:chosen.status==="equipo"?chosen.id:null});
          else if(action==="death")openDeath(chosen.id);
        };
      });
    }
    status(statusMessage);
  }
  function enhanceTeamCards(){
    for(const el of document.querySelectorAll("#teamShowcase [data-team-id]")){
      const id=el.dataset.teamId;
      const buttons=el.querySelector(".team-card-actions");
      if(!buttons||buttons.querySelector(".pc-flow-chip"))continue;
      const rotate=document.createElement("button");
      rotate.type="button";rotate.className="pc-flow-chip";rotate.textContent="↪";
      rotate.title="Rotar tras una victoria";rotate.setAttribute("aria-label","Rotar "+nameSnap(id));
      rotate.onclick=e=>{e.stopPropagation();openRotation({outId:id})};
      buttons.appendChild(rotate);
      const death=document.createElement("button");
      death.type="button";death.className="pc-flow-chip";death.title="Marcar baja";
      death.textContent="💀";death.setAttribute("aria-label","Marcar baja a "+nameSnap(id));
      death.onclick=e=>{e.stopPropagation();openDeath(id)};
      buttons.appendChild(death);
    }
  }

  // Drag events are delegated because the original diary re-renders its box buttons.
  const dropNode=el=>nearest(el,"[data-pc-target]")||nearest(el,"#teamShowcase [data-team-id]");
  const cleanDrop=()=>{
    dragging=null;
    if(highlight)highlight.classList.remove("is-drop-over");
    highlight=null;
    document.querySelectorAll(".is-being-dragged").forEach(e=>e.classList.remove("is-being-dragged"));
  };
  document.addEventListener("dragstart",e=>{
    const el=nearest(e.target,"#teamSlots [data-mon],#boxGrid [data-mon],#teamShowcase [data-team-id]");
    if(!el)return;
    const id=el.dataset.mon || el.dataset.teamId;
    if(!byId(id)||byId(id).status==="baja"){e.preventDefault();return}
    dragging=id;el.classList.add("is-being-dragged");
    if(e.dataTransfer){e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",id);}
  },true);
  document.addEventListener("dragover",e=>{
    if(!dragging)return;
    const dest=dropNode(e.target);
    if(!dest)return;
    e.preventDefault();
    if(e.dataTransfer)e.dataTransfer.dropEffect="move";
    if(highlight!==dest){
      if(highlight)highlight.classList.remove("is-drop-over");
      highlight=dest;dest.classList.add("is-drop-over");
    }
  });
  document.addEventListener("drop",e=>{
    if(!dragging)return;
    const dest=dropNode(e.target);
    if(!dest){cleanDrop();return}
    e.preventDefault();
    const m=byId(dragging);
    const kind=dest.dataset.pcTarget,teamCard=dest.dataset.teamId;
    cleanDrop();
    if(!m||m.status==="baja")return;
    if(teamCard){
      if(stored(m))moveToTeam(m,teamCard);
      // Team to team reorder is handled by the current trainer-card drag logic.
      return;
    }
    if(kind==="team"){
      const target=dest.dataset.mon;
      if(m.status==="equipo")return;
      if(target)moveToTeam(m,target);
      else if(team().length<6)moveToTeam(m);
      else alert("El equipo está lleno. Suelta el Pokémon sobre un miembro para intercambiarlos.");
    }else if(kind==="box-slot"){
      if(dest.dataset.busy){alert("Ese hueco está ocupado por un Pokémon oculto por el filtro shiny.");return;}
      moveToBox(m,boxPage,Number(dest.dataset.slot));
    }else if(kind==="box"){
      if(stored(m)&&Number(m.box)===boxPage){status("Arrástralo sobre un hueco para reordenarlo.");return;}
      const free=firstFreeBoxSlot(boxPage,stored(m)?m.id:null);
      if(!free){alert("Esta caja está llena. Selecciona un hueco ocupado para intercambiar Pokémon.");return;}
      moveToBox(m,free.box,free.slot);
    }else if(kind==="memorial"){
      openDeath(m.id);
    }
  });
  document.addEventListener("dragend",cleanDrop,true);

  const oldMons=renderMons;
  renderMons=function(...args){
    const result=oldMons.apply(this,args);decoratePC();return result;
  };
  const oldBoss=renderBosses;
  renderBosses=function(...args){
    const result=oldBoss.apply(this,args);renderRotationPanel();return result;
  };
  const oldRender=render;
  render=function(...args){
    const result=oldRender.apply(this,args);
    decoratePC();renderRotationPanel();enhanceTeamCards();
    return result;
  };
  decoratePC();renderRotationPanel();enhanceTeamCards();
  window.PokeBoxFlow={openRotation,openDeath,moveToTeam,moveToBox,recordNoRotation,renderRotationPanel};
})();