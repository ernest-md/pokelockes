import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {JSDOM,ResourceLoader,VirtualConsole} from "jsdom";

const origin="https://ernest-md.github.io";
const root=process.cwd();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
class LocalFiles extends ResourceLoader{
 fetch(url){
  const u=new URL(url);if(u.origin!==origin||!u.pathname.startsWith("/pokelockes/"))return null;
  const f=u.pathname.split("/").at(-1);
  if(!/^[a-z0-9_-]+\.(?:js|css)$/.test(f))return null;
  const p=path.join(root,f);
  return fs.existsSync(p)?Promise.resolve(Buffer.from(fs.readFileSync(p))):null;
 }
}
function initial(type){
 const starter=type==="fuego"?"Fuecoco":type==="planta"?"Sprigatito":type==="agua"?"Quaxly":"Fidough";
 const date=new Date().toISOString();
 const mon=(id,name,status,box,slot)=>({id,name,captureSpecies:name,nickname:"",zone:"Inicial",
   level:25,status,box,slot,notes:"",starter:id==="starter",isShiny:false,createdAt:date});
 const mons=[
  mon("starter",starter,"equipo",undefined,undefined),
  mon("second","Pawmi","equipo",undefined,undefined),
  mon("third","Lechonk","equipo",undefined,undefined),
  mon("boxed","Hoppip","reserva",0,1),
  mon("stored2","Tadbulb","reserva",0,2),
 ];
 const battle=(id,boss)=>({id,date,boss,region:"paldea",result:"victoria",mvpId:null,notes:"",
   participants:mons.slice(0,3).map(m=>({id:m.id,name:m.name,level:m.level,fallen:false}))});
 return {zones:{},bosses:[0,1],rotations:1,notes:"",mons,journal:[],battles:[battle("victory-1",0),battle("victory-2",1)],boxNames:{},teamOrder:["starter","second","third"]};
}
function stateFor(storage,type){
 const local=Object.keys(storage).find(k=>k.startsWith("locke-"));
 return JSON.parse(storage.getItem(local))[type];
}
function drag(w,from,to){
 const transferred=new Map();
 const data={setData(k,v){transferred.set(k,v)},getData(k){return transferred.get(k)||""},effectAllowed:"",dropEffect:""};
 for(const [element,kind] of [[from,"dragstart"],[to,"dragover"],[to,"drop"],[from,"dragend"]]){
  const event=new w.Event(kind,{bubbles:true,cancelable:true});
  Object.defineProperty(event,"dataTransfer",{value:data});
  element.dispatchEvent(event);
 }
}
async function test(file,type){
 const errors=[];const vc=new VirtualConsole();vc.on("jsdomError",e=>errors.push(String(e.message)));
 let shared=initial(type),version=2,writes=0;
 const url=origin+"/pokelockes/"+file+(file==="run.html"?"?tipo="+type:"");
 const dom=await JSDOM.fromFile(path.join(root,file),{
  url,runScripts:"dangerously",resources:new LocalFiles(),pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){
   w.alert=msg=>{if(/no hay|error/i.test(msg))throw new Error(msg)};
   w.confirm=()=>true;w.prompt=()=>null;
   w.HTMLElement.prototype.scrollIntoView=function(){};
   w.sessionStorage.setItem("pokelockes-shared-access-session","test");
   w.fetch=async(url,opts)=>{
    if(!String(url).includes("pokelocke-sync"))throw Error("Unexpected fetch "+url);
    const body=JSON.parse(opts.body);
    const reply=(code,v)=>({ok:code===200,status:code,json:async()=>v});
    if(body.code!=="test")return reply(401,{error:"Invalid access"});
    if(body.action==="auth")return reply(200,{ok:true});
    if(body.action==="read")return reply(200,{run:type,state:shared,version});
    if(body.action==="write"){
     if(body.version!==version)return reply(409,{error:"Conflict",code:"conflict"});
     shared=JSON.parse(JSON.stringify(body.state));version++;writes++;
     return reply(200,{ok:true,version});
    }
    if(body.action==="history")return reply(200,{currentVersion:version,versions:[]});
    if(body.action==="summary")return reply(200,{runs:[]});
    return reply(400,{error:"unknown action"});
   };
  }
 });
 const w=dom.window;
 await new Promise(resolve=>w.document.readyState==="complete"?resolve():w.addEventListener("load",resolve,{once:true}));
 for(let i=0;i<100&&!w.PokeDiarySync?.status().ready;i++)await sleep(20);
 assert.equal(w.PokeDiarySync.status().ready,true,"startup");
 assert.ok(w.PokeBoxFlow,"PC extension loaded");
 assert.equal(w.document.querySelectorAll('#teamSlots [data-mon]').length,3);
 assert.equal(w.document.querySelectorAll('#boxGrid [data-mon]').length,2);
 // 1: drag boxed Pokémon onto occupied team member => automatic swap, not boss rotation.
 drag(w,w.document.querySelector('#boxGrid [data-mon="boxed"]'),
   w.document.querySelector('#teamSlots [data-mon="starter"]'));
 let state=stateFor(w.localStorage,type);
 assert.equal(state.mons.find(m=>m.id==="boxed").status,"equipo");
 assert.equal(state.mons.find(m=>m.id==="starter").status,"reserva");
 assert.equal(state.mons.find(m=>m.id==="starter").slot,1);
 assert.deepEqual(state.teamOrder,["boxed","second","third"]);
 assert.equal(state.rotations,1,"normal drag is not a rotation");
 // 2: box to occupied box => swap slots.
 drag(w,w.document.querySelector('#boxGrid [data-mon="starter"]'),
   w.document.querySelector('#boxGrid [data-mon="stored2"]'));
 state=stateFor(w.localStorage,type);
 assert.equal(state.mons.find(m=>m.id==="starter").slot,2);
 assert.equal(state.mons.find(m=>m.id==="stored2").slot,1);
 // 3: team to empty box slot automatically.
 drag(w,w.document.querySelector('#teamSlots [data-mon="second"]'),
   w.document.querySelector('#boxGrid [data-slot="3"]'));
 state=stateFor(w.localStorage,type);
 assert.equal(state.mons.find(m=>m.id==="second").status,"reserva");
 assert.equal(state.mons.find(m=>m.id==="second").slot,3);
 assert.equal(state.rotations,1);
 // 4: mark death directly from the team showcase, with battle context.
 const deathButton=w.document.querySelector('#teamShowcase [data-team-id="boxed"] .pc-flow-chip[title="Marcar baja"]');
 assert.ok(deathButton);
 deathButton.click();
 const deathDialog=w.document.querySelector('.pc-flow-dialog');
 assert.ok(deathDialog,"death confirmation modal");
 deathDialog.querySelector("#pcDeathBattle").value="victory-1";
 deathDialog.querySelector("#pcDeathKiller").value="Ejemplo rival";
 deathDialog.querySelector("#pcConfirmDeath").click();
 state=stateFor(w.localStorage,type);
 assert.equal(state.mons.find(m=>m.id==="boxed").status,"baja");
 assert.equal(state.mons.find(m=>m.id==="boxed").death.battleId,"victory-1");
 assert.ok(w.document.querySelector('#memorialList [data-mon="boxed"]'));
 // 5: detailed rotation from remaining team (third) into boxed stored2, linked to gym.
 w.PokeBoxFlow.openRotation({battleId:"victory-1",outId:"third"});
 const form=w.document.querySelector('.pc-flow-dialog');
 assert.ok(form,"rotation dialog");
 assert.equal(form.querySelector("#pcRotateOut").value,"third");
 form.querySelector("#pcRotateIn").value="stored2";
 form.querySelector("#pcRotateNotes").value="Cambio por gimnasio";
 form.querySelector("#pcSaveRotation").click();
 state=stateFor(w.localStorage,type);
 assert.equal(state.rotations,2,"only actual detailed rotation increments legacy count");
 assert.equal(state.rotationsLog.length,1);
 assert.equal(state.rotationsLog[0].battleId,"victory-1");
 assert.equal(state.rotationsLog[0].outId,"third");
 assert.equal(state.rotationsLog[0].inId,"stored2");
 assert.equal(state.mons.find(m=>m.id==="third").status,"reserva");
 assert.equal(state.mons.find(m=>m.id==="stored2").status,"equipo");
 assert.ok(w.document.querySelector("#rotationSummary").textContent.includes("Tadbulb"));
 // 6: explicitly no rotation after the second gym, never increments counter.
 w.PokeBoxFlow.openRotation({battleId:"victory-2"});
 const noModal=w.document.querySelector(".pc-flow-dialog");
 noModal.querySelector("#pcNoRotation").click();
 state=stateFor(w.localStorage,type);
 assert.equal(state.rotations,2);
 assert.equal(state.rotationsLog.length,2);
 assert.equal(state.rotationsLog[1].kind,"none");
 assert.equal(state.rotationsLog[1].battleId,"victory-2");
 // 7: old counter remains historical and cloud sync sees the same state.
 await sleep(1450);
 assert.equal(shared.rotations,2);
 assert.equal(shared.rotationsLog.length,2);
 assert.equal(shared.mons.find(m=>m.id==="stored2").status,"equipo");
 assert.equal(w.PokeDiarySync.status().dirty,false);
 if(errors.length)throw Error("Browser errors "+errors.join(" | "));
 console.log("PASS BOX FLOW",type,"saved="+writes,"legacy=1","new=1","no=1");
 w.close();
}
for(const [file,type] of [["fuego.html","fuego"],["planta.html","planta"],["agua.html","agua"],["run.html","hada"]])await test(file,type);
console.log("ALL 4 BOX/ROTATION MODES PASS");
