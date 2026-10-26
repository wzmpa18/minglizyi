/** Deterministic in-app parents also work for direct links with no browser history. */
export function studyParentHref(pathname:string,search=""):string {
 const path=pathname.replace(/\/$/,"")||"/",q=new URLSearchParams(search);
 if(path==="/zhongyi/anatomy3d")return "/zhongyi/";
 if(path==="/zhongyi/meridian"){
  const token=q.get("atlasReturn");
  if(q.has("acupoint")&&token&&/^[a-f0-9]{32}$/.test(token))return "/zhongyi/anatomy3d/?atlasReturn="+token+"&pointName="+encodeURIComponent(q.get("acupoint")!)+(q.get("side")==="-1"?"&side=-1":"");
  if(q.has("acupoint")||q.has("dong"))return q.has("meridian")?"/zhongyi/meridian/?meridian="+encodeURIComponent(q.get("meridian")!):"/zhongyi/meridian/";
  return q.has("meridian")?"/zhongyi/meridian/":"/zhongyi/";
 }
 if(q.size&&path.startsWith("/zhongyi/"))return path+"/";
 if(path.startsWith("/zhongyi/"))return "/zhongyi/";
 if(path==="/zhongyi"||path==="/yixue")return "/";
 if(q.size)return path+"/";
 const parts=path.split("/").filter(Boolean);parts.pop();return "/"+(parts.length?parts.join("/")+"/":"");
}
