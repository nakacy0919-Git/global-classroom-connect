import {countries} from '../data/countries.js';

// The official GCC country catalog stays the single source of country names.
const normalize = name => String(name ?? '').trim().toLocaleLowerCase('en-US').replace(/\s+/g,' ');
const isoCodes = new Map(countries.map(({code,name})=>[normalize(name),String(code).toUpperCase()]));
const aliases = new Map([
  ['usa','US'],['u.s.a.','US'],['united states','US'],['united states of america','US'],
  ['uk','GB'],['united kingdom','GB'],['great britain','GB'],['south korea','KR'],['north korea','KP'],
  ['russia','RU'],['viet nam','VN'],['the philippines','PH'],['ivory coast','CI'],
  ['czech republic','CZ'],['taiwan','TW'],['bolivia (plurinational state of)','BO']
]);
export function countryIsoCode(name) {
  const key=normalize(name);
  return isoCodes.get(key) || aliases.get(key) || (/^[a-z]{2}$/.test(key) ? key.toUpperCase() : '');
}
export function countryFlagEmoji(name){
  const iso=countryIsoCode(name);
  return iso ? [...iso].map(letter=>String.fromCodePoint(127397+letter.charCodeAt(0))).join('') : '🌐';
}
