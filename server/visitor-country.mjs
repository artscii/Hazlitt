import geoip from 'geoip-country';
import proxyaddr from 'proxy-addr';
const localProxy=proxyaddr.compile(['loopback','uniquelocal']);
// Opt-in for host Caddy -> loopback-published Docker port. Trust only one hop.
export function visitorCountry(req,behindCaddy=false,lookup=geoip.lookup){
 try{
  const ip=proxyaddr(req,(address,index)=>behindCaddy&&index===0&&localProxy(address));
  const result=lookup(ip);const country=result?.country;
  return typeof country==='string'&&/^[A-Z]{2}$/.test(country)?country:'Unknown';
 }catch{return 'Unknown';}
}
export function visitorHeaders(req,behindCaddy=false){
 const headers={...req.headers,'CF-Connecting-IP':req.socket.remoteAddress||'Unavailable'};
 // Never accept a client-supplied country, even when no lookup is possible.
 delete headers['cf-ipcountry'];delete headers['CF-IPCountry'];
 headers['CF-IPCountry']=visitorCountry(req,behindCaddy);
 return headers;
}
