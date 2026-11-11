#!/usr/bin/env python3
"""Audit wild area lists using Serebii Pokéarth (NOT an official guide).
Names/types and evolutionary relatives from PokeAPI CSV. Excludes Violet-only spawns.
This is an approximate area guide, NOT evidence of a specific encounter position.
"""
import csv, io, json, re, unicodedata, collections, concurrent.futures
from datetime import date
from pathlib import Path
from urllib.parse import quote
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
BASE='https://www.serebii.net/pokearth'
CSV='https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv'
PA={'cabo':'cabopoco','sendero':'pocopath','gruta':'inletgrotto',
 'sur1':'southprovinceareaone','sur2':'southprovinceareatwo','sur3':'southprovinceareathree','sur4':'southprovinceareafour','sur5':'southprovinceareafive','sur6':'southprovinceareasix',
 'caverna':'alfornadacavern','marSur':'southpaldeansea','liga':'pokemonleague',
 'oeste1':'westprovinceareaone','oeste2':'westprovinceareatwo','oeste3':'westprovinceareathree',
 'desierto':'asadodesert','marOeste':'westpaldeansea',
 'este1':'eastprovinceareaone','este2':'eastprovinceareatwo','este3':'eastprovinceareathree','bosque':'tagtreethicket','marEste':'eastpaldeansea',
 'norte1':'northprovinceareaone','norte2':'northprovinceareatwo','norte3':'northprovinceareathree',
 'lago':'casseroyalake','senda':'socarrattrail','montana':'glaseadomountain','pasaje':'dalizapapassage','marNorte':'northpaldeansea','cero':'areazero'}
KI={'k_arroyo':'chillingwaterhead','k_campos':'kitakamiwilds','k_carretera':'kitakamiroad','k_centro':'kitakamihall',
 'k_manzanar':'applehills','k_cuerno':'fellhorngorge','k_eliseo':'paradisebarrens','k_fauces':"oni'smaw",'k_lago':'crystalpool','k_monte':'onimountain','k_averno':'infernalpass',
 'k_glicina':'wistfulfields','k_ribera':'mossfellconfluence','k_jarana':"reveler'sroad",'k_soto':'timelesswoods'}
TE={'t_arida':'savannabiome','t_costera':'coastalbiome','t_escarpada':'canyonbiome','t_polar':'polarbiome',
 't_electrorroca':'chargestonecavern','t_lumbre':'torchlitlabyrinth'}
AREAS={'paldea':PA,'kitakami':KI,'terra':TE}
TYPES=['normal','lucha','volador','veneno','tierra','roca','bicho','fantasma','acero','fuego','agua','planta','electrico','psiquico','hielo','dragon','siniestro','hada']
EXCLUDED={
 'paldea':set('Misdreavus Mismagius Gulpin Swalot Bagon Shelgon Salamence Clauncher Clawitzer Passimian Eiscue Dreepy Drakloak Dragapult Ceruledge'.lower().split()) |
 {'iron treads','iron bundle','iron hands','iron jugulis','iron moth','iron thorns','iron valiant','iron leaves','iron boulder','iron crown','miraidon'},
 'kitakami':{'aipom','ambipom','morpeko'},
 'terra':{'shieldon','bastiodon','sandshrew','sandslash'} }
UA={'User-Agent':'Mozilla/5.0 (compatible; Pokelockes fact check)'}

def get(url):
    r=requests.get(url,timeout=22,headers=UA);r.raise_for_status();return r.content

def rows(name):
    return list(csv.DictReader(io.StringIO(get(CSV+'/'+name).decode('utf-8-sig'))))

def slug(name):
    clean=''.join(ch for ch in unicodedata.normalize('NFKD',name.lower()) if not unicodedata.combining(ch))
    special={'nidoran♀':'nidoran-f','nidoran♂':'nidoran-m','mr. mime':'mr-mime','mime jr.':'mime-jr',"farfetch'd":'farfetchd'}
    return special.get(clean,re.sub('[^a-z0-9-]+','-',clean).strip('-'))

def type_data():
    pokes=rows('pokemon.csv');species=rows('pokemon_species.csv');type_rows=rows('pokemon_types.csv')
    byname={r['identifier']:int(r['id']) for r in species}
    defaults={int(r['species_id']):int(r['id']) for r in pokes if r['is_default']=='1'}
    typed=collections.defaultdict(set)
    for r in type_rows:
        tid=int(r['type_id'])
        if 1<=tid<=18:typed[int(r['pokemon_id'])].add(TYPES[tid-1])
    children=collections.defaultdict(list)
    for r in species:
        if r['evolves_from_species_id']:children[int(r['evolves_from_species_id'])].append(int(r['id']))
    desc={}
    for r in species:
        sid=int(r['id']);seen=set();front=list(children[sid]);found=[]
        while front:
            child=front.pop(0)
            if child in seen:continue
            found.append(child);seen.add(child);front+=children[child]
        desc[sid]=found
    names={int(r['id']):r['identifier'].replace('-',' ').title() for r in species}
    return byname,defaults,typed,desc,names

