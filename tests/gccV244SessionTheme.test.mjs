import test from 'node:test';import assert from 'node:assert/strict';
import {THEME_TYPES_V244,validateThemeV244,sessionTopicV244} from '../src/lib/sessionThemeV244.js';
import {SESSION_TYPES_V203} from '../src/lib/sessionPlannerV203.js';
test('all theme classifications use existing server session type enum',()=>{
 assert.equal(Object.keys(THEME_TYPES_V244).length,6);
 for(const type of Object.values(THEME_TYPES_V244))assert.ok(SESSION_TYPES_V203.some(([v])=>v===type));
 assert.equal(THEME_TYPES_V244['Mystery Skype'],'other');
});
test('Other requires custom text; normal theme ignores stale custom text',()=>{
 assert.equal(validateThemeV244('Free Topic','  '),'Enter a specific topic for Other.');
 assert.equal(validateThemeV244('Free Topic','School exchange'),'');
 assert.equal(validateThemeV244('SDGs',''),'');
 assert.equal(validateThemeV244('unknown',''),'Choose a session theme.');
 assert.equal(sessionTopicV244('Free Topic',' School exchange '),'School exchange');
 assert.equal(sessionTopicV244('SDGs','Stale custom topic'),'SDGs');
});
