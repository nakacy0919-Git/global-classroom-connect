// Session draft serialization. Plain field values only — never binary/photo data.
// Drafts are scoped server-side to the signed-in teacher (not browser shared storage).
export const DRAFT_VERSION_V213=1;
const isField=e=>e?.id?.startsWith('gctp-')&&
 !['gctp-publish','gctp-next','gctp-back','gctp-flyerfile','gctp-zone'].includes(e.id)&&
 !['file','button','submit','hidden'].includes(e.type);
export function captureSessionDraftV213(form,step=0,sourceFlyerUrl=''){
 const fields={};
 for(const e of form.querySelectorAll('input,select,textarea')){
  if(!isField(e))continue;
  if(e.name==='gctp-mode'){
   if(e.checked)fields['gctp-mode']=e.value;
  }else if(e.name==='gctp-target-level'){
   if(!fields['gctp-target-level'])fields['gctp-target-level']=[];
   if(e.checked)fields['gctp-target-level'].push(e.value);
  }else if(e.id){
   fields[e.id]=String(e.value||'').slice(0,4000);
  }
 }
 return {version:DRAFT_VERSION_V213,step:Math.max(0,Math.min(2,Math.trunc(Number(step)||0))),
  fields,source_flyer_url:String(sourceFlyerUrl||'').slice(0,900)};
}
export function applySessionDraftV213(form,draft){
 if(draft?.version!==DRAFT_VERSION_V213||!draft?.fields||typeof draft.fields!=='object'||Array.isArray(draft.fields))return false;
 const fields=draft.fields;
 for(const e of form.querySelectorAll('input,select,textarea')){
  if(!isField(e))continue;
  if(e.name==='gctp-mode'){
   if(typeof fields['gctp-mode']==='string')e.checked=e.value===fields['gctp-mode'];
  }else if(e.name==='gctp-target-level'){
   if(Array.isArray(fields['gctp-target-level']))e.checked=fields['gctp-target-level'].includes(e.value);
  }else if(Object.prototype.hasOwnProperty.call(fields,e.id)&&typeof fields[e.id]==='string'){
   e.value=fields[e.id];
  }
 }
 for(const name of ['gctp-platform','gctp-theme']){
  const field=form.querySelector('#'+name);
  field?.dispatchEvent?.(new Event('change',{bubbles:false}));
 }
 // Platform option list was recreated by the platform change event.
 const option=form.querySelector('#gctp-platform-option');
 if(option&&typeof fields['gctp-platform-option']==='string')option.value=fields['gctp-platform-option'];
 return true;
}
export function copiedSessionDraftV213(offer,options={}){
 const d=offer?.session_details||{};
 const fields={
  'gctp-name':String(d.session_name||offer.topic||'')+' (Copy)',
  'gctp-date':options.date||'',
  'gctp-from':options.from||'09:00',
  'gctp-to':options.to||'10:00',
  'gctp-students':String(offer.student_count||20),
  'gctp-capacity':String(d.max_participants||150),
  'gctp-rooms':String(offer.room_count||1),
  'gctp-band':offer.age_band||'Upper Secondary',
  'gctp-mode':d.mode||'classroom',
  'gctp-target-level':Array.isArray(d.target_levels)?d.target_levels:[offer.age_band||'Upper Secondary'],
  'gctp-theme':options.theme||'Free Topic',
  'gctp-topic':offer.topic||'',
  'gctp-language':d.language||'',
  'gctp-english':d.english_level||'',
  'gctp-notes':offer.notes||'',
  'gctp-type':d.session_type||'',
  'gctp-countries':d.preferred_countries||'',
  'gctp-minage':d.min_age===undefined?'':String(d.min_age),
  'gctp-maxage':d.max_age===undefined?'':String(d.max_age),
  'gctp-grades':d.accepted_grades||'',
  'gctp-flow':Array.isArray(d.flow)?d.flow.map(x=>x.time+' '+x.activity).join('\n'):'',
  'gctp-description':d.description||'',
  'gctp-platform':d.platform||'',
  'gctp-platform-option':d.platform_option||'',
  'gctp-meeting':d.meeting_url||'',
  'gctp-breakout':d.breakout_mode||'',
  'gctp-breakoutnotes':d.breakout_notes||'',
  'gctp-deadline':options.deadline||''
 };
 return {version:1,step:0,fields,source_flyer_url:d.flyer_url||''};
}
