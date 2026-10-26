// GCC V13.5: actionable error messages; never bypass email confirmation or admin approval.
const errorText=(e)=>String(e?.message||e?.code||e||'').toLowerCase();
export function teacherSignupErrorV135(error){
 const s=errorText(error);
 if(s.includes('email rate limit')||s.includes('over_email_send_rate_limit')||s.includes('email_send_rate_limit'))return 'GCC email confirmation service has temporarily reached its sending limit. Please do not repeat Create account. Ask the GCC administrator for assistance and try again when email sending is available. This message does not confirm that your account was created.';
 if(s.includes('email_address_not_authorized')||s.includes('email address not authorized'))return 'GCC cannot send confirmation to this address with its current email provider. Please contact the GCC administrator; you cannot complete registration until email sending is configured.';
 if(s.includes('user already registered')||s.includes('already been registered'))return 'This email may already be registered. Please use Sign in and continue instead of creating another account.';
 if(s.includes('email not confirmed')||s.includes('email_not_confirmed'))return 'Please open the confirmation link in your email first, then return here to sign in and finish your teacher profile.';
 if(s.includes('invalid login credentials'))return 'Could not sign in. Check your email and password. If you have not confirmed your email yet, open the confirmation link first.';
 if(s.includes('security policy')||s.includes('row-level'))return 'Your photo could not be saved due to a server permission error. Your form entries are still here; please try Submit for approval again. If this repeats, contact the GCC administrator.';
 return error?.message||'Something went wrong. Please try again or contact the GCC administrator.';
}
export function teacherPhotoErrorV135(error){
 const s=errorText(error);
 if(s.includes('security policy')||s.includes('row-level')||s.includes('403'))return 'The photo was blocked by the server. Your profile entries are still on this page. Please try submitting again; if it repeats, contact the GCC administrator.';
 if(s.includes('storage')||s.includes('network')||s.includes('fetch'))return 'The photo upload could not finish. Check your connection and try Submit for approval again; you do not need to create a new account.';
 return teacherSignupErrorV135(error);
}
