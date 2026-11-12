import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkRoomChartConnectionV224} from '../src/lib/roomChartNetworkDiagnosticV224.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const service=read('src/services/sharePlanV102.js');
const page=read('src/pages/public/RoomPlanLookupPage.js');

test('public charts use an isolated anonymous client and never depend on stored teacher auth',()=>{
 assert.match(service,/createClient\(import\.meta\.env\.VITE_SUPABASE_URL, import\.meta\.env\.VITE_SUPABASE_PUBLISHABLE_KEY/);
 assert.match(service,/persistSession:false/);
 assert.match(service,/autoRefreshToken:false/);
 assert.match(service,/detectSessionInUrl:false/);
 assert.match(service,/publicChartClient\.rpc\('gcc_v112_open_room_chart'/);
 assert.doesNotMatch(service,/openSharedRoomChart=\(token,code\)=>runRpc/);
 assert.match(service,/return data;/);
 assert.match(service,/getHostInvitation=eventId=>runRpc/);
 assert.match(service,/publishRoomShare=\(eventId,revision,zoomUrl\)=>runRpc/);
});

test('connection probe sends no invitation code or student information',async()=>{
 let calls=[];
 const result=await checkRoomChartConnectionV224({
  url:'https://project-ref.supabase.co',publishableKey:'sb_publishable_test',
  origin:'https://gcc.example.org',
  fetcher:async(url,options)=>{
   calls.push({url,options});
   assert.equal(url,'https://project-ref.supabase.co/rest/v1/rpc/gcc_v112_open_room_chart');
   assert.equal(options.method,'POST');
   assert.equal(options.credentials,'omit');
   assert.equal(options.cache,'no-store');
   assert.deepEqual(JSON.parse(options.body),{p_token:'',p_access_code:''});
   return {ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>null};
  },
 });
 assert.equal(calls.length,1);
 assert.equal(result.kind,'reachable');
});

test('school device request failure and healthy GCC server are distinguished',async()=>{
 const result=await checkRoomChartConnectionV224({
  url:'https://project-ref.supabase.co',publishableKey:'sb_publishable_test',
  origin:'https://gcc.example.org',
  fetcher:async(url,options)=>{
   if(url.includes('/rest/v1/'))throw new TypeError('Failed to fetch');
   assert.equal(url,'https://gcc.example.org/api/gcc-auth-health');
   assert.equal(options.method,'GET');
   assert.equal(options.credentials,'omit');
   return {ok:true,json:async()=>({status:'reachable'})};
  },
 });
 assert.equal(result.kind,'possible-school-filter');
 assert.match(result.message,/school ICT administrator/);
 assert.match(result.message,/\/rest\/v1\//);
});

test('unhealthy GCC server does not incorrectly identify a device filter',async()=>{
 const result=await checkRoomChartConnectionV224({
  url:'https://project-ref.supabase.co',publishableKey:'sb_publishable_test',
  origin:'https://gcc.example.org',
  fetcher:async(url)=>{
   if(url.includes('/rest/v1/'))throw new Error('connection');
   return {ok:true,json:async()=>({status:'upstream_unreachable'})};
  },
 });
 assert.equal(result.kind,'service-unreachable');
});

test('blocked HTML page with HTTP 200 is not a success',async()=>{
 const result=await checkRoomChartConnectionV224({
  url:'https://project-ref.supabase.co',publishableKey:'sb_publishable_test',
  origin:'http://not-https.example.org',
  fetcher:async()=>({ok:true,status:200,headers:{get:()=> 'text/html'},json:async()=>{throw Error('not JSON')}}),
 });
 assert.equal(result.kind,'unreachable');
 assert.match(result.message,/non-API response/);
});

test('invalid project configuration cannot start a diagnostic request',async()=>{
 let calls=0;
 const result=await checkRoomChartConnectionV224({
  url:'http://project-ref.supabase.co',publishableKey:'sb_publishable_test',
  fetcher:async()=>{calls++;throw Error('should not fetch')},
 });
 assert.equal(result.kind,'configuration');
 assert.equal(calls,0);
});

test('room-chart check is optional and private room data remains gated',()=>{
 assert.match(page,/id="gcc-v224-check-connection"[^>]*hidden/);
 assert.match(page,/id="gcc-v224-connection-result"[^>]*hidden/);
 assert.match(page,/connectionButton\.hidden=!networkProblem/);
 assert.match(page,/checkRoomChartConnectionV224\(/);
 assert.match(page,/id="gcc-v104-chart" hidden/);
 assert.match(page,/if\(!data\|\|!Array\.isArray\(data\.rooms\)\)/);
 assert.match(page,/netiquetteGuideV146\.show/);
 assert.doesNotMatch(page,/localStorage|sessionStorage|\.innerHTML|document\.write/);
});
