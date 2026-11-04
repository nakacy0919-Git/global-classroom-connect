import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 REVIEW_URL_V219,NOTIFICATION_SUBJECT_V219,buildHostJoinRequestEmailV219,
 classifyResendFailureV219,errorCodeV219,idempotencyKeyV219
} from '../supabase/functions/_shared/requestEmailV219.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const migration=read('supabase/migrations/20261104_gcc_v219_host_join_email_outbox.sql');
const worker=read('supabase/functions/gcc-join-request-email/index.ts');
const activation=read('supabase/manual-activation/gcc-v219-enable-mail.sql');
const manual=read('docs/gcc-v219-host-email-setup.md');

test('host email links to logged-in GCC join-request review, without student PII',()=>{
 const out=buildHostJoinRequestEmailV219('Global Classroom <notifications@example.org>','host@example.com');
 assert.deepEqual(out.to,['host@example.com']);
 assert.equal(out.subject,NOTIFICATION_SUBJECT_V219);
 assert.equal(REVIEW_URL_V219,'https://gcc.pic-speak-story.com/#/teacher-portal?view=requests');
 assert.match(out.text,/requested to join/);
 assert.match(out.text,/Please sign in/);
 assert.match(out.text,/Join Requests/);
 assert.ok(out.text.includes(REVIEW_URL_V219));
 for(const field of ['student_name','teacher_name','meeting_password','age_range','join_token'])
  assert.doesNotMatch(JSON.stringify(out),new RegExp(field,'i'));
 assert.throws(()=>buildHostJoinRequestEmailV219('bad','host@example.com'),/sender/);
 assert.throws(()=>buildHostJoinRequestEmailV219('notifications@example.org','bad-email'),/recipient/);
 assert.throws(()=>buildHostJoinRequestEmailV219('a@example.org\nBcc:attack@example.org','host@example.com'),/sender/);
});

test('resend failure classification retries transient errors and stops permanent errors',()=>{
 for(const s of [408,425,429,500,502,503,504])
  assert.equal(classifyResendFailureV219(s),'retry');
 for(const s of [400,401,403,404,422])
  assert.equal(classifyResendFailureV219(s),'failed');
 assert.equal(classifyResendFailureV219(409,'concurrent_idempotent_requests'),'retry');
 assert.equal(classifyResendFailureV219(409,'invalid_idempotent_request'),'failed');
 assert.equal(errorCodeV219(429,'Rate limited; host@example.com'),'http_429_ratelimitedhostexamplecom');
 const id='543184ab-29d9-467e-a8cd-8e0d49b4fe04';
 assert.equal(idempotencyKeyV219(id),'gcc-join-request-'+id);
 assert.throws(()=>idempotencyKeyV219('not-a-request-id'),/invalid_request_id/);
});

test('one request creates one persistent mail job and role is service-only',()=>{
 assert.match(migration,/request_id uuid PRIMARY KEY REFERENCES public\.session_join_requests\(id\)/);
 assert.match(migration,/AFTER INSERT ON public\.session_join_requests/);
 assert.match(migration,/ON CONFLICT \(request_id\) DO NOTHING/);
 assert.match(migration,/AFTER UPDATE OF status ON public\.session_join_requests/);
 assert.match(migration,/REVOKE ALL ON TABLE public\.gcc_v219_request_email_jobs FROM PUBLIC,anon,authenticated/);
 assert.match(migration,/ENABLE ROW LEVEL SECURITY/);
 assert.match(migration,/REVOKE ALL ON FUNCTION public\.gcc_v219_claim_request_emails\(integer\) FROM PUBLIC,anon,authenticated/);
 assert.match(migration,/GRANT EXECUTE ON FUNCTION public\.gcc_v219_claim_request_emails\(integer\) TO service_role/);
 assert.match(migration,/FOR UPDATE OF j SKIP LOCKED/);
 assert.match(migration,/j\.attempts<5/);
 assert.match(migration,/u\.email_confirmed_at IS NOT NULL/);
 assert.match(migration,/WHERE j\.request_id=p_request_id AND j\.lease_token=p_lease_token/);
 assert.doesNotMatch(migration,/CREATE TRIGGER .*mail.* ON public\.teachers/);
});

test('worker authenticates private webhook and uses service-role RPC, never browser credentials',()=>{
 assert.match(worker,/matchingToken\(token,Deno\.env\.get\('GCC_MAIL_WEBHOOK_TOKEN'\)/);
 assert.match(worker,/if\(req\.method!=='POST'\)/);
 assert.match(worker,/RESEND_API_KEY/);
 assert.match(worker,/GCC_MAIL_FROM/);
 assert.match(worker,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(worker,/gcc_v219_claim_request_emails/);
 assert.match(worker,/gcc_v219_finish_request_email/);
 assert.match(worker,/Idempotency-Key/);
 assert.match(worker,/https:\/\/api\.resend\.com\/emails/);
 assert.doesNotMatch(worker,/console\.log\(.*recipient_email/);
 assert.doesNotMatch(worker,/JSON\.stringify\(.*job\)/);
});

test('activation requires private token, outbox retry and verified sender setup',()=>{
 assert.match(activation,/Missing gcc_mail_webhook_token/);
 assert.match(activation,/CREATE EXTENSION IF NOT EXISTS pg_net/);
 assert.match(activation,/CREATE EXTENSION IF NOT EXISTS pg_cron/);
 assert.match(activation,/cron\.schedule/);
 assert.match(activation,/WHERE EXISTS \(/);
 assert.match(activation,/ON public\.gcc_v219_request_email_jobs/);
 assert.match(manual,/RESEND_API_KEY/);
 assert.match(manual,/GCC_MAIL_FROM/);
 assert.match(manual,/verification/);
 assert.match(manual,/automatic email delivery is not live/i);
});
