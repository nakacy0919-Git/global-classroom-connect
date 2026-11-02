import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/styles/sessionFormWideV205.css');
const main=read('src/main.js');
const teacher=read('src/pages/teacher/TeacherPortalPage.js');
test('teacher Create Session fills available area after redundant right-side pane removed',()=>{
 assert.match(css,/\[data-gct-view="create"\]\s*>\s*\.gcs150-create/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/#gctp-create\.gcs150-wizard\.gct-form/);
 assert.match(css,/max-width:1120px/);
 assert.match(css,/margin-inline:auto/);
 assert.doesNotMatch(teacher,/<\/form><aside class="gct-panel">/);
});
test('final stylesheet wins over legacy desktop grid, V20.4 and mobile media overrides',()=>{
 const override="import './styles/sessionFormWideV205.css';";
 assert.equal(main.match(/sessionFormWideV205\.css/g)?.length,1);
 assert.ok(main.indexOf(override)>main.indexOf("import './styles/mobileExperienceV152.css';"));
 assert.ok(main.indexOf(override)>main.indexOf("import './styles/welcomeAccountV184.css';"));
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:710px\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
});
test('Continue and Publish keep compact dimensions at tablet widths',()=>{
 assert.match(css,/\.gct-form-actions :is\(#gctp-back,#gctp-next,#gctp-publish\)/);
 assert.match(css,/flex:0 0 auto/);
 assert.match(css,/max-width:220px/);
 assert.match(css,/justify-content:flex-end/);
 assert.match(css,/@media\(max-width:430px\)/);
});
test('only presentation is touched; existing wizard, field IDs and data submit remain',()=>{
 for(const id of ['gctp-create','gctp-next','gctp-publish','gctp-date','gctp-zone','gctp-from','gctp-to'])
  assert.ok(teacher.includes(id),id);
 assert.match(teacher,/details:plan/);
});
