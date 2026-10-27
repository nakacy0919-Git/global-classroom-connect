import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const script=file=>read(file).replace(/^import .*?;\s*$/gm,'').replace(/^export function /gm,'function ');

test('teacher sign-in binder does not crash on the recovery screen sharing sign-in CSS',()=>{
 const recoveryRoot={querySelector:()=>null};
 const document={querySelector(selector){
  if(selector==='#gcta-login')return null;
  if(selector==='.gcc120-signin-page')return recoveryRoot;
  return null;
 }};
 const bind=vm.runInNewContext(script('src/pages/teacher/TeacherAccessPage.js')+'\n;bindTeacherAccessPage;',{
  document,URLSearchParams,window:{location:{hash:'#/teacher-password'}}
 });
 assert.doesNotThrow(()=>bind());
});

test('recovery route mounts the recovery binder independently of generic sign-in and host binders',()=>{
 const app=read('src/app.js');
 assert.match(app,/if\(route === 'teacher-password'\)\{\s*bindTeacherPasswordPageV136\(\);\s*return;\s*\}/);
 const tail=app.slice(app.indexOf('await renderCurrentPage(',app.indexOf('export async function renderApp')));
 assert.ok(tail.indexOf('bindTeacherPasswordPageV136()')<tail.indexOf('bindUiEvents()'));
 assert.match(app,/route === 'teacher-password'/);
});

test('recovery button submits a Supabase reset request and always shows immediate feedback',async()=>{
 let handler=null;
 let called=0;
 let actualRedirect='';
 const button={disabled:false};
 const form={addEventListener(type,fn){if(type==='submit')handler=fn;},querySelector(selector){
  if(selector==='button')return button;
  return null;
 }};
 const email={value:'teacher@example.com'};
 const notice={textContent:'',classList:{toggle(){}}};
 const root={isConnected:true,querySelector(selector){
  const ids={'#gcc136-msg':notice,'#gcc136-request':form,'#gcc136-email':email};
  return ids[selector]||null;
 }};
 const document={querySelector(selector){return selector==='.gcc136-password'?root:null;}};
 const supabase={auth:{async resetPasswordForEmail(address,{redirectTo}){
  called++;actualRedirect=redirectTo;
  assert.equal(address,'teacher@example.com');
  return {data:{},error:null};
 }}};
 const window={location:{search:'',origin:'https://gcc.pic-speak-story.com',pathname:'/'}};
 const bind=vm.runInNewContext(script('src/pages/teacher/TeacherPasswordPageV136.js')+'\n;bindTeacherPasswordPageV136;',{
  document,window,supabase,Date,URLSearchParams,
  teacherSignupErrorV135:e=>e.message
 });
 bind();
 assert.equal(typeof handler,'function','the submit handler must actually attach');
 const outcome=handler({preventDefault(){},currentTarget:form});
 assert.match(notice.textContent,/Requesting a recovery email/,'display feedback before the network request settles');
 assert.equal(button.disabled,true);
 await outcome;
 assert.equal(called,1);
 assert.equal(actualRedirect,'https://gcc.pic-speak-story.com/?gcc_recovery=1');
 assert.match(notice.textContent,/recovery link has been requested/);
 assert.equal(button.disabled,false);
});

test('the recovery request does not create accounts, bypass approvals or expose private credentials',()=>{
 const recovery=read('src/pages/teacher/TeacherPasswordPageV136.js');
 const login=read('src/pages/teacher/TeacherAccessPage.js');
 assert.match(login,/document\.querySelector\('#gcta-login'\)\?\.closest/);
 assert.doesNotMatch(recovery,/auth\.admin|signUp\(|service_role|approveApplication/);
 assert.match(recovery,/resetPasswordForEmail\(/);
 assert.match(recovery,/teacherSignupErrorV135\(err\)/);
});
