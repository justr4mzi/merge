# Découpe les deux mixes d'origine (release GitHub « audio » : Lofi.mp3 et Lofi.chrismas.mp3 renommé Christmas.mp3) en un fichier par morceau, sans réencodage.
# Usage : télécharger Lofi.mp3 et Lofi.chrismas.mp3 (release « audio »), renommer le second en Christmas.mp3, puis dans ce dossier : python3 /chemin/merge/tools/decouper-musique.py
# Les fichiers sont écrits dans /home/claude/merge/audio : modifier la ligne « os.makedirs » et le chemin de sortie si besoin.
import json, subprocess, os
exec(open(__file__.replace("decouper-musique.py", "reperes-musique.py")).read().split("for name")[0])
LT="""evening glow|Rook1e, softy, Lofi Girl;schooltrips|mell-ø;Brioche|Lazlow, Oaty.;dream machine|ornaut, little blue;Siljan|dryhope;clocks pt.2|mell-ø;the places i'll go|Laffey, Juliàn;Helix|dryhope;Outer Wilds|mell-ø;past 3am|j'san, Lofi Girl;a place together|mell-ø;Pianta|takeo, Spencer Hunt, Lofi Girl;Evolutions|dryhope;Radience|Toti Cisneros, yungmerrin;Miles Away|Idealism;Setup|Monma;Green Hands|dryhope;School Trip|S I M, MFakka, Lofi Girl;Ripples|Nothingtosay, D0d.;Sequoia|No Spirit, Casiio;Albedo|softy;Sirens|trxxshed, Gemp;mistwood|Sleepermane;Past Reflections|cxlt., amies;Unfolds|Casiio, Tah.;Pillow|MyceliumBug;Parade|Nokiaa, Dontcry;Iluvitar|Towerz;Highlands|dryhope;Persist|softy;Soulforce|Casiio, Tah.;Follow The Light|cxlt., amies;Hippocampus|No Spirit, Casiio;Starlit|Team Astro;Forest Dreams|No Spirit, Casiio;Another Chance|Lomme, Elk Beats;Serenityville|BluntOne, dmtbeatz;Skylark|softy, Sleepermane, Casiio;Lendemain|anbuu, Epektase;Sunroof|Hazy Year;Afternoon Coffee|John Lee, JazzyHan;Pearl|Kurt Stewart, Lomme;Hibernate|anbuu;Willow|morningtime;Palms|Nokiaa, Deauxnuts;Circle of Life|No Spirit, Casiio;Demura|Casiio, Tah.;Carry Me Home|Kupla;Quest|Casiio, Tah.;Satellite|Nokiaa;nebula|Theo Aabel, brillion.;Compassion|Kupla;campfire|mell-ø, Ambulo;Where Light Can't Reach|Nothingtosay, D0d.;open field|96 Zeus, HM Surf;indigo|mell-ø;Angels Above Us|cxlt., amies, jxsn;juno|ornaut, if only;nap|96 Zeus, HM Surf;Imaginary Worlds|cxlt., amies;We Are Not Human|Tibeauthetraveler, Quist;Visiting Friends|Lomme, Elk Beats;In Place|dryhope;Moon Shower|Kurt Stewart, Lomme;Lillypads|No Spirit, Casiio;Downpour|anbuu;Beach Cat|Kurt Stewart, Lomme;Blue Moon|Sleepermane, Dontcry;generosity|Laffey;Do You|Team Astro;Passing Through|Sleepermane, Dontcry;Aperitif|Ambulo;idyllic|mell-ø;Afterglow|eleven, Hoogway;Descent|Tibeauthetraveler;Breathe|Elijah Lee, Casiio;Callisto|slowburn;you've changed|Blurred Figures, another silent weekend"""
lofiT=[x.split("|") for x in LT.split(";")]
XT=["The First Noel","Joy to the World","Jingle Bells","We Wish You a Merry Christmas","Silent Night","Auld Lang Syne","","Let It Snow","","All I Want for Christmas Is You","","Snowflake|lofi geek","","The First Noel","Joy to the World","","","Jingle Bells","We Wish You a Merry Christmas","","","Silent Night","Deck the Halls","","","","","","","Let It Snow","Last Christmas","","","","All I Want for Christmas Is You","","",""]
assert len(lofiT)==len(lofi)==78 and len(XT)==len(xmas)==38, (len(lofiT),len(XT))
def silends(path, merged=False):
    out=[]
    for l in open(path):
        if merged: a,b=l.split()[0].split("-"); out.append(float(b))
        else: out.append(float(l))
    return out
def refine(marks, ends):
    r=[]
    for t in marks:
        c=[e for e in ends if t-3<=e<=t+13]
        r.append(round(max(c) if c and t>0 else t,2))
    return r
lofiR=refine(lofi, silends(os.path.join(os.path.dirname(os.path.abspath(__file__)), "silences-lofi.txt")))
xmasR=refine(xmas, silends(os.path.join(os.path.dirname(os.path.abspath(__file__)), "silences-noel.txt"),True))
extra=[7506.0,7691.7,7880.6,8057.1,8252.3,8428.3,8625.7,8823.5,9014.9,9197.8,9425.1,9613.4,9803.7,9996.3,10172.7,10364.0]
xmasR+=extra; XT+=[""]*len(extra)
i=xmasR.index(1129.1); xmasR.insert(i,933.8); XT.insert(i,"")
dur={"Lofi":10803.88,"Christmas":10547.4}
os.makedirs("/home/claude/merge/audio",exist_ok=True)
out={}
for name,starts,titles,pre in [("Lofi",lofiR,lofiT,"lofi"),("Christmas",xmasR,XT,"noel")]:
    tracks=[]
    for k,s in enumerate(starts):
        e=starts[k+1] if k+1<len(starts) else dur[name]
        f=f"audio/{pre}-{k:02d}.mp3"
        subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y","-ss",str(s),"-to",str(e),"-i",f"{name}.mp3","-map","0:a","-c","copy","-map_metadata","-1","/home/claude/merge/"+f],check=True)
        t=titles[k]
        if name=="Lofi": tt,aa=t
        else: tt,aa=(t.split("|")+[""])[:2] if t else ("Lofi de Noël","")
        tracks.append({"f":f,"t":tt,"a":aa,"d":round(e-s)})
    out[name]=tracks
json.dump(out,open("tracks.json","w"),ensure_ascii=False)
print({k:len(v) for k,v in out.items()})
print("lofi changed:",[(a,b) for a,b in zip(lofi,lofiR) if a!=b])
print("xmas changed:",[(a,b) for a,b in zip(xmas,xmasR) if a!=b])
