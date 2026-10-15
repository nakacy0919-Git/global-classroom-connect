// A-Z spelling of people's names, including spaces, commas (Surname, Given), and common punctuation.
export function isEnglishName(value) {
  const name = String(value ?? '').trim();
  return name.length >= 2 && name.length <= 120 && /^[A-Za-z][A-Za-z .,'-]*$/.test(name);
}

export function findInvalidEnglishNames(records) {
  return (records || []).map((item, index) => ({index: index + 1, name: item?.name ?? ''}))
    .filter(item => !isEnglishName(item.name));
}
