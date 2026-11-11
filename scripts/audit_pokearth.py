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
