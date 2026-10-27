// GCC V13.9 — explicit identity and draft guards for multi-account browsers.
// These checks never modify account permissions or admin approval.
export function assertApplicantIdentityV139(user,expectedUserId){
 if(!user?.id||!expectedUserId||user.id!==expectedUserId)
  throw Error('Your signed-in GCC account changed while this profile was open. Sign out / switch account, sign in with the intended email, and reopen the profile.');
 return true;
}
export function assertEditableDraftV139(current,loaded){
 if(!current||current.status!=='draft'||!loaded||current.id!==loaded.id||current.teacher_id!==loaded.teacher_id)
  throw Error('This profile is not editable for the current account. Sign out / switch account, then reopen your own profile. Do not create another account.');
 return true;
}
