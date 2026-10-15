'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=process.argv[2];if(!root)throw Error('Project root is required.');
const files={
 app:'src/app.js',sidebar:'src/components/Sidebar.js',header:'src/components/Header.js',rooms:'src/services/roomBuilderService.js'
};
const inputs=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n')]));
if(!inputs.app.includes('GCC_TEACHER_SELF_V5'))throw Error('Please install V5.0.1 before V6. No files changed.');
if(inputs.app.includes('GCC_SESSION_ROSTER_V6'))throw Error('V6 has already been installed.');
function once(s,old,repl,where){let n=s.split(old).length-1;if(n!==1)throw Error(`V6 patch ${where}: found ${n} matches instead of 1. No files changed.`);return s.replace(old,repl);}
let {app,sidebar,header,rooms}=inputs;
app=once(app,"import { supabase } from './services/supabase.js';",`import { supabase } from './services/supabase.js';\nimport {SessionSignupPage,bindSessionSignupPage} from './pages/public/SessionSignupPage.js'; // GCC_SESSION_ROSTER_V6\nimport {SessionControlPage,bindSessionControlPage} from './pages/host/SessionControlPage.js';`,'imports');
app=once(app,'  login: LoginPage,',`  login: LoginPage,\n  'session-join': SessionSignupPage,\n  'session-control': SessionControlPage,`,'routes');
app=once(app,"    'teacher-access',","    'teacher-access',\n    'session-join',",'public routes');
app=once(app,"route === 'teacher-access'","route === 'teacher-access' ||\n    route === 'session-join'",'public layout');
app=once(app,'  bindTeacherInvitesPage();',`  bindTeacherInvitesPage();\n  bindSessionSignupPage(); // GCC_SESSION_ROSTER_V6\n  bindSessionControlPage();`,'binds');
sidebar=once(sidebar,"  { key: 'events', label: 'Events' },", "  { key: 'events', label: 'Events' },\n  { key: 'session-control', label: 'Session Control Center' }, // GCC_SESSION_ROSTER_V6",'sidebar');
header=once(header,"  events: 'Event Management',","  events: 'Event Management',\n  'session-control': 'Session Control Center', // GCC_SESSION_ROSTER_V6",'header');
rooms=once(rooms,"import {\n  getTeachers,\n} from './teacherService.js';","import {\n  getTeachers,\n} from './teacherService.js';\n\nimport {getEventFacilitatorIds} from './sessionRosterService.js'; // GCC_SESSION_ROSTER_V6",'room imports');
rooms=once(rooms,`  const [\n    participants,\n    teachers,\n  ] =\n    await Promise.all([\n\n      getParticipantsByEvent(\n        eventId\n      ),\n\n      getTeachers(),\n\n    ]);`,`  const [\n    participants,\n    teachers,\n    facilitatorScope,\n  ] =\n    await Promise.all([\n\n      getParticipantsByEvent(\n        eventId\n      ),\n\n      getTeachers(),\n\n      getEventFacilitatorIds(eventId),\n\n    ]);`,'room facilitator query');
rooms=once(rooms,`  const facilitators =\n    teachers.filter(\n      (teacher) =>\n        teacher.can_facilitate\n    );`,`  const facilitators =\n    teachers.filter(\n      (teacher) =>\n        teacher.can_facilitate && (!facilitatorScope.managed || facilitatorScope.ids.has(teacher.id))\n    );`,'room facilitator restriction');
// Do not mutate any file until ALL expected anchors have been found exactly once.
for(const [key,contents] of Object.entries({app,sidebar,header,rooms}))fs.writeFileSync(path.join(root,files[key]),contents,'utf8');
console.log('GCC V6 session signup routes and event-specific facilitators connected.');
