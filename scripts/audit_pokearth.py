#!/usr/bin/env python3
"""Diagnostic: see whether Pokéarth's region pages can be read from GitHub Actions."""
import requests
from bs4 import BeautifulSoup
for region, slug in [('paldea','southprovinceareaone'),('kitakami','kitakamiwilds'),('terarium','savannabiome')]:
    url=f'https://www.serebii.net/pokearth/{region}/{slug}.shtml'
    try:
        r=requests.get(url,timeout=18,headers={'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'})
        s=BeautifulSoup(r.content,'html.parser')
        snippets=[]
        for text in s.find_all(string=lambda x: x and 'Standard Spawns' in x):
            elem=text.parent
            snippets.append({'parent':str(elem)[:280],'grandparent':str(elem.parent)[:950]})
            if len(snippets)>=2:break
        print(str({'url':url,'status':r.status_code,'bytes':len(r.content),'title':s.title.get_text(' ',strip=True) if s.title else 'none','snippet':snippets})[:3400])
    except Exception as e:print(str({'url':url,'error':str(e)[:240]}))

# Structural inspection of names as they occur in the encounter table
soup=BeautifulSoup(requests.get('https://www.serebii.net/pokearth/paldea/southprovinceareaone.shtml',headers={'User-Agent':'Mozilla/5.0'},timeout=18).text,'html.parser')
els=[a for a in soup.find_all('a') if a.get_text(' ',strip=True)=='Psyduck']
for i,a in enumerate(els[:3]):
    path=[]
    e=a
    for j in range(6):
        path.append({'tag':e.name,'attrs':dict(e.attrs),'text':e.get_text(' ',strip=True)[:130]})
        if not e.parent: break
        e=e.parent
    print('PSYDUCK NODE',i,str(path)[:2500])
    print('PSYDUCK PARENT HTML',str(a.parent.parent)[:2700])
