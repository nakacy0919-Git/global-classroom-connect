'use strict';
// GCC_TEACHER_SELF_V5 guarded additive patch to the live V4.1 project.
const fs=require('node:fs'),path=require('node:path');
const root=process.argv[2];if(!root)throw Error('Project root required');
const paths={app:path.join(root,'src/app.js'),sidebar:path.join(root,'src/components/Sidebar.js'),header:path.join(root,'src/components/Header.js')};
const src=Object.fromEntries(Object.entries(paths).map(([k,v])=>[k,fs.readFileSync(v,'utf8').replace(/\r\n/g,'\n')]));
for(const [k,v] of Object.entries(src))if(v.includes('GCC_TEACHER_SELF_V5'))throw Error(`V5 already installed: ${k}`);
if(!src.app.includes('GCC_JOIN_V4') || !src.app.includes('GCC_SESSION_SPLIT_V3'))throw Error('V4 required before V5. No changes applied.');
function once(s,old,repl,label){const n=s.split(old).length-1;if(n!==1)throw Error(label+' patch anchor found '+n+' times, expected 1');return s.replace(old,repl);}
let {app,sidebar,header}=src;
app=once(app,"import { supabase } from './services/supabase.js';",
`import { supabase } from './services/supabase.js';
import {TeacherAccessPage,bindTeacherAccessPage} from './pages/teacher/TeacherAccessPage.js'; // GCC_TEACHER_SELF_V5
import {TeacherPortalPage,bindTeacherPortalPage} from './pages/teacher/TeacherPortalPage.js';
import {TeacherInvitesPage,bindTeacherInvitesPage} from './pages/host/TeacherInvitesPage.js';
import {TeacherSidebar} from './pages/teacher/TeacherSidebar.js';`, 'app imports');
app=once(app,'  login: LoginPage,',
`  login: LoginPage,
  'teacher-access': TeacherAccessPage,
  'teacher-portal': TeacherPortalPage,
  'teacher-invites': TeacherInvitesPage,`, 'app routes');
app=once(app,"    'registration',", "    'registration',\n    'teacher-access',", 'public routes');
app=once(app,"profile.role !== 'host'", "(route === 'teacher-portal' ? profile.role !== 'teacher' : profile.role !== 'host')", 'access role');
app=once(app,"window.location.hash =\n        '#/login';", "window.location.hash =\n        route === 'teacher-portal' ? '#/teacher-access' : '#/login';", 'access redirect');
app=once(app,"route === 'login' ||\n    route === 'registration'", "route === 'login' ||\n    route === 'registration' ||\n    route === 'teacher-access'", 'public layout');
app=once(app,"${Sidebar(\n          route\n        )}","${route === 'teacher-portal' ? TeacherSidebar() : Sidebar(route)}", 'teacher navigation');
app=once(app,"  bindJoinRequestsPage(); // GCC_JOIN_V4",`  bindJoinRequestsPage(); // GCC_JOIN_V4
  bindTeacherAccessPage(); // GCC_TEACHER_SELF_V5
  bindTeacherPortalPage();
  bindTeacherInvitesPage();`, 'teacher page bindings');
sidebar=once(sidebar,"  { key: 'join-requests', label: '✉ Join Requests' }, // GCC_JOIN_V4",
"  { key: 'join-requests', label: '✉ Join Requests' }, // GCC_JOIN_V4\n  { key: 'teacher-invites', label: '✉ Teacher Invitations' }, // GCC_TEACHER_SELF_V5", 'host invitation sidebar');
header=once(header,"  'join-requests': 'Join Requests', // GCC_JOIN_V4",
"  'join-requests': 'Join Requests', // GCC_JOIN_V4\n  'teacher-invites': 'Teacher Invitations', // GCC_TEACHER_SELF_V5\n  'teacher-portal': 'Teacher Workspace',", 'header titles');
// All anchors were verified before any write.
for(const [key,content] of Object.entries({app,sidebar,header}))fs.writeFileSync(paths[key],content,'utf8');
console.log('TEACHER SELF-SERVICE V5 ROUTES INSTALLED');
