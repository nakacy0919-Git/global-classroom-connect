import test from 'node:test';import assert from 'node:assert/strict';
import {isEnglishName,findInvalidEnglishNames} from '../src/lib/englishNames.js';
test('accepts English names with common punctuation',()=>{
 for(const n of ['Maria Santos','John O\'Connor','Mary-Jane Smith','J. P. Morgan','Santos, Maria'])assert.equal(isEnglishName(n),true,n);
});
test('rejects Japanese, accented and other non A-Z names',()=>{
 for(const n of ['山田 太郎','María Santos','Nguyễn Văn A','محمد','李','A🇯🇵',''])assert.equal(isEnglishName(n),false,n);
});
test('reports invalid rows',()=>{
 assert.deepEqual(findInvalidEnglishNames([{name:'Alice Brown'},{name:'田中 一郎'},{name:'Bob Smith'}]),[{index:2,name:'田中 一郎'}]);
});

test('quoted spreadsheet family-first names remain valid English names',()=>{
 assert.equal(isEnglishName('Santos, Maria'),true);
 assert.equal(isEnglishName('Santos, マリア'),false);
});
