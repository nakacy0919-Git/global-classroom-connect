import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL('../supabase/migrations/20261105_gcc_v2191_claim_email_recipient_text.sql',import.meta.url),'utf8');

test('V21.9.1 casts Auth varchar email to text for declared RPC return type',()=>{
 assert.match(sql,/RETURNS TABLE\(request_id uuid,lease_token uuid,recipient_email text\)/);
 assert.match(sql,/THEN u\.email::text ELSE NULL::text END AS recipient_email/);
 assert.match(sql,/JOIN public\.teachers t ON t\.id=c\.host_teacher_id/);
 assert.match(sql,/LEFT JOIN auth\.users u ON u\.id=t\.auth_user_id/);
});
test('mail claim patch keeps request authorization and queue semantics untouched',()=>{
 assert.match(sql,/FOR UPDATE OF j SKIP LOCKED/);
 assert.match(sql,/j\.attempts<5/);
 assert.match(sql,/j\.lease_expires_at<now\(\)/);
 assert.match(sql,/r\.status='pending'/);
 assert.match(sql,/a\.starts_at>now\(\)/);
 assert.doesNotMatch(sql,/GRANT EXECUTE|DROP TABLE|CREATE TRIGGER|ALTER TABLE/);
});
