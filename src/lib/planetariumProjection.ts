const RAD=Math.PI/180;
export function projectSky(azimuth:number,altitude:number,viewAzimuth:number,viewAltitude:number,fov:number){
 const a=azimuth*RAD,h=altitude*RAD,c=viewAzimuth*RAD,t=viewAltitude*RAD;
 const x=Math.cos(h)*Math.sin(a),y=Math.sin(h),z=Math.cos(h)*Math.cos(a);
 const depth=x*Math.cos(t)*Math.sin(c)+y*Math.sin(t)+z*Math.cos(t)*Math.cos(c);
 if(depth<=0)return null;
 const scale=Math.tan(Math.max(5,Math.min(160,fov))*RAD/2);
 return {x:(x*Math.cos(c)-z*Math.sin(c))/(depth*scale),y:-(x*-Math.sin(t)*Math.sin(c)+y*Math.cos(t)+z*-Math.sin(t)*Math.cos(c))/(depth*scale)};
}
export function projectSpace(x:number,y:number,z:number,yaw:number,pitch:number,radius:number){
 const a=yaw*RAD,p=pitch*RAD,xx=x*Math.cos(a)-y*Math.sin(a),yy=x*Math.sin(a)+y*Math.cos(a);
 return {x:xx/radius,y:(yy*Math.sin(p)-z*Math.cos(p))/radius,depth:yy*Math.cos(p)+z*Math.sin(p)};
}
