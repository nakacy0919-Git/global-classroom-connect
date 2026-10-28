import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const main=read('src/main.js'),app=read('src/app.js'),header=read('src/components/Header.js');
const host=read('src/components/Sidebar.js'),teacher=read('src/pages/teacher/TeacherSidebar.js');
const css=read('src/styles/mobileExperienceV152.css'),nav=read('src/lib/mobileNavigationV152.js');
test('responsive rules load after legacy page styles for every route',()=>{
 assert.match(main,/import '\.\/styles\/mobileExperienceV152\.css'/);
 assert.ok(main.indexOf('mobileExperienceV152.css')>main.indexOf('academicPop.css'));
 assert.match(app,/bindMobileNavigationV152\(\)/);
 assert.match(app,/gcc-mobile-nav-backdrop/);
 assert.match(css,/@media \(max-width:920px\)/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/@media\(max-width:375px\)/);
});
test('teacher and host sidebars remain accessible as one offcanvas menu on phones',()=>{
 assert.match(header,/id="gcc-mobile-menu-button"/);
 assert.match(header,/aria-controls="gcc-mobile-sidebar"/);
 assert.match(header,/aria-expanded="false"/);
 for(const page of [host,teacher]){
  assert.match(page,/id="gcc-mobile-sidebar"/);
  assert.match(page,/gcc-mobile-drawer-close/);
  assert.match(page,/aria-label="Close navigation menu"/);
 }
 for(const target of ['create','find','requests','network','volunteer'])assert.match(teacher,new RegExp("'"+target+"'"));
 assert.match(css,/\.app-shell>\.sidebar\.gcc-mobile-drawer-open/);
 assert.match(css,/visibility:hidden/);
 assert.match(css,/visibility:visible/);
 assert.match(css,/env\(safe-area-inset-top\)/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
});
test('drawer closes on navigation, outside tap, Escape and desktop rotation',()=>{
 assert.match(nav,/activeController\?\.abort\(\)/);
 assert.match(nav,/const media=window\.matchMedia\('\(max-width: 920px\)'\)/);
 assert.match(nav,/event\.key==='Escape'/);
 assert.match(nav,/event\.key!=='Tab'/);
 assert.match(nav,/sidebar\.addEventListener\('click'/);
 assert.match(nav,/overlay\.addEventListener\('click'/);
 assert.match(nav,/media\.addEventListener\?\.\('change'/);
 assert.match(nav,/window\.addEventListener\('hashchange'/);
 assert.match(nav,/openButton\.setAttribute\('aria-expanded'/);
 assert.match(nav,/aria-live|overlay\.hidden=!visible/);
});
test('small-phone session forms stack and provide touch-friendly navigation',()=>{
 for(const selector of ['gcs150-create','gct-fields','gcs150-mode-grid','gcs150-steps','gct-form-actions','gcs150-clock-pair','gcs151-discover-modes','gcs151-map-stage']){
  assert.ok(css.includes(selector),selector);
 }
 assert.match(css,/font-size:16px/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/max-width:100%/);
 assert.match(css,/overflow-wrap:anywhere/);
 assert.match(css,/gctp-back\[hidden\]/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('landing, sign-in, signup and shared workspace are all covered',()=>{
 for(const name of ['gcc117-welcome','gcc117-choices','gcc144-page','gcc143-login-scene','gcc120-page','gct-portal','topbar','main-shell']){
  assert.ok(css.includes(name),name);
 }
 assert.match(css,/gcc144-actions/);
 assert.match(css,/gcc143-login-form/);
 assert.match(css,/gcc120-grid/);
});
