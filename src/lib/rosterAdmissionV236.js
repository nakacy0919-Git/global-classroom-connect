// The server is authoritative; no client timer can override the database gate.
export function rosterSubmissionErrorV236(error){
 const original=String(error?.message||'Please try again.');
 if(original==='GCC_ROSTER_BUSY')return 'This session is receiving many registrations. Please keep this page open, wait a few minutes and try again. Your entered information is still here. If the message continues, contact your host.';
 if(/already registered for this session/i.test(original))return 'Your school is already registered. To edit or add students, open the breakout room chart and use Teacher Mode with your personal 4-digit code. Ask the host for the code if needed.';
 return original;
}
