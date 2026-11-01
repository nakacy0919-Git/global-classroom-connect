// Teacher Mode V19.6: keep client validation aligned with gcc_v7_english_name.
export function cleanStudentNameV196(value) {
 const name=String(value??'').trim();
 if(name.length<2||name.length>120||!/^[A-Za-z][A-Za-z .,'-]*$/.test(name)){
  throw new Error('Use English letters for the student name (2–120 characters).');
 }
 return name;
}
