// GCC V12.9: extend a saved room plan without moving any previously seated student.
// Deliberately reuses the strict V9.1 draft validator and remains pure (no DB writes).
import {unpackRoomDraft} from './roomDraftV91.js';

const byStableId=(a,b)=>String(a.id).localeCompare(String(b.id),'en',{numeric:true});

export function mergeSavedRoomDraftV129(draft,currentStudents,currentFacilitators){
 if(!Array.isArray(currentStudents)||!Array.isArray(currentFacilitators))throw Error('Approved roster is unavailable. Existing rooms were not changed.');
 if(!draft||draft.version!==1||!Array.isArray(draft.rooms)||draft.rooms.length<1)throw Error('Saved plan format is not supported.');
 const studentIds=currentStudents.map(s=>String(s?.id||''));
 const facIds=currentFacilitators.map(f=>String(f?.id||''));
 if(studentIds.some(id=>!id)||new Set(studentIds).size!==studentIds.length)throw Error('Current approved students contain missing or duplicate identifiers.');
 if(facIds.some(id=>!id)||new Set(facIds).size!==facIds.length)throw Error('Current approved facilitators contain missing or duplicate identifiers.');
 const currentById=new Map(currentStudents.map(s=>[String(s.id),s]));
 const savedIds=draft.rooms.flatMap(r=>Array.isArray(r.students)?r.students.map(String):[]);
 const oldStudents=savedIds.map(id=>currentById.get(id)).filter(Boolean);
 // Existing placements, facilitator slots, and saved options are validated here.
 // If a formerly approved student or assigned facilitator was removed, stop safely.
 const restored=unpackRoomDraft(draft,oldStudents,currentFacilitators);
 const {rooms,prefs}=restored;
 const seen=new Set(savedIds);
 const added=currentStudents.filter(s=>!seen.has(String(s.id))).slice().sort(byStableId);
 const weights={ignore:0,prefer:1,strong:4};
 for(const person of added){
   // Protect all existing room membership; first balance headcounts, then diversity.
   const smallest=Math.min(...rooms.map(r=>r.students.length));
   const choices=rooms.filter(r=>r.students.length===smallest);
   const score=r=>r.students.reduce((total,other)=>{
     return total+
       (person.countryCode&&person.countryCode===other.countryCode?weights[prefs.countryMode]:0)+
       (person.schoolKey&&person.schoolKey===other.schoolKey?weights[prefs.schoolMode]:0);
   },0);
   choices.sort((a,b)=>score(a)-score(b)||a.number-b.number);
   choices[0].students.push(person);
 }
 const assigned=new Set(rooms.flatMap(r=>r.facilitators.filter(Boolean).map(f=>String(f.id))));
 const available=currentFacilitators.filter(f=>!assigned.has(String(f.id))).slice().sort(byStableId);
 let placedFacilitators=0;
 // Fill existing vacant positions only. Do not move already-assigned facilitators.
 for(const room of rooms){
   for(let i=0;i<room.facilitators.length;i++){
     if(room.facilitators[i]===null&&placedFacilitators<available.length){
       room.facilitators[i]=available[placedFacilitators++];
     }
   }
 }
 return {rooms,prefs,addedStudents:added.length,addedFacilitators:placedFacilitators,preservedStudents:savedIds.length};
}
