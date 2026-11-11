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
# Wild version exclusives, by region, based on Serebii's Scarlet/Violet list.
# Each side lists species UNAVAILABLE in the opposite version.
VERSION_EXCLUSIVES={
 'paldea':{
  'escarlata':set('Drifloon Drifblim Stunky Skuntank Larvitar Pupitar Tyranitar Deino Zweilous Hydreigon Skrelp Dragalge Oranguru Stonjourner'.lower().split()) |
    {'great tusk','scream tail','brute bonnet','flutter mane','slither wing','sandy shocks','roaring moon'},
  'purpura':set('Misdreavus Mismagius Gulpin Swalot Bagon Shelgon Salamence Clauncher Clawitzer Passimian Eiscue Dreepy Drakloak Dragapult'.lower().split()) |
    {'iron treads','iron bundle','iron hands','iron jugulis','iron moth','iron thorns','iron valiant'}
 },
 'kitakami':{
  'escarlata':{'vulpix','ninetales','gligar','gliscor','cramorant'},
  'purpura':{'sandshrew','sandslash','aipom','ambipom','morpeko'}
 },
 'terra':{
  'escarlata':{'vulpix','ninetales','cranidos','rampardos','gouging fire','raging bolt'},
  'purpura':{'sandshrew','sandslash','shieldon','bastiodon','iron boulder','iron crown'}
 }
}
VERSIONS=('escarlata','purpura')
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
            if n and n not in pokemon:pokemon.append(n)
        return (region,zone,url,pokemon,None)
    except Exception as exc:
        return (region,zone,url,[],str(exc))

def main():
    paths=[(region,zone,name) for region,m in AREAS.items() for zone,name in m.items()]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        fetched=list(pool.map(area_read,paths))
    broken={region+'/'+zone:err for region,zone,_,_,err in fetched if err}
    if broken:raise RuntimeError('Cannot verify all mapped areas: '+json.dumps(broken))
    byname,default,typed,desc,names=type_data()
    sources={r:{} for r in AREAS}
    for region,zone,url,_,_ in fetched:sources[region][zone]=url
    sources['paldea']['columna']=None # no independent source page
    dex={}
    unknown=collections.Counter()
    variations={}
    for version in VERSIONS:
        candidates={r:{t:{} for t in TYPES} for r in AREAS}
        evolutions={t:{} for t in TYPES}
        conditional={}
        total=0
        for reg,zone,url,species,_ in fetched:
            for n in species:
                # Includes the common encounter species and only exclusives for this version.
                exclusive_other=VERSIONS[1] if version==VERSIONS[0] else VERSIONS[0]
                if n.lower() in VERSION_EXCLUSIVES[reg][exclusive_other]:
                    continue
                sid=byname.get(slug(n))
                if sid is None:
                    unknown[n]+=1;continue
                dex[n]=sid
                native=set(typed[default[sid]])
                display=n
                extra={}
                if reg=='paldea' and n=='Wooper':
                    display='Wooper (Paldea)';native={'tierra','veneno'}
                elif reg=='paldea' and n=='Tauros':
                    display='Tauros (Paldea)';native={'lucha'}
                elif reg=='terra' and zone=='t_polar' and n=='Vulpix':
                    display='Vulpix (Alola)';native={'hielo'}
                    extra={'hada':'Ninetales (Alola)'}
                elif reg=='terra' and zone=='t_polar' and n=='Sandshrew':
                    display='Sandshrew (Alola)';native={'hielo','acero'}
                valid={typ:None for typ in native}
                if not (reg=='paldea' and n in {'Wooper','Tauros'}) and not (reg=='terra' and zone=='t_polar' and n in {'Vulpix','Sandshrew'}):
                    for evolved in desc[sid]:
                        for typ in typed[default[evolved]]:
                            if typ not in valid:valid[typ]=names[evolved]
                valid.update(extra)
                if n=='Charcadet':
                    if version=='escarlata':
                        valid.pop('fantasma',None) # Ceruledge requires Violet exclusive armor
                    else:
                        valid.pop('psiquico',None) # Armarouge requires Scarlet exclusive armor
                if n=='Basculin':
                    if reg=='kitakami' and zone=='k_soto':
                        display='Basculin (raya blanca)'
                    else:valid.pop('fantasma',None)
                if n=='Oricorio':valid={t:v for t,v in valid.items() if t=='volador'}
                if n=='Rotom':valid={t:v for t,v in valid.items() if t in {'fantasma','electrico'}}
                for typ,ev in valid.items():
                    zone_list=candidates[reg][typ].setdefault(zone,[])
                    if display not in zone_list:
                        zone_list.append(display);total+=1
                    if ev:evolutions[typ][display]=f'{ev} · tipo {typ}'
        # Version-specific Paldean Tauros breeds are rare forms of common Tauros.
        for zone in ['oeste2','este2','este3','desierto']:
            current=next((species for r,z,_,species,_ in fetched if r=='paldea' and z==zone),[])
            if 'Tauros' not in current:continue
            if version=='escarlata':
                name='Tauros de Paldea (variedad ardiente)';typ='fuego'
                msg='Forma rara exclusiva de Escarlata; no es el Tauros combatiente común.'
            else:
                name='Tauros de Paldea (variedad acuática)';typ='agua'
                msg='Forma rara exclusiva de Púrpura; no es el Tauros combatiente común.'
            arr=candidates['paldea'][typ].setdefault(zone,[])
            if name not in arr:arr.append(name)
            conditional[name]=msg
        variations[version]={'candidates':candidates,'evolutions':evolutions,'conditional':conditional}
        print('VERSION_AUDIT',version,'candidates',total,'south1_ghost',candidates['paldea']['fantasma'].get('sur1',[]),
              'soto_dark',candidates['kitakami']['siniestro'].get('k_soto',[]))
    report={'provider':'Serebii Pokéarth (non-official area guide)',
      'note':'Approximate area spawns; exclusive species filtered for the selected game. Events, trades, Union Circle or raids can provide exceptions.',
      'auditedOn':str(date.today()),
      'coverage':{'checked':len(fetched),'zones':len(fetched)+1,'unmapped':['paldea/columna']},
      'sources':sources,'versions':variations,
      'candidates':variations['escarlata']['candidates'],
      'evolutions':variations['escarlata']['evolutions'],
      'conditional':variations['escarlata']['conditional'],
      'dex':dex}
    output='/* Version-aware encounters from Pokéarth; not official game data. Generated by scripts/audit_pokearth.py. */\nwindow.POKE_VERIFIED='+json.dumps(report,ensure_ascii=False,separators=(',',':'))+';\n'
    (ROOT/'verified-encounters.js').write_text(output,encoding='utf8')
    print('AUDIT_COMPLETE',json.dumps({'checked':len(fetched),'versions':list(variations),'unknown_species':unknown.most_common(20),'output_bytes':len(output.encode('utf8'))},ensure_ascii=False))
    assert 'Misdreavus' not in variations['escarlata']['candidates']['paldea']['fantasma']['sur1']
    assert 'Misdreavus' in variations['purpura']['candidates']['paldea']['fantasma']['sur1']
    assert 'Drifloon' not in variations['purpura']['candidates']['paldea']['fantasma']['sur1']
    assert 'Drifloon' in variations['escarlata']['candidates']['paldea']['fantasma']['sur1']
    assert 'Tauros de Paldea (variedad ardiente)' in variations['escarlata']['candidates']['paldea']['fuego']['oeste2']
    assert 'Tauros de Paldea (variedad acuática)' in variations['purpura']['candidates']['paldea']['agua']['oeste2']

if __name__=='__main__':main()
