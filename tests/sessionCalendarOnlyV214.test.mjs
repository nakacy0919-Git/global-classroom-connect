import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sessionCalendarDataV214,calendarIcsV214,googleCalendarUrlV214,outlookCalendarUrlV214}
 from '../src/lib/sessionCalendarExportV214.js';
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
test('approved partners see external contact guidance without internal chat',()=>{
 const page=read('src/pages/teacher/TeacherPortalPage.js');
 assert.match(page,/if\(r\.status==='approved'\)/);
 assert.match(page,/WhatsApp, LINE, or Messenger/);
 assert.match(page,/mountApprovedPartnerContactV218/);
 assert.doesNotMatch(page,/mountTeacherMessagesV214|gcs214-messages-view|messagePoll/);
 const stylesheet=read('src/styles/sessionCalendarV214.css');
 assert.doesNotMatch(stylesheet,/gcs214-chat-history|gcs214-badge/);
});
