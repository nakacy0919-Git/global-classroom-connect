// V25.0: review ordering and English rejection correspondence.
export const rejectionReasonsV250=Object.freeze([
 ['photo','Face photograph is missing or does not show a recognizable face'],
 ['school','Official school website is missing or cannot verify the school affiliation'],
 ['information','Teacher identity or other registration information could not be verified']
]);
export function validSchoolWebsiteV250(value){
 try{const url=new URL(String(value||'').trim());return url.protocol==='https:'&&url.hostname.includes('.')&&!url.username&&!url.password&&url.port==='';}catch{return false;}
}
export function newestApplicationsV250(data){
 const date=x=>{const ms=Date.parse(x.submitted_at||'');return Number.isFinite(ms)?ms:0;};
 return (Array.isArray(data)?data:[]).filter(x=>x&&x.status==='pending').slice().sort((a,b)=>date(b)-date(a)||String(a.id).localeCompare(String(b.id)));
}
export function rejectionDraftV250(application,reasons,note=''){
 const selected=rejectionReasonsV250.filter(([key])=>reasons.includes(key));
 if(!selected.length)throw Error('Select at least one rejection reason.');
 const to=String(application.email||'').trim();
 if(!/^[^\s@,;?&#]+@[^\s@,;?&#]+\.[^\s@,;?&#]+$/.test(to))throw Error('Applicant email address is unavailable or invalid.');
 const name=String(application.name||'Teacher').replace(/[\r\n]+/g,' ').trim()||'Teacher';
 const extra=String(note||'').trim().slice(0,500);
 const instructions={
 photo:'We could not verify a clear photograph of your face. Please provide a recent individual photograph in which your face is clearly visible. Please do not use a logo, avatar, group photo or obscured image.',
 school:'We could not verify your school affiliation. Please provide the official school website (a valid HTTPS URL) and accurate school information.',
 information:'We could not verify some of the information in your application. Please check your teacher profile and school details and provide accurate information.'
 };
 const subject='Global Classroom Connect — Teacher application not approved';
 const body=['Dear '+name+',','','Thank you for your interest in Global Classroom Connect (GCC). We are unable to approve your teacher account at this time because we could not complete the verification process.','','The following information requires attention:',...selected.map(([key])=>'- '+instructions[key]),...(extra?['','Additional note: '+extra]:[]),'','To protect our international school community, teacher accounts are approved only after the face photograph and school information have been verified.','','Please reply to this email with the corrected information or contact the GCC team for instructions on resubmitting your application. Please do not create a duplicate account.','','Thank you for your understanding.','','Best regards,','Global Classroom Connect Administration'].join('\n');
 const mailto='mailto:'+encodeURIComponent(to)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
 return {to,subject,body,mailto};
}
