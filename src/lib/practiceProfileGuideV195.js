// GCC V19.5 — Just-in-time profile registration for personalizable phrases.
// Values are kept in GCC's existing local profile object, not a new database.
export const PRACTICE_PROFILE_FIELDS = Object.freeze({
  name: Object.freeze({label:'Name / 名前', ja:'名前', prompt:'名前を登録しましょう', example:'Sara', maxLength:70}),
  school: Object.freeze({label:'School / 学校名', ja:'学校名', prompt:'学校名を登録しましょう', example:'Sakura High School', maxLength:120}),
  hobby: Object.freeze({label:'Hobby / 趣味', ja:'趣味', prompt:'趣味を登録しましょう', example:'playing soccer', maxLength:80}),
  hometown: Object.freeze({label:'Hometown / 出身地', ja:'出身地', prompt:'出身地を登録しましょう', example:'Aichi, Japan', maxLength:100}),
  schoolDescription: Object.freeze({label:'About your school / 学校紹介', ja:'学校紹介', prompt:'学校の特徴を登録しましょう', example:'students enjoy international exchanges', maxLength:220}),
});

/** Return missing fields in the order they first appear in the current English template. */
export function missingPracticeProfileFields(template, profile = {}) {
  const present = profile && typeof profile === 'object' ? profile : {};
  const result = [];
  const re = /\{(name|school|hobby|hometown|schoolDescription)\}/g;
  for (const match of String(template || '').matchAll(re)) {
    const key = match[1];
    if (!String(present[key] ?? '').trim() && !result.includes(key)) result.push(key);
  }
  return result;
}

export function practiceProfileFieldInfo(field) {
  return PRACTICE_PROFILE_FIELDS[field] || null;
}
