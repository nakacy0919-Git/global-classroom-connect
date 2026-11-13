// Pure read-only helpers; safe to test without browser or database.
export const GCC226_STAGES = Object.freeze({
  email_unconfirmed: 'Email not confirmed',
  profile_incomplete: 'Profile incomplete',
  pending: 'Awaiting approval',
  approved: 'Approved',
  rejected: 'Rejected',
});

export function legacyRegistrationSnapshotV226(rows, {page=1,pageSize=8,status='',country='',search=''}={}) {
  const accounts = Array.isArray(rows) ? rows : [];
  const normalized = accounts.map(a=>({
    ...a,
    status: GCC226_STAGES[a.status] ? a.status : 'profile_incomplete',
    country: a.country || '',
    country_code: a.country_code || '',
  }));
  const stats = {total:normalized.length};
  for(const key of Object.keys(GCC226_STAGES)) stats[key]=normalized.filter(a=>a.status===key).length;
  const groups = new Map();
  for(const a of normalized){
    const code=a.country_code || '';
    const item=groups.get(code) || {code,name:a.country||'Not provided',total:0,pending:0,approved:0};
    item.total++;
    if(a.status==='pending') item.pending++;
    if(a.status==='approved') item.approved++;
    groups.set(code,item);
  }
  const countries=[...groups.values()].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
  const needle=search.toLocaleLowerCase().trim();
  const filtered=normalized.filter(a=>
    (!status||a.status===status) &&
    (!country||(country==='__UNKNOWN'?!a.country_code:a.country_code===country)) &&
    (!needle||[a.name,a.email,a.school,a.country].some(s=>String(s||'').toLocaleLowerCase().includes(needle)))
  );
  const start=(page-1)*pageSize;
  return {stats,countries,items:filtered.slice(start,start+pageSize),
    total_matches:filtered.length,page,page_size:pageSize,legacy:true};
}

