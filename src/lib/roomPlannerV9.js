// Room planner V9: pure, testable functions. No network, no DOM, no persistent storage.
export function collectApproved(signups = []) {
  const students = [], facilitators = [];
  for (const signup of signups.filter(s => s.status === 'approved')) {
    const school = String(signup.school_name || '').trim();
    const country = String(signup.country_name || '').trim();
    const countryCode = String(signup.country_code || '').trim().toUpperCase();
    const schoolKey = `${countryCode}::${school.toLowerCase()}`;
    for (const [idx, student] of (signup.students || []).entries()) {
      const name = String(student.name || '').trim();
      if (!name) continue;
      students.push({
        id: String(student.id || `${signup.id}:student:${idx}`), name,
        grade: String(student.grade || ''), school, country, countryCode, schoolKey,
      });
    }
    for (const [idx, facilitator] of (signup.facilitators || []).entries()) {
      const name = String(facilitator || '').trim();
      if (!name) continue;
      facilitators.push({ id: `${signup.id}:fac:${idx}`, name, school, country, countryCode, schoolKey });
    }
  }
  return {students, facilitators};
}

function shuffle(arr, random) {
  const values = [...arr];
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

export function buildRoomDraft(students, facilitators, options = {}, random = Math.random) {
  const count = Number(options.rooms);
  const facPerRoom = Number(options.facilitatorsPerRoom ?? 1);
  if (!Number.isInteger(count) || count < 1 || count > 60) throw Error('Choose 1–60 rooms.');
  if (!Number.isInteger(facPerRoom) || facPerRoom < 0 || facPerRoom > 2) throw Error('Facilitators per room must be 0, 1 or 2.');
  if (!Array.isArray(students) || students.length === 0) throw Error('No approved students to arrange.');
  const ids = students.map(p => p.id);
  if (new Set(ids).size !== ids.length) throw Error('Duplicate student identifiers were found.');
  const countryMode = options.countryMode || 'prefer';
  const schoolMode = options.schoolMode || 'prefer';
  const weights = { ignore: 0, prefer: 100, strong: 500 };
  if (!(countryMode in weights) || !(schoolMode in weights)) throw Error('Unknown distribution setting.');
  const rooms = Array.from({length: count}, (_, i) => ({number: i + 1, name: `Room ${String(i + 1).padStart(2, '0')}`, students: [], facilitators: Array(facPerRoom).fill(null)}));
  // Balance headcount first, then minimise country/school collisions among equally full rooms.
  // This is best-effort mixing, not a guarantee when group sizes make separation impossible.
  for (const student of shuffle(students, random)) {
    const minSize = Math.min(...rooms.map(r => r.students.length));
    const choices = rooms.filter(r => r.students.length === minSize);
    let selected = choices[0], bestScore = Infinity;
    for (const room of shuffle(choices, random)) {
      const similarCountry = room.students.filter(p => student.countryCode && p.countryCode === student.countryCode).length;
      const similarSchool = room.students.filter(p => student.schoolKey && p.schoolKey === student.schoolKey).length;
      const score = weights[countryMode] * similarCountry + weights[schoolMode] * similarSchool;
      if (score < bestScore) {bestScore=score; selected=room;}
    }
    selected.students.push(student);
  }
  const available = shuffle(facilitators || [], random);
  let pos = 0;
  for (const room of rooms) {
    for (let i=0;i<facPerRoom;i++) {
      if (pos<available.length) room.facilitators[i]=available[pos++];
    }
  }
  return rooms;
}

export function moveStudent(rooms, studentId, targetNumber) {
  const to = rooms.find(r => r.number === Number(targetNumber));
  if (!to) throw Error('Select an existing room.');
  const from = rooms.find(r => r.students.some(p => p.id === studentId));
  if (!from) throw Error('Student was not found in the plan.');
  if (from === to) return rooms;
  const index = from.students.findIndex(p => p.id === studentId);
  to.students.push(...from.students.splice(index,1));
  return rooms;
}

export function setFacilitator(rooms, roomNumber, slot, facilitatorId, allFacilitators) {
  const room = rooms.find(r=>r.number===Number(roomNumber));
  if (!room || !Number.isInteger(Number(slot)) || Number(slot)<0 || Number(slot)>=room.facilitators.length) throw Error('Invalid facilitator slot.');
  const facilitator = facilitatorId ? allFacilitators.find(f=>f.id===facilitatorId) : null;
  if (facilitatorId && !facilitator) throw Error('Unknown facilitator.');
  // A facilitator can only be assigned to one room/slot.
  for (const r of rooms) r.facilitators=r.facilitators.map(f=>f?.id===facilitatorId&&facilitatorId?null:f);
  room.facilitators[Number(slot)] = facilitator;
  return rooms;
}

export function roomStatistics(rooms) {
  const names=rooms.flatMap(r=>r.students.map(p=>p.id));
  let sameCountryPairs=0,sameSchoolPairs=0;
  for (const r of rooms) for (let i=0;i<r.students.length;i++) for (let j=i+1;j<r.students.length;j++) {
    const a=r.students[i],b=r.students[j];
    if (a.countryCode && a.countryCode===b.countryCode) sameCountryPairs++;
    if (a.schoolKey && a.schoolKey===b.schoolKey) sameSchoolPairs++;
  }
  return {
    students: names.length,
    uniqueStudents: new Set(names).size,
    emptyRooms: rooms.filter(r=>!r.students.length).length,
    unfilledFacilitators: rooms.reduce((s,r)=>s+r.facilitators.filter(f=>!f).length,0),
    sameCountryPairs,sameSchoolPairs,
  };
}

function csvCell(s) { const value=String(s??''); return /[",\r\n]/.test(value)?`"${value.replaceAll('"','""')}"`:value; }
export function exportRoomCSV(eventTitle, rooms) {
  const result=[['Session','Room','Role','Name','School','Country','Grade'].map(csvCell).join(',')];
  for(const room of rooms) {
    for(const f of room.facilitators.filter(Boolean))result.push([eventTitle,room.name,'Facilitator',f.name,f.school,f.country,''].map(csvCell).join(','));
    for(const s of room.students)result.push([eventTitle,room.name,'Student',s.name,s.school,s.country,s.grade].map(csvCell).join(','));
  }
  return '\uFEFF'+result.join('\r\n')+'\r\n';
}
