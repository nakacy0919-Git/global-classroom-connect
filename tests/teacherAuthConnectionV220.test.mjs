import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  isTeacherAuthTransportErrorV220,
  checkTeacherAuthConnectionV220,
} from '../src/lib/teacherAuthConnectionV220.js';

const url='https://example-ref.supabase.co';

test('teacher sign-in distinguishes transport errors from invalid credentials',()=>{
  assert.equal(isTeacherAuthTransportErrorV220({name:'AuthRetryableFetchError',message:'Failed to fetch'}),true);
  assert.equal(isTeacherAuthTransportErrorV220(new TypeError('NetworkError when attempting to fetch resource')),true);
  assert.equal(isTeacherAuthTransportErrorV220({message:'Invalid login credentials'}),false);
  assert.equal(isTeacherAuthTransportErrorV220({code:'email_not_confirmed'}),false);
});

test('connection check uses a credential-free request to the configured auth gateway',async()=>{
  let calls=0;
  const result=await checkTeacherAuthConnectionV220({
    url,
    fetcher:async(target,options)=>{
      calls++;
      assert.equal(target,url+'/auth/v1/health');
      assert.equal(options.method,'GET');
      assert.equal(options.credentials,'omit');
      assert.equal(options.cache,'no-store');
      assert.equal(options.body,undefined);
      assert.equal(options.headers,undefined);
      return {status:200};
    },
  });
  assert.equal(calls,1);
  assert.equal(result.kind,'reachable');
});

test('an HTTP response is distinguishable from a failed network request',async()=>{
  const reachable=await checkTeacherAuthConnectionV220({url,fetcher:async()=>({status:401})});
  assert.equal(reachable.kind,'reachable');
  const down=await checkTeacherAuthConnectionV220({url,fetcher:async()=>({status:503})});
  assert.equal(down.kind,'server');
  assert.match(down.message,/HTTP 503/);
  const blocked=await checkTeacherAuthConnectionV220({url,fetcher:async()=>{throw new TypeError('Failed to fetch');}});
  assert.equal(blocked.kind,'unreachable');
  assert.match(blocked.message,/another network/);
});

test('offline or missing configuration does not trigger authentication requests',async()=>{
  const forbidden=async()=>{throw new Error('Should not fetch');};
  assert.equal((await checkTeacherAuthConnectionV220({url,online:false,fetcher:forbidden})).kind,'offline');
  assert.equal((await checkTeacherAuthConnectionV220({url:'',fetcher:forbidden})).kind,'configuration');
  assert.equal((await checkTeacherAuthConnectionV220({url:'http://example.com',fetcher:forbidden})).kind,'configuration');
});

test('unresponsive auth requests abort and return a timeout diagnosis',async()=>{
  const result=await checkTeacherAuthConnectionV220({
    url,
    timeoutMs:15,
    fetcher:(_target,{signal})=>new Promise((_resolve,reject)=>{
      signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})),{once:true});
    }),
  });
  assert.equal(result.kind,'unreachable');
  assert.match(result.message,/did not respond in time/);
});

test('teacher login displays a compact on-demand diagnostic only for network failures',()=>{
  const page=fs.readFileSync(new URL('../src/pages/teacher/TeacherAccessPage.js',import.meta.url),'utf8');
  const css=fs.readFileSync(new URL('../src/styles/teacherLoginOceanV144.css',import.meta.url),'utf8');
  assert.match(page,/id="gcta-check-connection"[^>]+hidden/);
  assert.match(page,/checkTeacherAuthConnectionV220\(\{url:supabase\?\.supabaseUrl\}\)/);
  assert.match(page,/checkButton\.hidden=!connectionFailure/);
  assert.match(page,/You do not need to create another account/);
  assert.match(page,/teacherSignIn\(/);
  assert.match(css,/\.gcc144-connection-check\[hidden\]/);
});
