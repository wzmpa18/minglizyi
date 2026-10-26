/** Keep the server's signed attribution fields while opening readable content. */
export function learningShareLink(inviteLink:string):string {
  try{
    const source=new URL(inviteLink);
    if(source.protocol!=='https:'||!['yandaoguoxue.yandao.vip','www.yandao.vip'].includes(source.hostname)||source.username||source.password||source.port||source.hash||!/^\/(?:register|invite)\/?$/.test(source.pathname))return '';
    const ref=source.searchParams.get('ref')||'',ts=source.searchParams.get('ts')||'',sig=source.searchParams.get('sig')||'';
    if(!/^\d+$/.test(ref)||!/^\d{10,16}$/.test(ts)||!/^[a-f0-9]{32}$/i.test(sig)||['ref','ts','sig'].some(key=>source.searchParams.getAll(key).length!==1))return '';
    const target=new URL('https://yandaoguoxue.yandao.vip/zhongyi/');
    for(const key of ['ref','ts','sig','code']){const value=source.searchParams.get(key);if(value)target.searchParams.set(key,value);}
    return target.toString();
  }catch{return '';}
}
