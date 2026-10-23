// V9.1 persistent draft codec: store IDs and choices, not copied student names.
const MODES = new Set(['ignore','prefer','strong']);

export function packRoomDraft(rooms, preferences) {
  if (!Array.isArray(rooms) || rooms.length < 1 || rooms.length > 60) throw Error('Invalid room count.');
  const pref = {
    rooms: rooms.length,
    facilitatorsPerRoom: Number(preferences.facilitatorsPerRoom),
    countryMode: String(preferences.countryMode),
    schoolMode: String(preferences.schoolMode),
  };
  if (![0,1,2].includes(pref.facilitatorsPerRoom) || !MODES.has(pref.countryMode) || !MODES.has(pref.schoolMode)) {
    throw Error('Invalid room preferences.');
  }
  const studentIds = [], facilitatorIds = [];
  const compact = rooms.map((r,i)=>{
    if (r.number !== i+1 || !Array.isArray(r.students) || !Array.isArray(r.facilitators) || r.facilitators.length !== pref.facilitatorsPerRoom) {
      throw Error('Invalid room structure.');
    }
    const students = r.students.map(s=>String(s.id));
    const facilitators = r.facilitators.map(f=>f ? String(f.id) : null);
    studentIds.push(...students);facilitatorIds.push(...facilitators.filter(Boolean));
    return {number:i+1,students,facilitators};
  });
  if (!studentIds.length || new Set(studentIds).size !== studentIds.length) throw Error('Duplicate or missing students in room plan.');
  if (new Set(facilitatorIds).size !== facilitatorIds.length) throw Error('A facilitator is assigned more than once.');
  return {version:1,prefs:pref,rooms:compact};
}

export function unpackRoomDraft(draft, currentStudents, currentFacilitators) {
  if (!draft || draft.version !== 1 || !draft.prefs || !Array.isArray(draft.rooms)) throw Error('Saved plan format is not supported.');
  const st = new Map((currentStudents||[]).map(x=>[String(x.id),x]));
  const fac = new Map((currentFacilitators||[]).map(x=>[String(x.id),x]));
  const studentIds=[],facilitatorIds=[];
  const rooms=draft.rooms.map((r,i)=>{
    if (r.number !== i+1 || !Array.isArray(r.students) || !Array.isArray(r.facilitators)) throw Error('Saved plan has invalid rooms.');
    const students=r.students.map(id=>{studentIds.push(String(id));return st.get(String(id));});
    const facilitators=r.facilitators.map(id=>{if(id)facilitatorIds.push(String(id));return id ? fac.get(String(id)) : null;});
    if (students.some(x=>!x) || facilitators.some((x,j)=>r.facilitators[j] && !x)) throw Error('This saved plan references participants no longer approved. Create a fresh plan.');
    return {number:i+1,name:`Room ${String(i+1).padStart(2,'0')}`,students,facilitators};
  });
  const ids=new Set(studentIds);
  if (ids.size!==studentIds.length || ids.size!==st.size || [...st.keys()].some(id=>!ids.has(id))) {
    throw Error('The approved student list changed since this draft was saved. Generate a fresh plan before saving again.');
  }
  if (new Set(facilitatorIds).size!==facilitatorIds.length) throw Error('A facilitator is listed twice in this saved plan.');
  if (!MODES.has(draft.prefs.countryMode) || !MODES.has(draft.prefs.schoolMode) ||
      Number(draft.prefs.rooms)!==rooms.length ||
      ![0,1,2].includes(Number(draft.prefs.facilitatorsPerRoom)) ||
      rooms.some(r=>r.facilitators.length!==Number(draft.prefs.facilitatorsPerRoom))) throw Error('Saved plan settings are invalid.');
  return {rooms, prefs:{
    rooms:rooms.length,facilitatorsPerRoom:Number(draft.prefs.facilitatorsPerRoom),
    countryMode:draft.prefs.countryMode,schoolMode:draft.prefs.schoolMode,
  }};
}
