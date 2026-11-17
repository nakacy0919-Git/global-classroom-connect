import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('GCC teacher signups carry only an origin marker, never an authorization claim',()=>{
 const js=read('src/services/teacherOnboardingV120.js');
 assert.match(js,/auth\.signUp\(\{email:email\.trim\(\)\.toLowerCase\(\),password,options:\{data:\{gcc_registration_source:'global-classroom-connect'\}\}\}\)/);
 assert.doesNotMatch(js,/admin_role|grant_host|host_admin/i);
});

test('admin account search lists only GCC-linked/marked users and checks server-side host status',()=>{
 const sql=read('sql/gcc_v226_registration_console.sql');
 assert.match(sql,/PERFORM public\.gcc_v6_require_host\(\)/);
 assert.match(sql,/WHERE a\.user_id IS NOT NULL OR t\.id IS NOT NULL/);
 assert.match(sql,/u\.raw_user_meta_data->>'gcc_registration_source'='global-classroom-connect'/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.gcc_v226_registration_console/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.gcc_v226_registration_console[\s\S]*TO authenticated/);
});

test('five trigger-only functions are hardened without dropping their triggers',()=>{
 const sql=read('sql/gcc_v232_restrict_trigger_execute.sql');
 const names=[
  'gcc_v203_enforce_event_deadline','gcc_v203_enforce_offer_deadline',
  'gcc_v203_require_open_offer_plan','gcc_v203_require_published_event_plan',
  'rls_auto_enable'
 ];
 for(const name of names)
  assert.match(sql,new RegExp('REVOKE EXECUTE ON FUNCTION public\\.'+name+'\\(\\)'));
 assert.doesNotMatch(sql,/DROP (EVENT )?TRIGGER|ALTER TABLE .* DISABLE TRIGGER/i);
 assert.match(read('.github/workflows/gcc-regression.yml'),/gcc_v232_trigger_assertions\.sql/);
});
