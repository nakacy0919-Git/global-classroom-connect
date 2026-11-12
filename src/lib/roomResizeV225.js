// V22.5: resize saved breakout rooms without shuffling unaffected rooms or splitting fixed pairs.
// Pure data transformation: the protected server RPC validates and atomically saves/publishes.
const roomName = number => `Room ${String(number).padStart(2, '0')}`;
const idOf = student => String(student.id);
const square = n => n * n;

export function resizeRoomPlanV225(currentRooms, newCount, fixedPairs = [], availableFacilitators = []) {
  const count = Number(newCount);
  if (!Number.isInteger(count) || count < 1 || count > 60) throw Error('Choose between 1 and 60 breakout rooms.');
  if (!Array.isArray(currentRooms) || !currentRooms.length || currentRooms.length > 60) throw Error('Open a valid saved room plan first.');
  const slots = currentRooms[0].facilitators?.length;
  if (![0, 1, 2].includes(slots) || currentRooms.some((r, i) =>
    r.number !== i + 1 || !Array.isArray(r.students) ||
    !Array.isArray(r.facilitators) || r.facilitators.length !== slots)) {
    throw Error('The saved room plan has invalid room or facilitator data.');
  }
  const originalIds = currentRooms.flatMap(r => r.students.map(idOf));
  if (!originalIds.length || new Set(originalIds).size !== originalIds.length) {
    throw Error('Saved students are missing or duplicated. Refresh the plan.');
  }
  const location = new Map();
  currentRooms.forEach(r => r.students.forEach(s => location.set(idOf(s), r.number)));
  const partners = new Map();
  for (const pair of fixedPairs || []) {
    const a = String(pair.a), b = String(pair.b);
    if (!location.has(a) || !location.has(b) || a === b || partners.has(a) || partners.has(b)) {
      throw Error('A fixed pair is missing or duplicated. Refresh the room plan.');
    }
    if (location.get(a) !== location.get(b)) throw Error('A fixed pair is in different rooms. Refresh before resizing.');
    partners.set(a, b); partners.set(b, a);
  }
  const groupsIn = room => {
    const lookup = new Map(room.students.map(s => [idOf(s), s]));
    const seen = new Set(), groups = [];
    for (const student of room.students) {
      const id = idOf(student);
      if (seen.has(id)) continue;
      const partner = partners.get(id);
      const group = partner ? [student, lookup.get(partner)] : [student];
      if (group.some(s => !s)) throw Error('Fixed pairs must stay in the same room.');
      group.forEach(s => seen.add(idOf(s)));
      groups.push(group);
    }
    return groups;
  };
  const resized = currentRooms.slice(0, count).map(r => ({
    number: r.number, name: roomName(r.number),
    students: [...r.students], facilitators: [...r.facilitators],
  }));
  const oldCount = currentRooms.length;
  const lostFacilitators = [];
  if (count < oldCount) {
    // Only students in removed rooms are moved. Every existing locked pair moves together.
    const overflow = currentRooms.slice(count);
    for (const room of overflow) lostFacilitators.push(...room.facilitators.filter(Boolean));
    const groups = overflow.flatMap(groupsIn).sort((a, b) =>
      b.length - a.length || idOf(a[0]).localeCompare(idOf(b[0]), 'en'));
    for (const group of groups) {
      const score = r => {
        const collisions = group.reduce((total, s) => total + r.students.reduce((hits, other) =>
          hits + (s.schoolKey && s.schoolKey === other.schoolKey ? 4 : 0) +
          (s.countryCode && s.countryCode === other.countryCode ? 1 : 0), 0), 0);
        return [r.students.length, collisions, r.number];
      };
      const room = resized.slice().sort((a, b) => {
        const sa = score(a), sb = score(b);
        return sa[0] - sb[0] || sa[1] - sb[1] || sa[2] - sb[2];
      })[0];
      room.students.push(...group);
    }
  } else if (count > oldCount) {
    for (let number = oldCount + 1; number <= count; number++) {
      resized.push({ number, name: roomName(number), students: [], facilitators: Array(slots).fill(null) });
    }
    // Fill new rooms with the fewest movements necessary; never reshuffle existing rooms.
    // A fixed pair is always an indivisible group.
    const newRooms = resized.slice(oldCount);
    for (const destination of newRooms) {
      while (true) {
        const candidates = [];
        for (const from of resized.slice(0, oldCount)) {
          for (const group of groupsIn(from)) {
            const before = square(from.students.length) + square(destination.students.length);
            const after = square(from.students.length - group.length) + square(destination.students.length + group.length);
            if (after >= before) continue;
            const collisions = group.reduce((n, s) => n + destination.students.filter(other =>
              (s.schoolKey && s.schoolKey === other.schoolKey) ||
              (s.countryCode && s.countryCode === other.countryCode)).length, 0);
            candidates.push({ from, group, gain: before - after, collisions });
          }
        }
        if (!candidates.length) break;
        candidates.sort((a, b) => b.gain - a.gain || a.group.length - b.group.length ||
          a.collisions - b.collisions || a.from.number - b.from.number ||
          idOf(a.group[0]).localeCompare(idOf(b.group[0]), 'en'));
        const picked = candidates[0];
        const movingIds = new Set(picked.group.map(idOf));
        picked.from.students = picked.from.students.filter(s => !movingIds.has(idOf(s)));
        destination.students.push(...picked.group);
      }
    }
  }
  // Preserve assigned facilitators in all surviving rooms and use newly freed slots.
  const assigned = new Set(resized.flatMap(r => r.facilitators.filter(Boolean).map(f => String(f.id))));
  const eligible = [...lostFacilitators, ...availableFacilitators].filter(f => f && f.id && !assigned.has(String(f.id)));
  const used = new Set();
  for (const room of resized) {
    for (let i = 0; i < room.facilitators.length; i++) {
      if (room.facilitators[i]) continue;
      const next = eligible.find(f => !used.has(String(f.id)) && !assigned.has(String(f.id)));
      if (next) {
        room.facilitators[i] = next;
        used.add(String(next.id)); assigned.add(String(next.id));
      }
    }
  }
  const finalIds = resized.flatMap(r => r.students.map(idOf));
  if (finalIds.length !== originalIds.length ||
      new Set(finalIds).size !== originalIds.length ||
      finalIds.some(id => !location.has(id))) {
    throw Error('Resize could not preserve every registered student.');
  }
  for (const [a, b] of partners) {
    if (resized.find(r => r.students.some(s => idOf(s) === a))?.number !==
        resized.find(r => r.students.some(s => idOf(s) === b))?.number) {
      throw Error('A fixed pair would be separated.');
    }
  }
  const movedStudents = finalIds.filter(id => resized.find(r =>
    r.students.some(s => idOf(s) === id))?.number !== location.get(id)).length;
  return {
    rooms: resized, movedStudents,
    emptyRooms: resized.filter(r => r.students.length === 0).length,
    previousCount: oldCount, newCount: count,
  };
}
