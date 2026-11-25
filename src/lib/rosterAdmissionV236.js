// The server is authoritative; no client timer can override the database gate.
export function rosterSubmissionErrorV236(error){
 const original=String(error?.message||'Please try again.');
 if(['GCC_BOT_REQUIRED','GCC_BOT_INVALID','GCC_BOT_UNAVAILABLE'].includes(original))return 'Complete or retry the security verification before submitting. Your roster is still here. If verification is blocked, contact your host or school ICT administrator.';
 if(original==='GCC_VERIFIED_TEACHER_REQUIRED')return 'This session requires a confirmed and approved GCC teacher account with an active linked school. Sign in and use your GCC profile, or contact your host. Your roster is still here.';
 if(original==='GCC_ROSTER_IDENTITY_MISMATCH')return 'Your school, teacher name or country does not match your approved GCC profile. Use your GCC profile above or contact your host. Your roster is still here.';
 if(original==='GCC_INVITE_REQUIRED')return 'Your host requires a session invitation code. Ask your host for a code and enter it above. Your roster is still here.';
 if(original==='GCC_INVITE_INVALID')return 'This invitation is not valid for this session, has expired, or has already been used. Ask your host for a new code. Your roster is still here.';
 if(original==='GCC_ROSTER_BUSY')return 'This session is receiving many registrations. Please keep this page open, wait a few minutes and try again. Your entered information is still here. If the message continues, contact your host.';
 if(/already registered for this session/i.test(original))return 'Your school is already registered. To edit or add students, open the breakout room chart and use Teacher Mode with your personal 4-digit code. Ask the host for the code if needed.';
 return original;
}
