// 197 SVG images are bundled into the GCC build, not loaded from an external CDN.
import {countryCodeForFlagV131} from './countryFlagCodeV131.js';
import unknownFlagAssetV131 from '../assets/room-flags/unknown.svg';
const files=import.meta.glob('../assets/world-flags-v131/*.svg',{eager:true,query:'?url',import:'default'});
const flags=Object.freeze(Object.fromEntries(Object.entries(files).map(([path,url])=>[path.slice(-6,-4).toUpperCase(),url])));
export {unknownFlagAssetV131};
export function countryFlagAssetV131(name,code=''){
 const iso=countryCodeForFlagV131(name,code);
 return iso?flags[iso]||unknownFlagAssetV131:unknownFlagAssetV131;
}
