// GCC V20.8: host country is not the same as registered participant countries.
// Never infer a host's nationality from the current viewer, language, or timezone.
export const hostCountryV208=(event)=>{
 const code=String(event?.host_country_code||event?.session_details?.host_country_code||'').trim().toUpperCase();
 if(!/^[A-Z]{2}$/.test(code))return {code:'',name:'Host country not specified',flag:'🌐'};
 const name=String(event?.host_country_name||event?.session_details?.host_country_name||code);
 return {code,name,flag:[...code].map(char=>String.fromCodePoint(127397+char.charCodeAt(0))).join('')};
};
export function hostEventsAsOffersV208(events){
 return (events||[]).filter(x=>hostCountryV208(x).code).map(e=>{
  const country=hostCountryV208(e);
  return {id:e.id,status:'open',is_mine:false,ends_at:e.ends_at,
   country_code:country.code,country_name:country.name};
 });
}
export function publishedByCountryV208(event,filter=''){
 const selected=String(filter||'').trim().toUpperCase();
 return !selected||hostCountryV208(event).code===selected;
}
export const totalCapacityV208=(record)=> {
 const n=Number(record?.max_participants||record?.max_students||record?.session_details?.max_participants||
   record?.session_details?.preferred_students);
 return Number.isInteger(n)&&n>0?n:null;
};
export function scrollToCountryResultsV208(element){
 if(!element)return;
 const reduce=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 element.scrollIntoView?.({behavior:reduce?'auto':'smooth',block:'start'});
}
