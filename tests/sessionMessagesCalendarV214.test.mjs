import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sessionCalendarDataV214,calendarIcsV214,googleCalendarUrlV214,outlookCalendarUrlV214}
 from '../src/lib/sessionCalendarExportV214.js';
import {unreadTotalV214,chatBadgeV214} from '../src/lib/messageUnreadV214.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const record={
 id:'543184ab-29d9-467e-a8cd-8e0d49b4fe04',
 title:'交流・Cultural Exchange 🌏',
 starts_at:'2026-11-09T04:10:00Z',
 ends_at:'2026-11-09T05:10:00Z',
 viewer_zone:'Asia/Tokyo',
 session_details:{meeting_url:'https://secret-zoom.example/path'},
 calendar_note:'Talk with international teachers\nDiscuss goals, grades; and language.'
};
test('same UTC meeting slot is used for Google, Outlook, and ICS regardless of the viewer time zone',()=>{
 const google=new URL(googleCalendarUrlV214(record));
 assert.equal(google.hostname,'calendar.google.com');
 assert.equal(google.searchParams.get('dates'),'20261109T041000Z/20261109T051000Z');
 assert.equal(google.searchParams.get('ctz'),'Asia/Tokyo');
 assert.equal(google.searchParams.get('action'),'TEMPLATE');
 const personal=new URL(outlookCalendarUrlV214(record));
 const work=new URL(outlookCalendarUrlV214(record,true));
 assert.equal(personal.hostname,'outlook.live.com');
 assert.equal(work.hostname,'outlook.office.com');
 assert.equal(work.searchParams.get('startdt'),'2026-11-09T04:10:00.000Z');
 assert.equal(personal.searchParams.get('enddt'),'2026-11-09T05:10:00.000Z');
 assert.equal(sessionCalendarDataV214(record).title,record.title);
});
test('ICS follows RFC 5545 CRLF folding and correctly escapes worldwide teacher names',()=>{
 const ics=calendarIcsV214(record);
 assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
 assert.match(ics,/DTSTART:20261109T041000Z\r\n/);
 assert.match(ics,/DTEND:20261109T051000Z\r\n/);
 assert.match(ics,/SUMMARY:交流・Cultural Exchange 🌏\r\n/);
 const unfolded=ics.replace(/\r\n /g,'');
 assert.match(unfolded,/DESCRIPTION:Talk with international teachers\\nDiscuss goals\\, grades\\; and language\./);
 assert.match(ics,/UID:gcc-543184ab-29d9-467e-a8cd-8e0d49b4fe04@gcc\.pic-speak-story\.com/);
 for(const line of ics.split('\r\n'))assert.ok(new TextEncoder().encode(line).length<=75,'Oversized folded ICS line: '+line);
 assert.ok(ics.endsWith('\r\n'));
 const unicode=calendarIcsV214({...record,title:'日本語・မြန်မာ・العربية・हिन्दी'.repeat(16)});
 assert.ok(unicode.split('\r\n').every(s=>new TextEncoder().encode(s).length<=75));
});
test('calendar exports do not leak a private meeting URL or send invitations',()=>{
 const formats=[calendarIcsV214(record),googleCalendarUrlV214(record),
  outlookCalendarUrlV214(record),outlookCalendarUrlV214(record,true)].join('\n');
 assert.doesNotMatch(formats,/secret-zoom/);
 assert.doesNotMatch(formats,/sendMail|attendee|reminder|trigger=EMAIL/i);
 assert.throws(()=>calendarIcsV214({...record,ends_at:record.starts_at}),/valid start and end/);
 assert.match(read('src/lib/sessionCalendarExportV214.js'),/Apple Calendar \/ \.ics/);
});
test('unread badges aggregate independently by approved pair and are capped visually at 99+',()=>{
 assert.equal(unreadTotalV214([{unread_count:1},{unread_count:2},{unread_count:0}]),3);
 assert.equal(unreadTotalV214([]),0);
 assert.equal(chatBadgeV214(120),'99+');
 assert.equal(chatBadgeV214(2),'2');
});
test('database allows chat only between approved partner teachers and never grants table direct access',()=>{
 const sql=read('supabase/migrations/20261103_gcc_v214_teacher_messages.sql');
 assert.match(sql,/WHERE r.status='approved'/);
 assert.match(sql,/r.status='approved' FOR UPDATE OF r/);
 assert.match(sql,/a.teacher_id=tid OR r.requesting_teacher_id=tid/);
 assert.match(sql,/REVOKE ALL ON TABLE public.gcc_teacher_messages_v214 FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/REVOKE ALL ON TABLE public.gcc_teacher_message_reads_v214 FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public.gcc_v214_teacher_messages\(uuid\) FROM PUBLIC,anon/);
 assert.match(sql,/ALTER TABLE public.gcc_teacher_messages_v214 ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/char_length\(btrim\(p_body\)\) NOT BETWEEN 1 AND 2000/);
 assert.match(sql,/>=60/);
 assert.match(sql,/m.created_at>coalesce\(seen.last_read_at/);
 assert.match(sql,/last_read_at=greatest/);
 assert.doesNotMatch(sql,/net\.http|send_email|smtp|webhook|cron/);
});
test('teacher UI provides red badge, safe read workflow, free calendar options, and no email behavior',()=>{
 const ui=read('src/pages/teacher/TeacherPortalPage.js');
 const chat=read('src/lib/teacherMessagesV214.js');
 const css=read('src/styles/teacherMessagesV214.css');
 assert.match(ui,/data-gct-view="messages"/);
 assert.match(ui,/gcs214-badge-home/);
 assert.match(ui,/gcs214-badge-header/);
 assert.match(ui,/gcs214-badge-messages/);
 assert.match(ui,/Message partner/);
 assert.match(ui,/r.status==='approved'/);
 assert.match(ui,/calendarMenuV214\(/);
 assert.match(chat,/teacherMessageThreadsV214/);
 assert.match(chat,/teacherThreadMessagesV214/);
 assert.match(chat,/teacherMarkMessageReadV214\(requested,messages\[messages.length-1\]\.id\)/);
 assert.match(chat,/message\.value|textarea\.value/);
 assert.match(css,/background:#d73145/);
 assert.match(css,/@media\(max-width:730px\)/);
});

test('rapid chat switching queues latest thread fetch and keeps drafts separate',()=>{
 const chat=read('src/lib/teacherMessagesV214.js');
 assert.match(chat,/if\(loadingMessages\)\{queuedLoad=true;return;\}/);
 assert.match(chat,/if\(queuedLoad\)\{queuedLoad=false;void loadMessages\(\{quiet:true\}\);\}/);
 assert.match(chat,/drafts\.set\(activeId,textarea\.value\)/);
 assert.match(chat,/textarea\.value=drafts\.get\(id\)\|\|''/);
 assert.match(chat,/teacherSendMessageV214\(sendingThread,body\)/);
 assert.match(chat,/if\(activeId===sendingThread\)/);
});
