import '../styles/sessionTimeV112.css';
import {sessionClockZonesV112,dateTimeLabelV112,timePartsV112,clockAnglesV112,timeRangeV112,viewerZoneV112} from './sessionTimeV112.js';
const create=(tag,cls='',content='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=content;return n;};
const svgNs='http://www.w3.org/2000/svg';
function svgNode(tag,attributes={}){const x=document.createElementNS(svgNs,tag);for(const [key,value] of Object.entries(attributes))x.setAttribute(key,String(value));return x;}
export function analogStartClockV112(instant,zone){
 const {hour,minute}=clockAnglesV112(instant,zone);
 const svg=svgNode('svg',{viewBox:'0 0 100 100',class:'gcc-v112-clock','aria-hidden':'true',focusable:'false'});
 svg.append(svgNode('circle',{cx:50,cy:50,r:46,fill:'#fff',stroke:'#bbd6d1','stroke-width':3}));
 for(let i=0;i<12;i++){
  const angle=(i*30-90)*Math.PI/180;
  const x1=50+39*Math.cos(angle),y1=50+39*Math.sin(angle),x2=50+43*Math.cos(angle),y2=50+43*Math.sin(angle);
  svg.append(svgNode('line',{x1,y1,x2,y2,stroke:'#648d91','stroke-width':i%3===0?2.8:1.7,'stroke-linecap':'round'}));
 }
 for(const [deg,length,width,color] of [[hour,25,5,'#234f60'],[minute,33,3,'#158c8e']]){
  const rad=(deg-90)*Math.PI/180;
  svg.append(svgNode('line',{x1:50,y1:50,x2:50+Math.cos(rad)*length,y2:50+Math.sin(rad)*length,stroke:color,'stroke-width':width,'stroke-linecap':'round'}));
 }
 svg.append(svgNode('circle',{cx:50,cy:50,r:3.5,fill:'#f29a81'}));
 return svg;
}
export function renderWorldSessionClocksV112(root,session){
 root.replaceChildren();
 if(!session?.starts_at){root.hidden=true;return;}
 root.hidden=false;
 const zones=sessionClockZonesV112(session.rooms,session.timezone||'Asia/Tokyo');
 const heading=create('div','gcc-v112-heading');heading.append(create('strong','','🌍 Your session around the world'),create('span','','Clock hands show the START time, not the current time.'));
 root.append(heading);
 const cards=create('div','gcc-v112-cards');
 for(const item of zones.clocks){
  const card=create('article','gcc-v112-card');
  const label=create('div','gcc-v112-country',`${item.flag} ${item.country}${item.host?' · Host':''}`);
  const body=create('div','gcc-v112-face-row');body.append(analogStartClockV112(session.starts_at,item.zone));
  const times=create('div','gcc-v112-times');
  const start=timePartsV112(session.starts_at,item.zone);
  times.append(create('span','gcc-v112-start-label','STARTS AT'),create('strong','gcc-v112-start',start.time),
    create('span','gcc-v112-date',dateTimeLabelV112(session.starts_at,item.zone).split(',').slice(0,2).join(',').trim()));
  if(session.ends_at)times.append(create('span','gcc-v112-end',`Ends ${timePartsV112(session.ends_at,item.zone).time}${timePartsV112(session.ends_at,item.zone).date!==start.date?' (next day)':''}`));
  else times.append(create('span','gcc-v112-end','End time not set'));
  body.append(times);card.append(label,body);cards.append(card);
 }
 root.append(cards);
 const myZone=viewerZoneV112();
 if(!zones.clocks.some(c=>c.zone===myZone))root.append(create('p','gcc-v112-your-time',`Your device (${myZone}): ${timeRangeV112(session.starts_at,session.ends_at,myZone)}`));
 if(zones.unmapped.length)root.append(create('p','gcc-v112-warning',`Local clocks need a school time zone: ${zones.unmapped.join(', ')}. Ask the host to confirm the city / time zone.`));
}
