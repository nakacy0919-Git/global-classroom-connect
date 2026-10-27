import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('src/pages/teacher/TeacherJoinV120.js');
const css=read('src/styles/teacherSignupSimplifiedV140.css');

test('sign-in and new registration display as mutually exclusive accessible tabs',()=>{
 assert.match(ui,/id="gcc140-tab-signin" role="tab" aria-selected="true"/);
 assert.match(ui,/id="gcc140-tab-signup" role="tab" aria-selected="false"/);
 assert.match(ui,/id="gcc140-signup-pane"[^>]*hidden>/);
 assert.match(ui,/setAuthMode\(mode\)/);
 assert.match(ui,/\$\('gcc140-signin-pane'\)\.hidden=!signin/);
 assert.match(ui,/\$\('gcc140-signup-pane'\)\.hidden=signin/);
 assert.match(ui,/setAttribute\('aria-selected',String\(signin\)\)/);
 assert.match(css,/\.gcc140-auth-pane\[hidden\]\{display:none!important\}/);
});
test('UI removes redundant registration instructions and legacy invitation link',()=>{
 assert.doesNotMatch(ui,/Joining the Global Classroom core team\?/);
 assert.doesNotMatch(ui,/Your account already exists\. Finish this application/);
 assert.doesNotMatch(ui,/A successful submission displays/);
 assert.doesNotMatch(ui,/Legacy invitation registration/);
 assert.match(ui,/Fields marked \* are required\. Websites and region are optional/);
 assert.match(ui,/confirm the link sent to your email/);
});
test('action buttons are compact on desktop, phone-sized on mobile',()=>{
 for(const text of ['Sign in and continue','Create account','Submit for approval'])assert.match(ui,new RegExp(text+'.*gcc140-action|gcc140-action.*'+text));
 assert.match(css,/\.gcc140-action\{grid-column:1\/-1;justify-self:end/);
 assert.match(css,/width:auto;max-width:100%/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/\.gcc140-action\{justify-self:stretch;width:100%/);
});
test('authentication, recovery, 139 account identity guard and approval logic are preserved',()=>{
 for(const item of ['id="gcc120-signup-form"','id="gcc120-signin-form"','id="gcc120-application"','id="gcc135-resend"','id="gcc139-switch-account"'])assert.match(ui,new RegExp(item));
 for(const item of ['signupAccountV120','signinAccountV120','resendConfirmationV135','uploadApplicationPhotoV120','submitApplicationV120','assertEditableDraftV139','assertApplicantIdentityV139','hasApprovedTeacherV120'])assert.match(ui,new RegExp(item));
 assert.match(ui,/type="password" id="gcc120-password"[^>]*minlength="8" required/);
 assert.match(ui,/status\(res.status\)/);
});
test('signup confirmation activates sign-in tab and switching accounts removes autofilled credentials',()=>{
 assert.match(ui,/setAuthMode\('signin'\);\s*notify\('Check your email/);
 assert.match(ui,/\$\('gcc120-signin-form'\)\.reset\(\);\$\('gcc120-signup-form'\)\.reset\(\)/);
 assert.match(ui,/Sign in with another account/);
});
