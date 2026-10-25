export function overviewColumnsV106(roomCount){
  if(roomCount>=25)return 7;
  if(roomCount>=19)return 5;
  if(roomCount>=13)return 4;
  return 3;
}
export function roomChoiceLabelV106(person){
  return `${person.name} · ${person.school} · Room ${String(person.room).padStart(2,'0')}`;
}
export function buildEditorDiffV106(action,first,second,room,revision){
  if(!Number.isInteger(revision)||revision<1)throw Error('Refresh the saved room plan.');
  if(!first?.id)throw Error('Select a student.');
  if(action==='pair'||action==='unpair'){
    if(!second?.id||first.id===second.id)throw Error('Choose two different students.');
    return {action,a:first.id,b:second.id,revision};
  }
  if(action==='move'){
    if(!Number.isInteger(Number(room))||Number(room)<1)throw Error('Choose the destination room.');
    return {action,a:first.id,room:Number(room),revision};
  }
  throw Error('Unknown edit action.');
}
