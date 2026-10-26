// The single GCC 197-country master defines which country flags are supported.
import {countries} from '../data/countries.js';
import {countryIsoCode} from './roomCountryFlagsV104.js';
export const gccFlagCountriesV131=Object.freeze(countries.map(c=>c.code));
const supported=new Set(gccFlagCountriesV131);
export function countryCodeForFlagV131(countryName,explicitCode=''){
 const code=String(explicitCode||'').trim().toUpperCase();
 if(supported.has(code))return code;
 const guessed=countryIsoCode(countryName);
 return supported.has(guessed)?guessed:'';
}
