import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/gcc-auth-health.js';
import {checkTeacherAuthConnectionV220} from '../src/lib/teacherAuthConnectionV220.js';

const fakeResponse=()=>({
  headers:{},statusCode:200,body:null,
  setHeader(key,value){this.headers[key]=value;},
  status(code){this.statusCode=code;return this;},
  json(data){this.body=data;return this;},
});
const withEnvironment=async (variables, fn)=>{
  const prior={url:process.env.VITE_SUPABASE_URL,key:process.env.VITE_SUPABASE_PUBLISHABLE_KEY,fetch:globalThis.fetch};
  try{
    process.env.VITE_SUPABASE_URL=variables.url;
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY=variables.key;
    globalThis.fetch=variables.fetcher;
    await fn();
  }finally{
    if(prior.url===undefined)delete process.env.VITE_SUPABASE_URL;else process.env.VITE_SUPABASE_URL=prior.url;
    if(prior.key===undefined)delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;else process.env.VITE_SUPABASE_PUBLISHABLE_KEY=prior.key;
    globalThis.fetch=prior.fetch;
  }
};

test('only GET is allowed and diagnostics never accept browser input',async()=>{
  let calls=0;
  await withEnvironment({
    url:'https://demo-ref.supabase.co',key:'sb_publishable_test',
    fetcher:async()=>{calls++;throw Error('must not call');},
  },async()=>{
    const res=fakeResponse();
    await handler({method:'POST',body:{email:'should-not-use',password:'should-not-use'}},res);
    assert.equal(res.statusCode,405);
    assert.equal(res.headers.Allow,'GET');
    assert.equal(calls,0);
  });
});

test('server probe rejects non-Supabase or HTTP upstream even with configured key',async()=>{
  for(const url of ['https://example.com','http://demo-ref.supabase.co','https://demo-ref.supabase.co.evil.com']){
    await withEnvironment({
      url,key:'sb_publishable_test',
      fetcher:async()=>{throw Error('must not call');},
    },async()=>{
      const res=fakeResponse();
      await handler({method:'GET'},res);
      assert.equal(res.statusCode,503);
      assert.equal(res.body.status,'not_configured');
    });
  }
});

test('healthy server probe accepts only GoTrue JSON and never returns secrets',async()=>{
  let calls=0;
  await withEnvironment({
    url:'https://demo-ref.supabase.co',
    key:'sb_publishable_test',
    fetcher:async(endpoint,options)=>{
      calls++;
      assert.equal(endpoint.href,'https://demo-ref.supabase.co/auth/v1/health');
      assert.equal(options.method,'GET');
      assert.equal(options.headers.apikey,'sb_publishable_test');
      assert.equal(options.body,undefined);
      return {ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>({name:'GoTrue',version:'test'})};
    },
  },async()=>{
    const res=fakeResponse();
    await handler({method:'GET'},res);
    assert.equal(calls,1);
    assert.equal(res.statusCode,200);
    assert.equal(res.body.status,'reachable');
    assert.equal(res.headers['Cache-Control'],'private, no-store, max-age=0');
    assert.doesNotMatch(JSON.stringify(res.body),/sb_publishable_test/);
  });
});

test('a managed proxy block page is not mistaken for a reachable auth service',async()=>{
  await withEnvironment({
    url:'https://demo-ref.supabase.co',key:'sb_publishable_test',
    fetcher:async()=>({ok:true,status:200,headers:{get:()=> 'text/html'}}),
  },async()=>{
    const res=fakeResponse();
    await handler({method:'GET'},res);
    assert.equal(res.body.status,'upstream_error');
  });
});

test('school browser is classified separately when GCC server reaches the service',async()=>{
  const calls=[];
  const diagnostic=await checkTeacherAuthConnectionV220({
    url:'https://demo-ref.supabase.co',
    origin:'https://gcc.example.org',
    fetcher:async(url,options)=>{
      calls.push({url,options});
      if(url==='https://demo-ref.supabase.co/auth/v1/health')throw new TypeError('Failed to fetch');
      assert.equal(url,'https://gcc.example.org/api/gcc-auth-health');
      return {ok:true,json:async()=>({status:'reachable'})};
    },
  });
  assert.equal(diagnostic.kind,'managed-network');
  assert.match(diagnostic.message,/school ICT administrator/);
  assert.equal(calls.length,2);
  for(const call of calls){
    assert.equal(call.options.method,'GET');
    assert.equal(call.options.credentials,'omit');
    assert.equal(call.options.body,undefined);
  }
});

test('both paths failing does not incorrectly blame the school device',async()=>{
  const diagnostic=await checkTeacherAuthConnectionV220({
    url:'https://demo-ref.supabase.co',origin:'https://gcc.example.org',
    fetcher:async(url)=>url.includes('/api/gcc-auth-health')
      ? {ok:true,json:async()=>({status:'upstream_unreachable'})}
      : Promise.reject(new TypeError('Failed to fetch')),
  });
  assert.equal(diagnostic.kind,'service-unreachable');
  assert.doesNotMatch(diagnostic.message,/This points to filtering/);
});
