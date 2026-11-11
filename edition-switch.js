/* Shared edition picker for all 18 PokéLockes diaries.
 * One run per type, one shared gameVersion property; switching only changes encounter hints.
 */
(function(){
  "use strict";
  const runType = typeof RUN_TYPE !== "undefined" ? RUN_TYPE : (
    location.pathname.match(/(?:^|\/)(fuego|planta|agua)\.html$/)?.[1] || "fuego"
  );
  const verified = window.POKE_VERIFIED;
  const initialEvolution = { ...EVOLUTION_COMPATIBLE };
  const previousRender = render;

  function selectedEdition(){
    return run && run.gameVersion === "purpura" ? "purpura" : "escarlata";
  }

  function updateEdition(){
    const edition=selectedEdition();
    const details=verified?.versions?.[edition] || (
      edition === "escarlata" ? verified : null
    );
    if(details?.candidates){
      for(const zone of ZONES){
        const candidates=details.candidates[zone.region]?.[runType]?.[zone.id];
        zone.fire=Array.isArray(candidates) ? candidates : [];
      }
    }
    for(const key of Object.keys(EVOLUTION_COMPATIBLE)) delete EVOLUTION_COMPATIBLE[key];
    Object.assign(EVOLUTION_COMPATIBLE,details?.evolutions?.[runType]||{});
    // Previously curated notes remain available for preevolutions in either version.
    for(const [name,desc] of Object.entries(initialEvolution)){
      if(!EVOLUTION_COMPATIBLE[name]) EVOLUTION_COMPATIBLE[name]=desc;
    }
    if(verified && details?.conditional) verified.conditional=details.conditional;

    const title=edition==="purpura" ? "Púrpura" : "Escarlata";
    const eyebrow=document.querySelector(".top .eyebrow");
    if(eyebrow) eyebrow.textContent="Pokémon "+title+" · Diario monotipo "+TYPE_NAME.toLowerCase();
    document.title="Locke "+TYPE_NAME+" · Pokémon "+title+" + DLC";
    for(const button of document.querySelectorAll("[data-game-edition]")){
      const active=button.dataset.gameEdition===edition;
      button.setAttribute("aria-pressed",String(active));
      button.classList.toggle("active",active);
    }
  }

  render=function(...args){
    updateEdition();
    return previousRender.apply(this,args);
  };

  document.querySelectorAll("[data-game-edition]").forEach(button=>{
    button.addEventListener("click",()=>{
      const choice=button.dataset.gameEdition;
      if(choice!=="escarlata"&&choice!=="purpura")return;
      if(choice===selectedEdition())return;
      run.gameVersion=choice; // Saved with the same cloud run; no new run or progress reset.
      save(); // The Supabase sync wrapper augments this save after startup.
      render();
    });
  });
  // Main diary rendered once before this script loads; re-render using the chosen version.
  render();
})();
