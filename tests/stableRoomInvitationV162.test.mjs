import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261028_stable_room_invitation_v162.sql');
const host=read('src/pages/host/SimpleSessionsPage.js');
test('republishing retains original token and six-digit code hash',()=>{
 assert.match(sql,/SELECT p\.revision,p\.is_active,p\.token_hash INTO v_existing/);
 assert.match(sql,/IF NOT v_existing\.is_active THEN/);
 assert.match(sql,/UPDATE public\.gcc_v102_shared_plans SET revision=v_revision,zoom_url=p_zoom_url/);
 assert.match(sql,/UPDATE public\.gcc_v104_shared_access SET revision=v_revision/);
 assert.match(sql,/'existing_link',true,'code_unchanged',true/);
 assert.doesNotMatch(sql,/ON CONFLICT\(event_id\) DO UPDATE SET revision=EXCLUDED\.revision,token_hash/);
});
test('existing issued code cannot be replaced by another six-digit number',()=>{
 assert.match(sql,/SELECT a\.enabled,a\.expires_at INTO v_existing/);
 assert.match(sql,/IF NOT v_existing\.enabled OR v_existing\.expires_at<=now\(\) THEN/);
 assert.match(sql,/'already_issued',true,'code',NULL/);
 assert.doesNotMatch(sql,/ON CONFLICT\(event_id\) DO UPDATE SET publication_hash=EXCLUDED/);
});
test('host cannot accidentally rotate existing link or code',()=>{
 assert.match(host,/Update published rooms \/ Zoom \(keep same link\)/);
 assert.match(host,/if\(saved\.token\)/);
 assert.match(host,/if\(r\?\.already_issued\)/);
 assert.doesNotMatch(host,/Replace 6-digit code|Replace private link|Create fresh invitation link/);
 assert.match(host,/The original invitation link and access code remain unchanged/);
});
