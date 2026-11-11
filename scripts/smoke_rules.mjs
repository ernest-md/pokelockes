import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {JSDOM,ResourceLoader,VirtualConsole} from "jsdom";

const origin="https://ernest-md.github.io",root=process.cwd();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
class Resources extends ResourceLoader{
  fetch(url){
    const u=new URL(url);
    if(u.origin!==origin||!u.pathname.startsWith("/pokelockes/"))return null;
    const f=u.pathname.split("/").at(-1);
    if(!/^[a-z0-9_-]+\.(?:js|css)$/.test(f))return null;
    const p=path.join(root,f);
    return fs.existsSync(p)?Promise.resolve(Buffer.from(fs.readFileSync(p))):null;
  }
}
const initial=type=>{
 const starter={fuego:"Fuecoco",planta:"Sprigatito",agua:"Quaxly",hada:"Fidough"}[type];
 const make=(id,name,status)=>({
   id,name,captureSpecies:name,nickname:"",zone:"Inicial",level:25,
   status,notes:"",starter:id==="starter",isShiny:false,createdAt:new Date().toISOString()
 });
 return {zones:{},bosses:[],rotations:0,notes:"",mons:[
   make("starter",starter,"equipo"),make("second","Pawmi","equipo"),
   make("third","Lechonk","equipo"),{...make("boxed","Gastly","reserva"),box:0,slot:0}
 ],journal:[],battles:[],boxNames:{},teamOrder:["starter","second","third"]};
};
async function check(file,type){
 let cloud=initial(type),version=0,writes=0;
 const alerts=[],browserErrors=[];
 const vc=new VirtualConsole();vc.on("jsdomError",e=>browserErrors.push(e.message));
 const url=origin+"/pokelockes/"+file+(file==="run.html"?"?tipo="+type:"");
 const page=await JSDOM.fromFile(path.join(root,file),{
   url,runScripts:"dangerously",resources:new Resources(),pretendToBeVisual:true,virtualConsole:vc,
   beforeParse(win){
     win.sessionStorage.setItem("pokelockes-shared-access-session","smoke-access");
     win.confirm=()=>true;win.prompt=()=>null;win.alert=message=>alerts.push(String(message));
     win.HTMLElement.prototype.scrollIntoView=function(){};
     win.fetch=async(u,opts)=>{
       if(!String(u).includes("pokelocke-sync"))throw Error("Unexpected fetch "+u);
       const body=JSON.parse(opts.body);
       const answer=(code,v)=>({ok:code===200,status:code,json:async()=>v});
       if(body.code!=="smoke-access")return answer(401,{error:"Incorrect code"});
       if(body.action==="auth")return answer(200,{ok:true});
       if(body.action==="read")return answer(200,{run:type,state:cloud,version});
       if(body.action==="write"){
         if(body.version!==version)return answer(409,{code:"conflict",error:"out of date"});
         cloud=JSON.parse(JSON.stringify(body.state));version++;writes++;
         return answer(200,{ok:true,version});
       }
       if(body.action==="history")return answer(200,{versions:[],currentVersion:version});
       return answer(400,{error:"Unknown action"});
     };
   }
 });
 const w=page.window,d=w.document;
 await new Promise(resolve=>d.readyState==="complete"?resolve():w.addEventListener("load",resolve,{once:true}));
 for(let i=0;i<80&&!w.PokeDiarySync?.status().ready;i++)await sleep(25);
 assert.ok(w.PokeDiarySync?.status().ready,"cloud initialized");
 assert.ok(w.PokeLockeRules,"rules loaded");
 assert.deepEqual(JSON.parse(JSON.stringify(w.PokeLockeRules.credits())),{earned:0,used:0,available:0});
 const read=()=>{
   const key=Object.keys(w.localStorage).find(k=>k.startsWith("locke-"));
   return JSON.parse(w.localStorage.getItem(key))[type];
 };
 // Mandatory MVP when the first new objective is completed.
 assert.equal(d.querySelector("#fightResult").value,"victoria");
 const firstButton=d.getElementById("saveBattle");
 firstButton.click();
 assert.ok(alerts.pop()?.includes("MVP"),"must select a team MVP");
 assert.equal(read().bosses.length,0,"no victory without MVP");
 const selected=d.getElementById("fightMVP");
 assert.ok([...selected.options].some(o=>o.value==="starter"),"MVP option starter");
 selected.value="starter";
 d.getElementById("saveBattle").click();
 let run=read();
 assert.deepEqual(run.bosses,[0],"objective recorded");
 assert.equal(run.mons.find(m=>m.id==="starter").status,"reserva","MVP automatically benched");
 assert.ok(run.challengeRules.mvpLocks.starter,"MVP lock persisted");
 assert.equal(run.rotationsLog.length,1);
 assert.equal(run.rotationsLog[0].kind,"mvp");
 assert.equal(run.rotations,1,"mandatory rotation counted");
 assert.deepEqual(JSON.parse(JSON.stringify(w.PokeLockeRules.credits())),{earned:1,used:0,available:1});
 assert.equal(w.PokeBoxFlow.moveToTeam(run.mons.find(m=>m.id==="starter")),false,"MVP cannot rejoin"); // persisted m also has same ID
 assert.ok(alerts.pop()?.includes("bloqueado"),"locked feedback");
 assert.equal(read().mons.find(m=>m.id==="starter").status,"reserva");
 // Direct editor also blocks bringing the MVP back.
 d.querySelector('#boxGrid [data-mon="starter"]').click();
 d.getElementById("editStatus").value="equipo";
 d.getElementById("saveMon").click();
 assert.equal(read().mons.find(m=>m.id==="starter").status,"reserva","direct form cannot bypass lock");
 assert.ok(alerts.pop()?.includes("no puede regresar"),"direct-form warning");
 // Extra capture does not consume a normal zone and records source and teratype.
 const startZones=JSON.stringify(read().zones);
 const teraButton=d.getElementById("registerTeraBonus");
 assert.ok(teraButton && !teraButton.disabled,"bonus capture enabled");
 teraButton.click();
 assert.equal(d.getElementById("addOrigin").value,"Captura extra teratipo");
 d.getElementById("addSpecies").value="Pikachu"; // underlying type may differ
 d.getElementById("addNickname").value="TeraPepe";
 d.getElementById("saveNewMon").click();
 assert.ok(alerts.pop()?.includes("Confirma"),"requires actual teratype confirmation");
 assert.equal(read().mons.length,4,"no unconfirmed capture");
 d.getElementById("lockeTeraConfirm").checked=true;
 d.getElementById("saveNewMon").click();
 run=read();
 assert.equal(run.mons.length,5,"extra Pokémon added");
 const tera=run.mons.find(m=>m.nickname==="TeraPepe");
 assert.equal(tera.teraType,type);
 assert.equal(tera.teraBonus.bossId,0);
 assert.equal(tera.teraBonus.teraType,type);
 assert.equal(run.challengeRules.teraUsed["0"].monId,tera.id);
 assert.equal(JSON.stringify(run.zones),startZones,"bonus doesn't spend zone catch");
 assert.equal(w.PokeLockeRules.credits().available,0,"one credit per objective");
 // Bonus can't be spent twice; even deleting the mon should not refund the spent credit.
 d.getElementById("toggleAddMon").click();
 d.getElementById("addOrigin").value="Captura extra teratipo";
 d.getElementById("addOrigin").dispatchEvent(new w.Event("change",{bubbles:true}));
 assert.equal(d.getElementById("saveNewMon").disabled,true,"no extra available for same objective");
 // Next new boss unlocks the old MVP and benches the newly selected MVP.
 d.getElementById("closeAddMon").click();
 d.getElementById("fightBoss").value="1";
 d.getElementById("fightBoss").dispatchEvent(new w.Event("change",{bubbles:true}));
 const nextMvp=d.getElementById("fightMVP");
 assert.ok([...nextMvp.options].some(o=>o.value==="second"));
 nextMvp.value="second";
 d.getElementById("saveBattle").click();
 run=read();
 assert.deepEqual(run.bosses,[0,1]);
 assert.ok(!run.challengeRules.mvpLocks.starter,"first MVP unlocked");
 assert.ok(run.challengeRules.mvpLocks.second,"next MVP locked");
 assert.equal(run.mons.find(m=>m.id==="second").status,"reserva");
 assert.equal(w.PokeLockeRules.moveToTeam,undefined,"movers belong to PC");
 assert.equal(w.PokeLockeRules.isLocked("starter"),false,"first MVP can now return");
 assert.equal(w.PokeBoxFlow.moveToTeam(run.mons.find(m=>m.id==="starter")),true,"unlocked MVP can rejoin");
 run=read();
 assert.equal(run.mons.find(m=>m.id==="starter").status,"equipo");
 assert.deepEqual(JSON.parse(JSON.stringify(w.PokeLockeRules.credits())),{earned:2,used:1,available:1});
 // Repeat an already won boss doesn't grant another bonus or force another rotation.
 const before=run.rotations;
 d.getElementById("fightMVP").value=""; // allowed for rematches
 d.getElementById("saveBattle").click();
 run=read();
 assert.equal(run.rotations,before);
 assert.equal(w.PokeLockeRules.credits().available,1);
 await sleep(1300);
 assert.ok(writes>=1);
 assert.ok(cloud.challengeRules.mvpLocks.second,"lock in shared Supabase payload");
 assert.ok(cloud.mons.some(m=>m.teraBonus?.bossId===0),"bonus in shared payload");
 if(browserErrors.length)throw Error("Browser errors: "+browserErrors.join("; "));
 console.log("PASS RULES",type,"MVP locked/unlocked, tera credited once, auto-save",writes);
 w.close();
}
for(const [file,type] of [["fuego.html","fuego"],["planta.html","planta"],["agua.html","agua"],["run.html","hada"]]){
  await check(file,type);
}
console.log("ALL FOUR MONOTYPE RULE MODES PASS");