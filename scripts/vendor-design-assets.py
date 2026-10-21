"""Rebuild pinned, locally served design assets. Never runs during normal builds."""
import io, json, re, tarfile, urllib.request, hashlib
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
TABLER = 'a4ce1404bc6d24d3c365afe7b258d6bf6f48d62d'
CAIRO = 'a2c83daed9bc723922de8d0a9512990bd3d91df4'

def download(url):
    with urllib.request.urlopen(url, timeout=90) as r:
        return r.read()

def shape(e):
    tag=e.tag.rsplit('}',1)[-1]
    if e.get('transform'): raise ValueError('transform')
    if e.get('stroke')=='none': return ''
    f=lambda k,d=0:float(e.get(k,d))
    if tag=='path': return e.get('d','')
    if tag=='line': return f'M{f("x1")} {f("y1")}L{f("x2")} {f("y2")}'
    if tag in ('circle','ellipse'):
        x,y=f('cx'),f('cy');rx=f('r') if tag=='circle' else f('rx');ry=rx if tag=='circle' else f('ry')
        return f'M{x-rx} {y}a{rx} {ry} 0 1 0 {2*rx} 0a{rx} {ry} 0 1 0 {-2*rx} 0'
    if tag in ('polyline','polygon'):
        points=re.findall(r'[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?',e.get('points',''),re.I)
        if len(points)%2: raise ValueError('points')
        return 'M'+' '.join(points)+('Z' if tag=='polygon' else '')
    if tag=='rect':
        x,y,w,h=f('x'),f('y'),f('width'),f('height');rx=min(w/2,f('rx'));ry=min(h/2,f('ry',rx))
        if not rx or not ry:return f'M{x} {y}h{w}v{h}h{-w}Z'
        return f'M{x+rx} {y}H{x+w-rx}a{rx} {ry} 0 0 1 {rx} {ry}V{y+h-ry}a{rx} {ry} 0 0 1 {-rx} {ry}H{x+rx}a{rx} {ry} 0 0 1 {-rx} {-ry}V{y+ry}a{rx} {ry} 0 0 1 {rx} {-ry}Z'
    if tag in ('svg','g'):return ' '.join(shape(c) for c in e)
    if tag in ('title','desc'):return ''
    raise ValueError(tag)

archive=download(f'https://codeload.github.com/tabler/tabler-icons/tar.gz/{TABLER}')
icons={};skipped=[];brands=0
with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
    for member in tar.getmembers():
        if member.name.endswith('/LICENSE') and member.name.count('/')==1:
            (ROOT/'public/vendor/tabler/LICENSE').write_bytes(tar.extractfile(member).read())
        if '/icons/outline/' not in member.name or not member.name.endswith('.svg'):continue
        name=Path(member.name).stem
        if name.startswith('brand-'):brands+=1;continue
        try:
            svg=ET.fromstring(tar.extractfile(member).read())
            if svg.get('viewBox')!='0 0 24 24':raise ValueError('viewBox')
            d=shape(svg).strip()
            if not d or len(d)>16000 or re.search(r'[^a-zA-Z0-9\s.,+\-]',d):raise ValueError('path')
            icons[name]=d
        except (ValueError,ET.ParseError) as e:skipped.append({'name':name,'reason':str(e)})
data={'repository':'tabler/tabler-icons','commit':TABLER,'license':'MIT','excludedBrands':brands,'unsupported':skipped,'icons':dict(sorted(icons.items()))}
target=ROOT/'public/vendor/tabler/outline-paths.json';target.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
font=download(f'https://raw.githubusercontent.com/google/fonts/{CAIRO}/ofl/cairo/Cairo%5Bslnt,wght%5D.ttf')
(ROOT/'public/vendor/cairo/Cairo.ttf').write_bytes(font)
(ROOT/'public/vendor/cairo/OFL.txt').write_bytes(download(f'https://raw.githubusercontent.com/google/fonts/{CAIRO}/ofl/cairo/OFL.txt'))
(ROOT/'public/vendor/cairo/fonts.css').write_text('@font-face{font-family:StudioCairo;font-style:normal;font-weight:200 1000;font-display:swap;src:url("./Cairo.ttf") format("truetype")}\n')
manifest={'tabler':{'repository':'tabler/tabler-icons','commit':TABLER,'license':'MIT','icons':len(icons),'excludedBrands':brands,'unsupported':len(skipped),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':target.stat().st_size},'cairo':{'repository':'google/fonts','commit':CAIRO,'source':'ofl/cairo/Cairo[slnt,wght].ttf','license':'OFL-1.1','sha256':hashlib.sha256(font).hexdigest(),'bytes':len(font)}}
(ROOT/'public/vendor/sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(manifest))
