import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { JSDOM, ResourceLoader, VirtualConsole } from "jsdom";

const root=process.cwd();
const origin="https://ernest-md.github.io";
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const initialRun=starter=>({
  zones:{},bosses:[0],rotations:0,notes:"",
  mons:[
    {id:"starter",name:starter,captureSpecies:starter,nickname:"",zone:"Inicial",level:20,
     status:"equipo",notes:"",starter:true,isShiny:false,createdAt:new Date().toISOString()},
    {id:"second",name:"Pawmi",captureSpecies:"Pawmi",nickname:"Rayito",zone:"sur1",level:18,
     status:"equipo",notes:"",starter:false,isShiny:false,createdAt:new Date().toISOString()}
  ],
  journal:[],battles:[],boxNames:{}
});

class LocalResources extends ResourceLoader {
  fetch(url){
    const parsed=new URL(url);
    if(parsed.origin!==origin||!parsed.pathname.startsWith("/pokelockes/"))return null;
    const file=parsed.pathname.split("/").at(-1);
    if(!/^[a-z0-9_-]+\.(?:js|css)$/.test(file))return null;
    const full=path.join(root,file);
    return fs.existsSync(full)?Promise.resolve(Buffer.from(fs.readFileSync(full))):null;
  }
}
async function testFile(file,type){
  const initial=initialRun(file==="run.html"?"Fidough":({fuego:"Fuecoco",planta:"Sprigatito",agua:"Quaxly"}[type]));
  let saved=JSON.parse(JSON.stringify(initial)),version=2;
  const historyState=JSON.parse(JSON.stringify(initial));
  let writes=0,restores=0;
  const errors=[];
  const vc=new VirtualConsole();
  vc.on("jsdomError",err=>errors.push(err.message));
  const url=origin+"/pokelockes/"+file+(file==="run.html"?"?tipo="+type:"");
  const jsdom=await JSDOM.fromFile(path.join(root,file),{
    url,runScripts:"dangerously",resources:new LocalResources(),virtualConsole:vc,
    pretendToBeVisual:true,beforeParse(win){
      win.alert=()=>{};
      win.confirm=()=>true;
      win.prompt=()=>null;
      win.HTMLElement.prototype.scrollIntoView=function(){};
      win.sessionStorage.setItem("pokelockes-shared-access-session","smoke-test");
      win.fetch=async(url,opts)=>{
        if(String(url).startsWith("https://pokeapi.co/api/v2/pokemon-species/662/"))
          return {ok:true,json:async()=>({id:662,name:"fletchinder",evolution_chain:{url:"https://pokeapi.co/api/v2/evolution-chain/250/"}})};
        if(String(url).startsWith("https://pokeapi.co/api/v2/evolution-chain/250/"))
          return {ok:true,json:async()=>({chain:{species:{name:"fletchling",url:"https://pokeapi.co/api/v2/pokemon-species/661/"},evolves_to:[{species:{name:"fletchinder",url:"https://pokeapi.co/api/v2/pokemon-species/662/"},evolves_to:[{species:{name:"talonflame",url:"https://pokeapi.co/api/v2/pokemon-species/663/"},evolution_details:[{min_level:35,trigger:{name:"level-up"}}],evolves_to:[]}]}]}})};
        if(!String(url).includes("/pokelocke-sync"))throw new Error("Unexpected fetch "+url);
        const body=JSON.parse(opts.body);
        const output=(status,json)=>({ok:status===200,status,json:async()=>json});
        if(body.code!=="smoke-test")return output(401,{error:"Código incorrecto"});
        if(body.action==="auth")return output(200,{ok:true});
        if(body.action==="read")return output(200,{run:type,version,state:saved});
        if(body.action==="history")return output(200,{
          currentVersion:version,versions:[{version:2,capturedAt:new Date().toISOString()}]
        });
        if(body.action==="write"){
          if(body.version!==version)return output(409,{error:"Conflicto",code:"conflict"});
          writes++;saved=JSON.parse(JSON.stringify(body.state));version++;
          return output(200,{ok:true,version});
        }
        if(body.action==="restore"){
          if(body.expectedVersion!==version)return output(409,{error:"Conflicto",code:"conflict"});
          restores++;saved=JSON.parse(JSON.stringify(historyState));version++;
          return output(200,{ok:true,version,state:saved});
        }
        return output(400,{error:"Acción desconocida"});
      };
    }
  });
  const {window:w}=jsdom;
  await new Promise(resolve=>{if(w.document.readyState==="complete")return resolve();
    w.addEventListener("load",resolve,{once:true})});
  for(let tries=0;tries<100&&!w.PokeDiarySync?.status().ready;tries++)await sleep(20);
  assert.equal(w.PokeDiarySync?.status().ready,true,"Cloud startup "+file);
  assert.ok(w.document.querySelector("#trainerHero h2"),"Trainer title exists");
  assert.equal(w.document.querySelectorAll("#teamShowcase [data-team-id]").length,2,"Team cards");
  assert.ok(w.document.querySelector('[data-nav-group="inicio"]'),"V2 navigation loaded");
  assert.equal(w.document.querySelector('[data-nav-group="inicio"]')?.getAttribute("aria-pressed"),"true","Dashboard selected by default");
  assert.ok(w.document.getElementById("inicio")?.classList.contains("on"),"Home dashboard visible");
  w.document.querySelector('[data-nav-group="capturas"]').click();
  assert.ok(w.document.getElementById("mapa")?.classList.contains("on"),"Captures map navigates");
  assert.equal(w.document.querySelector('[data-tab="objetivos"]').hidden,true,"Unrelated secondary tab hidden");
  w.document.querySelector('[data-nav-group="historia"]').click();
  assert.ok(w.document.getElementById("diario")?.classList.contains("on"),"History group shows diary");
  w.document.querySelector('[data-nav-group="inicio"]').click();


  assert.ok(w.PokeTrainerAvatars?.list.length>=65,"Trainer, Pokémon and meme avatar catalog loaded");
  assert.ok(w.PokeTrainerAvatars.list.filter(x=>x.category==="pokemon").length>=15,"Paldea Pokémon art gallery populated");
  assert.ok(w.PokeTrainerAvatars.list.filter(x=>x.category==="trainer").every(x=>x.src.includes("bulbagarden.net")),"Trainer artwork sources replaced");
  assert.ok(w.document.querySelector('#trainerHero img.tc-trainer-image'),"Trainer card now uses an image, not a vector avatar");
  assert.equal(w.PokeTrainerAvatars.legacy["🥷"],"koga","Previous ninja emoji maps to a real trainer");
  w.document.getElementById("trainerEditBtn").click();
  assert.ok(!w.document.getElementById("pokeUpgradeModal").hidden,"Trainer modal opened");
  assert.ok(w.document.querySelectorAll(".poke-avatar-tile").length>=30,"Real trainer and meme gallery rendered");
  assert.ok(w.document.querySelector('[data-pu-avatar="merequetengue"]'),"Merequetengue gallery option available");
  assert.ok(w.document.querySelector('[data-pu-avatar="meme-fuecoco"]'),"Absurd original memes available");
  const category=w.document.querySelector('[data-avatar-category="pokemon"]');
  category.click();
  assert.ok(w.document.querySelector('[data-pu-avatar="pokemon-tinkaton"]'),"Pokémon filter works");
  assert.equal(w.document.querySelector('[data-pu-avatar="cynthia"]'),null,"Trainer hidden in Pokémon filter");
  w.document.querySelector('[data-avatar-category="all"]').click();
  w.document.getElementById("puAvatarSearch").value="Cintia";
  w.document.getElementById("puAvatarSearch").dispatchEvent(new w.Event("input",{bubbles:true}));
  assert.equal(w.document.querySelectorAll(".poke-avatar-tile").length,1,"Avatar search filters matches");
  w.document.getElementById("puAvatarSearch").value="";
  w.document.getElementById("puAvatarSearch").dispatchEvent(new w.Event("input",{bubbles:true}));
  w.document.querySelector('[data-pu-fav="cynthia"]').click();
  assert.ok(w.document.querySelector('[data-pu-fav="cynthia"]').classList.contains("is-favorite"),"Favorites can be saved locally");
  w.document.querySelector('[data-pu-avatar="cynthia"]').click();
  assert.equal(w.document.querySelector('[data-pu-avatar="cynthia"]').getAttribute("aria-pressed"),"true","Cynthia selected");
  w.document.getElementById("puTrainerName").value="Entrenadora de prueba";
  w.document.getElementById("puTrainerMotto").value="PokéLockes es genial";
  w.document.getElementById("puTrainerForm").dispatchEvent(new w.Event("submit",{bubbles:true,cancelable:true}));
  assert.ok(w.document.querySelector("#trainerHero h2").textContent.includes("Entrenadora de prueba"),"Trainer updated");
  assert.equal(w.document.querySelector('#trainerHero img.tc-trainer-image')?.getAttribute('src'),w.PokeTrainerAvatars.get("cynthia").src,"Trainer artwork appears on the card");
  assert.equal(w.document.querySelector('#trainerHero img.tc-trainer-image')?.getAttribute('data-avatar-image'),"cynthia","Stable cloud avatar ID used in card");

  const down=w.document.querySelector('#teamShowcase [data-team-move="starter"][data-step="1"]');
  assert.ok(down,"Team move button found");
  down.click();
  assert.ok(w.document.querySelector("#teamShowcase [data-team-id]").dataset.teamId==="second","Team reorder");
  await sleep(1100);
  assert.ok(writes>=1,"Saved changes to cloud");
  assert.equal(saved.trainer.name,"Entrenadora de prueba","Trainer in cloud");
  assert.equal(saved.trainer.avatar,"cynthia","New avatar ID persists in cloud");

  assert.deepEqual(saved.teamOrder,["second","starter"],"Reorder in cloud");

  w.document.getElementById("trainerHistoryBtn").click();
  for(let tries=0;tries<30&&!w.document.querySelector('[data-restore-version="2"]');tries++)await sleep(10);
  const button=w.document.querySelector('[data-restore-version="2"]');
  assert.ok(button,"History row rendered");
  button.click();
  for(let tries=0;tries<50&&restores<1;tries++)await sleep(20);
  assert.equal(restores,1,"Restore requested");
  assert.ok(!saved.trainer,"Restore previous trainer state");
  assert.ok(!w.document.querySelector("#trainerHero h2").textContent.includes("Entrenadora de prueba"),"Restored UI updated");
  assert.equal(w.PokeDiarySync.status().dirty,false,"No lingering dirty state");
  // Manual evolution name edits must not retain the previous species' sprite.
  w.document.querySelector('#teamSlots [data-mon="second"]').click();
  assert.ok(w.document.getElementById("evolveMon"),"Evolution button visible on Pokémon editor");
  w.document.getElementById("editName").value="Fletchinder";
  w.document.getElementById("editName").dispatchEvent(new w.Event("input",{bubbles:true}));
  assert.equal(w.document.getElementById("editDex").value,"662","Species changes update Dex before save");
  w.document.getElementById("saveMon").click();
  assert.equal(w.document.getElementById("editName").value,"Fletchinder","Manual species change saved");
  assert.ok(w.document.querySelector('#teamSlots [data-mon="second"] img')?.src.endsWith("/662.png"),"Fletchinder sprite 662 shown");

  // The guided evolution uses the immediately next stage, not an arbitrary species.
  w.document.getElementById("evolveMon").click();
  for(let tries=0;tries<80&&!w.document.querySelector('[data-evolve-id="663"]');tries++)await sleep(25);
  assert.ok(w.document.querySelector('[data-evolve-id="663"]'),"Talonflame available in evolution picker");
  assert.equal(w.document.querySelector('[data-evolve-id="662"]'),null,"Current species not offered as evolution");
  w.document.querySelector('[data-evolve-id="663"]').click();
  assert.equal(w.document.getElementById("editName").value,"Talonflame","Evolution updates the species");
  assert.ok(w.document.querySelector('#teamSlots [data-mon="second"] img')?.src.endsWith("/663.png"),"Evolution changes sprite");
  await sleep(1200);
  const changed=saved.mons.find(mon=>mon.id==="second");
  assert.equal(changed?.name,"Talonflame","Evolution persisted to shared cloud state");
  assert.equal(changed?.dexNumber,663,"Pokédex number persisted");
  assert.equal(changed?.nickname,"Rayito","Nickname survived evolution");
  assert.equal(changed?.status,"equipo","Team status survived evolution");
  assert.equal(changed?.captureSpecies,"Pawmi","Original capture species preserved");
  assert.equal(changed?.zone,"sur1","Capture zone preserved");

  if(errors.length)throw new Error("Browser errors: "+errors.join("; "));
  console.log("PASS",type,"writes="+writes,"restores="+restores,"version="+version);
  w.close();
}
for(const [file,type] of [["fuego.html","fuego"],["planta.html","planta"],["agua.html","agua"],["run.html","hada"]]){
  await testFile(file,type);
}
console.log("ALL FOUR DIARY MODES PASS");