def area_read(row):
    region,zone,name=row
    folder='terarium' if region=='terra' else region
    url=f'{BASE}/{folder}/{quote(name,safe="-")}.shtml'
    try:
        soup=BeautifulSoup(get(url),'html.parser')
        table=soup.select_one('#pokefilter')
        if table is None:return (region,zone,url,[],None) # no wild Pokémon listed for this area
        pokemon=[]
        for a in table.select('a[onclick*="pokeToggle"]'):
            n=a.get_text(' ',strip=True)
            if n and n not in pokemon and n.lower() not in EXCLUDED[region]:pokemon.append(n)
        return (region,zone,url,pokemon,None)
    except Exception as exc:
        return (region,zone,url,[],str(exc))

def main():
    paths=[(region,zone,name) for region,m in AREAS.items() for zone,name in m.items()]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        fetched=list(pool.map(area_read,paths))
    broken={region+'/'+zone:err for region,zone,_,_,err in fetched if err}
    if broken:
        raise RuntimeError('Cannot certify all mapped areas: '+json.dumps(broken))
    byname,default,typed,desc,names=type_data()
    candidates={r:{t:{} for t in TYPES} for r in AREAS}
    sources={r:{} for r in AREAS}
    evolutions={t:{} for t in TYPES}
    unknown=collections.Counter()
    total=0
    for reg,zone,url,species,_ in fetched:
        sources[reg][zone]=url
        for n in species:
            sid=byname.get(slug(n))
            if sid is None:
                unknown[n]+=1;continue
            native=set(typed[default[sid]])
            display=n
            extra={}
            if reg=='paldea' and n=='Wooper':
                display='Wooper (Paldea)';native={'tierra','veneno'} # NOT water; no Quagsire
            elif reg=='paldea' and n=='Tauros':
                display='Tauros (Paldea)';native={'lucha'} # Combat breed
            elif reg=='terra' and zone=='t_polar' and n=='Vulpix':
                display='Vulpix (Alola)';native={'hielo'};extra={'hada':'Ninetales (Alola)'}
            valid={typ:None for typ in native}
            if not (reg=='paldea' and n in {'Wooper','Tauros'}) and not (reg=='terra' and zone=='t_polar' and n=='Vulpix'):
                for evolved in desc[sid]:
                    for typ in typed[default[evolved]]:
                        if typ not in valid:valid[typ]=names[evolved]
            valid.update(extra)
            if n=='Charcadet':valid.pop('fantasma',None) # Ceruledge is Violet-only
            if n=='Oricorio':valid={t:v for t,v in valid.items() if t=='volador'} # area-specific form unknown
            if n=='Rotom':valid={t:v for t,v in valid.items() if t in {'fantasma','electrico'}} # appliance forms aren't evo
            for typ,ev in valid.items():
                zone_list=candidates[reg][typ].setdefault(zone,[])
                if display not in zone_list:
                    zone_list.append(display);total+=1
                if ev:evolutions[typ][display]=f'{ev} · tipo {typ}'
    # No distinct Serebii page for Colonnade Hollow: leave empty instead of inventing spawns.
    sources['paldea']['columna']=None
    report={'provider':'Serebii Pokéarth (not an official Pokémon guide)',
     'note':'Area-level sightings may be approximate. Filters exclude Violet-only wild species. Verify encounter rules in-game.',
     'auditedOn':str(date.today()),'coverage':{'checked':len(fetched),'zones':len(fetched)+1,'unmapped':['paldea/columna']},
     'sources':sources,'candidates':candidates,'evolutions':evolutions}
    output='/* Data fact-checked against Pokéarth, not an official guide. Generated by scripts/audit_pokearth.py. */\nwindow.POKE_VERIFIED='+json.dumps(report,ensure_ascii=False,separators=(',',':'))+';\n'
    (ROOT/'verified-encounters.js').write_text(output,encoding='utf8')
    print('AUDIT_COMPLETE',json.dumps({'checked':len(fetched),'zone_counts':{r:len(m) for r,m in AREAS.items()},'matched_candidates':total,'unknown_species':unknown.most_common(35),'output_bytes':len(output.encode('utf8'))},ensure_ascii=False))
    for region,zone,url,names,_ in fetched:
        if not names:print('EMPTY_SOURCE',region,zone,url)
    print('TEST',json.dumps({'south1_fire':candidates['paldea']['fuego'].get('sur1',[]),
         'south1_ghost':candidates['paldea']['fantasma'].get('sur1',[]),
         'coastal_steel':candidates['terra']['acero'].get('t_costera',[]),
         'polar_ice':candidates['terra']['hielo'].get('t_polar',[]),
         'paldea_north1':len(candidates['paldea']['agua'].get('norte1',[]))},ensure_ascii=False))
if __name__=='__main__':main()
