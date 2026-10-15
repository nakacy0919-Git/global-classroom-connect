// Pasted spreadsheet rows: Name [TAB Grade], CSV, or one name per line.
export function parseRoster(raw) {
  const lines=String(raw??'').replace(/\r/g,'').split('\n');
  const records=[];const invalid=[];
  for(let i=0;i<lines.length;i++) {
    const line=lines[i].trim(); if(!line)continue;
    let cells=line.includes('\t') ? line.split('\t') : csvCells(line);
    cells=cells.map(s=>s.replace(/^"|"$/g,'').trim());
    if(i===0 && /^((full\s*)?name|student\s*name|氏名|名前)$/i.test(cells[0]))continue;
    const [name,grade='']=cells;
    if(cells.length>2||!name||name.length>120||grade.length>40){invalid.push(i+1);continue;}
    records.push({name,grade});
  }
  return {records,invalid};
}
function csvCells(line){
 const fields=[];let value='',quoted=false;
 for(let i=0;i<line.length;i++){
  const c=line[i];
  if(c==='"'){if(quoted && line[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){fields.push(value);value='';}
  else value+=c;
 }
 fields.push(value);
 return fields;
}
export function parseFacilitators(raw){
 return [...new Set(String(raw??'').split(/[\r\n]+/).map(x=>x.trim()).filter(Boolean))];
}
export function isIdentityComplete(o){
 return String(o?.teacher||'').trim().length>=2 && String(o?.school||'').trim().length>=2 && /^[A-Z]{2}$/.test(o?.country||'');
}
