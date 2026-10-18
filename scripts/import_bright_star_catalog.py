"""Maintain the CC BY-SA4.0 bright-star subset. Source CSV stays in RAM, never a second corpus copy."""
import csv,gzip,hashlib,io,json
from pathlib import Path
from urllib.request import Request,urlopen
REV="c7f7f883fe678cc7680169a50ccd7dcc49b060ce"
BASE=f"https://raw.githubusercontent.com/astronexus/HYG-Database/{REV}/"
URL=BASE+"hyg/CURRENT/hygdata_v41.csv"
def fetch(url):return urlopen(Request(url,headers={"User-Agent":"YandaoLearning/1.0"}),timeout=60).read()
def main():
 raw=fetch(URL);rows=[]
 for r in csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))):
  if not r.get("mag") or not r.get("ra") or not r.get("dec") or r.get("id")=="0":continue
  if float(r["mag"])>6.5:continue
  rows.append({"id":int(r["id"]),"hip":int(r["hip"]) if r.get("hip") else None,"name":r.get("proper") or (r.get("bf") or "HIP "+r.get("hip","")).strip(),"ra":float(r["ra"]),"dec":float(r["dec"]),"mag":float(r["mag"]),"distancePc":float(r["dist"]) if r.get("dist") else None})
 assert 5000<len(rows)<12000
 root=Path(__file__).resolve().parents[1];out=root/"public/assets/astronomy";out.mkdir(parents=True,exist_ok=True)
 result={"catalogue":"HYG v4.1; magnitude <=6.5; J2000 coordinates","author":"David Nash / Astronexus and HYG contributors","sourceUrl":f"https://github.com/astronexus/HYG-Database/tree/{REV}","sourceRevision":REV,"sourceSha256":hashlib.sha256(raw).hexdigest(),"license":"CC BY-SA 4.0","licenseUrl":"https://creativecommons.org/licenses/by-sa/4.0/","modifications":"Selected magnitude<=6.5; reduced columns; JSON; coordinate values unchanged. No proper-motion extrapolation.","stars":rows}
 (out/"bright-stars.json").write_text(json.dumps(result,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
 (out/"LICENSE-HYG.txt").write_bytes(fetch(BASE+"LICENSE"))
 print(json.dumps({"stars":len(rows),"sourceSha256":result["sourceSha256"],"jsonBytes":(out/"bright-stars.json").stat().st_size}))
if __name__=="__main__":main()
