// GCC V15.1: accessible country map with live countries from approved open session offers.
// Never use country pins that cannot be backed by an actual published session.
const svgNS='http://www.w3.org/2000/svg';
const svgEl=(name,attrs={})=>{
 const n=document.createElementNS(svgNS,name);
 for(const [key,value] of Object.entries(attrs))n.setAttribute(key,String(value));
 return n;
};
const screenX=longitude=>(Number(longitude)+180)*1000/360;
const screenY=latitude=>(90-Number(latitude))*500/180;

export function worldPathV151(geometry){
 if(!geometry||!Array.isArray(geometry.coordinates))return '';
 const multi=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
 const result=[];
 for(const polygon of multi)for(const ring of polygon){
  if(!Array.isArray(ring)||ring.length<3)continue;
  let prevX=null,first=true;
  for(const pair of ring){
   const x=screenX(pair?.[0]),y=screenY(pair?.[1]);
   if(!Number.isFinite(x)||!Number.isFinite(y))continue;
   const wrap=prevX!==null&&Math.abs(x-prevX)>500;
   result.push(first||wrap?'M'+x.toFixed(1)+','+y.toFixed(1):'L'+x.toFixed(1)+','+y.toFixed(1));
   first=false;prevX=x;
  }
  // Avoid joining points across the antimeridian with a huge horizontal line.
  if(prevX!==null)result.push('Z');
 }
 return result.join(' ');
}
export function activeCountriesV151(offers,now=Date.now()){
 const counts=new Map();
 for(const offer of offers||[]){
  if(offer?.is_mine||offer?.status!=='open'||Date.parse(offer?.ends_at)<=now)continue;
  const code=String(offer?.country_code||'').toUpperCase();
  if(!/^[A-Z]{2}$/.test(code))continue;
  const data=counts.get(code)||{code,name:String(offer?.country_name||code),count:0};
  data.count++;counts.set(code,data);
 }
 return [...counts.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
function countryChip(item,selected,onPick){
 const b=document.createElement('button');b.type='button';b.className='gcs151-country-chip';
 b.dataset.country=item.code;b.setAttribute('aria-pressed',String(item.code===selected));
 b.textContent=`${item.name} · ${item.count}`;
 b.addEventListener('click',()=>onPick(item.code));
 return b;
}
export function mountCountryExplorerV151(root,onPick){
 const map=root.querySelector('#gctp-country-map');
 const chips=root.querySelector('#gctp-country-list');
 const status=root.querySelector('#gctp-map-status');
 if(!map||!chips||!status)return {update(){},load(){return Promise.resolve();}};
 let countries=[],selected='',geo=null,master=null,loading=null;
 function paintList(){
  chips.replaceChildren();
  if(!countries.length){
   const msg=document.createElement('p');msg.className='gcs151-map-empty';
   msg.textContent='No open sessions from other countries yet. Try searching by time or return later.';
   chips.append(msg);return;
  }
  const all=document.createElement('button');all.type='button';all.className='gcs151-country-chip';
  all.setAttribute('aria-pressed',String(!selected));all.textContent='🌎 All countries';
  all.addEventListener('click',()=>onPick(''));chips.append(all);
  for(const country of countries)chips.append(countryChip(country,selected,onPick));
 }
 function paintMap(){
  if(!geo||!master)return;
  const world=svgEl('svg',{viewBox:'0 0 1000 500',role:'img','aria-label':'World map with clickable pins on countries offering sessions',preserveAspectRatio:'xMidYMid meet',class:'gcs151-world-svg'});
  const background=svgEl('rect',{x:0,y:0,width:1000,height:500,fill:'#d9f3fb'});world.append(background);
  const grid=svgEl('g',{class:'gcs151-world-grid','aria-hidden':'true'});
  for(let lon=-120;lon<=120;lon+=60)grid.append(svgEl('path',{d:`M${screenX(lon)},0V500`}));
  for(let lat=-60;lat<=60;lat+=30)grid.append(svgEl('path',{d:`M0,${screenY(lat)}H1000`}));
  world.append(grid);
  const land=svgEl('g',{class:'gcs151-world-land','aria-hidden':'true'});
  for(const feature of geo.features||[]){
   const d=worldPathV151(feature.geometry);
   if(d)land.append(svgEl('path',{d}));
  }
  world.append(land);
  const byCode=new Map((master.countries||[]).filter(c=>c?.code).map(c=>[c.code,c]));
  const pins=svgEl('g',{class:'gcs151-world-pins'});
  for(const item of countries){
   const country=byCode.get(item.code);
   if(!country||!Number.isFinite(Number(country.lat))||!Number.isFinite(Number(country.lon)))continue;
   const x=screenX(country.lon),y=screenY(country.lat);
   const pin=svgEl('g',{class:'gcs151-world-pin',transform:`translate(${x.toFixed(1)},${y.toFixed(1)})`,tabindex:0,role:'button','aria-label':`${item.name}, ${item.count} available ${item.count===1?'session':'sessions'}. Filter by this country`,'aria-pressed':String(item.code===selected),'data-gcs151-country':item.code});
   pin.append(svgEl('circle',{r:19,class:'gcs151-pin-target'}));
   pin.append(svgEl('circle',{r:item.code===selected?13:10,class:'gcs151-pin-dot'}));
   pin.append(svgEl('circle',{r:4,class:'gcs151-pin-center'}));
   const title=svgEl('title');title.textContent=`${item.name}: ${item.count} ${item.count===1?'session':'sessions'}`;pin.append(title);
   pins.append(pin);
  }
  world.append(pins);
  world.addEventListener('click',ev=>{
   const pin=ev.target.closest?.('[data-gcs151-country]');
   if(pin)onPick(pin.dataset.gcs151Country);
  });
  world.addEventListener('keydown',ev=>{
   if(ev.key!=='Enter'&&ev.key!==' ')return;
   const pin=ev.target.closest?.('[data-gcs151-country]');
   if(!pin)return;ev.preventDefault();onPick(pin.dataset.gcs151Country);
  });
  map.replaceChildren(world);
 }
 return {
  update(offers,country){
   countries=activeCountriesV151(offers);
   selected=country||'';
   status.textContent=countries.length?
    `${countries.length} ${countries.length===1?'country':'countries'} with available sessions · select a country pin`:
    'No currently available sessions from other schools';
   paintList();
   if(geo&&master)paintMap();
  },
  async load(){
   if(geo&&master){paintMap();return;}
   if(loading)return loading;
   status.textContent='Loading the world map…';
   loading=Promise.all([
    fetch('/world.geojson',{credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error('Map unavailable');return r.json();}),
    fetch('/country-master.json',{credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error('Countries unavailable');return r.json();})
   ]).then(([world,countriesData])=>{
    if(world?.type!=='FeatureCollection'||!Array.isArray(world.features)||!Array.isArray(countriesData?.countries))throw Error('Invalid map data');
    geo=world;master=countriesData;paintMap();
    status.textContent=countries.length?`${countries.length} active ${countries.length===1?'country':'countries'} · choose a pin or country below`:'No open partner sessions yet';
   }).catch(()=>{
    const note=document.createElement('p');note.textContent='Map image unavailable. Please use the country buttons below.';
    note.className='gcs151-map-empty';map.replaceChildren(note);
    status.textContent='Country buttons are still available';
   }).finally(()=>{loading=null;});
   return loading;
  }
 };
}
