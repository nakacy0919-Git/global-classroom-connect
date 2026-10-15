// A–Z only for personal names. Commas support spreadsheet "Family, Given" format.
export function englishName(s){
  return typeof s==='string' && s.trim().length>=2 && s.trim().length<=120 &&
    /^[A-Za-z][A-Za-z ,.'-]*$/.test(s.trim());
}
function csvLine(line){
  const result=[];let current='',quoted=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c==='"'){
      if(quoted && line[i+1]==='"'){current+='"';i++;}
      else quoted=!quoted;
    } else if(c===','&&!quoted){result.push(current.trim());current='';}
    else current+=c;
  }
  result.push(current.trim());
  return quoted?null:result;
}
export function parseSimpleRoster(text){
  const lines=String(text??'').replace(/\r/g,'').split('\n');
  const records=[],errors=[];
  for(let i=0;i<lines.length;i++){
    const raw=lines[i].trim(); if(!raw)continue;
    const cells=raw.includes('\t')?raw.split('\t').map(x=>x.trim()):csvLine(raw);
    if(!cells){errors.push({line:i+1,message:'Check CSV quotation marks.'});continue;}
    if(i===0 && /^(name|full name|student name)$/i.test(cells[0].trim()))continue;
    const [name,grade='']=cells;
    if(cells.length>2){errors.push({line:i+1,message:'Use 1 or 2 columns: name and optional grade.'});continue;}
    if(!englishName(name)){errors.push({line:i+1,message:'Write the name with A–Z letters only.'});continue;}
    if(grade.length>40){errors.push({line:i+1,message:'Grade is too long.'});continue;}
    records.push({name:name.trim(),grade:grade.trim()});
  }
  return {records,errors};
}
export function parseSimpleFacilitators(text){
  const records=[],errors=[],seen=new Set();
  for(const [i,value] of String(text??'').replace(/\r/g,'').split('\n').entries()){
    const name=value.trim();if(!name)continue;
    if(!englishName(name)){errors.push({line:i+1,message:'Write facilitator names with A–Z letters.'});continue;}
    if(seen.has(name.toLowerCase()))continue;
    seen.add(name.toLowerCase());records.push(name);
  }
  if(records.length>50)errors.push({line:0,message:'Maximum 50 facilitators.'});
  return {records,errors};
}
