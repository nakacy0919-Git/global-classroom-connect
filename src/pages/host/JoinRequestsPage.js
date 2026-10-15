import '../../styles/joinRequests.css';
import '../../styles/sessionWorkspacePolish.css'; // GCC_WORKFLOW_POLISH_V41
import {loadMatchData} from '../../services/matchingService.js';
import {loadSessionJoinRequests,reviewSessionJoinRequest} from '../../services/sessionJoinRequestService.js';
import {canDecideRequest,requestCounts} from '../../lib/joinRequestRules.js';

const make=(tag,cls='',text='')=>{const e=document.createElement(tag);e.className=cls;e.textContent=text;return e;};
const flag=code=>/^[A-Z]{2}$/.test(code||'')
  ?[...code].map(c=>String.fromCodePoint(127397+c.charCodeAt())).join(''):'🌏';
function showTime(value,zone){
  try{return new Intl.DateTimeFormat('en-GB',{timeZone:zone,weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));}
  catch{return 'Time unavailable';}
}

export function JoinRequestsPage() {
  return `<section class="gc-requests" aria-label="Session join requests">
    <header class="gc-requests-hero"><div class="gc-requests-hero-icon" aria-hidden="true">🤝</div>
      <div><p class="gc-requests-kicker">GLOBAL CLASSROOM · HOST REVIEW</p><h2>Join Requests</h2>
        <p>Review teachers who want to join an exchange session.</p></div>
      <a href="#/find-session" class="gc-requests-link">⌕ Find a Session</a>
    </header>
    <div class="gc-requests-stats" id="gcr-stats" aria-live="polite"></div>
    <div class="gc-requests-bar"><h3>Applications</h3><label>Show
      <select id="gcr-filter"><option value="pending">Pending requests</option>
        <option value="all">All requests</option><option value="approved">Approved</option>
        <option value="declined">Declined</option></select></label>
      <button id="gcr-demo" type="button">✦ Preview sample</button>
      <button id="gcr-refresh" type="button">↻ Refresh</button></div>
    <p class="gc-requests-notice" id="gcr-message" role="status" hidden></p>
    <div class="gc-requests-list" id="gcr-list" aria-live="polite"></div>
    <footer class="gc-requests-footnote">Host-assisted workflow. Approval records interest; it does not publish an event, send email, or confirm a meeting.</footer>
  </section>`;
}

export function bindJoinRequestsPage() {
  const root=document.querySelector('.gc-requests');if(!root)return;
  // GCC_WORKFLOW_POLISH_V41: the app topbar owns the page title.
  const joinHero=root.querySelector('.gc-requests-hero');
  const findLink=joinHero?.querySelector('.gc-requests-link');
  const actions=root.querySelector('.gc-requests-bar');
  if(!joinHero||!findLink||!actions)throw Error('Join page layout has changed.');
  actions.append(findLink);
  joinHero.remove();

  const $=id=>root.querySelector('#'+id);
  let data={teachers:[],offers:[]},requests=[],loading=false,demo=false;
  function message(text,error=false){const e=$('gcr-message');e.textContent=text;e.hidden=!text;e.classList.toggle('error',error);}
  const byTeacher=()=>new Map(data.teachers.map(t=>[t.id,t]));
  const byOffer=()=>new Map(data.offers.map(o=>[o.id,o]));
  function render(){
    const totals=requestCounts(requests),stats=$('gcr-stats');stats.replaceChildren();
    for(const [label,count,icon] of [['Pending',totals.pending,'📩'],['Approved',totals.approved,'✓'],['Declined',totals.declined,'–']]){
      const box=make('div','gc-requests-stat');box.append(make('span','',icon),make('strong','',String(count)),make('small','',label));stats.append(box);
    }
    const filter=$('gcr-filter').value;
    const visible=requests.filter(r=>filter==='all'||r.status===filter)
      .sort((a,b)=>(a.status==='pending'?0:1)-(b.status==='pending'?0:1)||b.created_at.localeCompare(a.created_at));
    const list=$('gcr-list');list.replaceChildren();
    if(!visible.length){
      const empty=make('div','gc-requests-empty');
      empty.append(make('div','gc-requests-empty-icon','🌱'),make('h3','','No requests in this view'),
        make('p','','Teachers can be added to a session through Find a Session.'));
      const link=make('a','gc-requests-link','Find Sessions →');link.href='#/find-session';empty.append(link);list.append(empty);return;
    }
    const teachers=byTeacher(),offers=byOffer();
    for(const r of visible){
      const offer=offers.get(r.offer_id),host=teachers.get(offer?.teacher_id),guest=teachers.get(r.requesting_teacher_id);
      const card=make('article','gc-requests-card');
      const heading=make('div','gc-requests-pair');
      const hostBox=make('div','gc-requests-party');hostBox.append(make('small','','SESSION HOST'),make('strong','',`${flag(host?.schools?.country_code)} ${host?.display_name||'Unknown host'}`),make('span','',host?.schools?.name||'School unavailable'));
      const guestBox=make('div','gc-requests-party');guestBox.append(make('small','','APPLICANT'),make('strong','',`${flag(guest?.schools?.country_code)} ${guest?.display_name||'Unknown teacher'}`),make('span','',guest?.schools?.name||'School unavailable'));
      heading.append(hostBox,make('span','gc-requests-arrow','→'),guestBox);card.append(heading);
      card.append(make('div','gc-requests-session',offer?`${offer.topic||'Open classroom exchange'} · ${showTime(offer.starts_at,offer.timezone)} (${offer.timezone})`:'Original session unavailable'));
      if(r.message)card.append(make('p','gc-requests-message',r.message));
      const foot=make('div','gc-requests-card-bottom');
      foot.append(make('span',`gc-requests-status ${r.status}`,r.status.toUpperCase()));
      if(canDecideRequest(r) && !demo){
        for(const [decision,label,cls] of [['declined','Decline','gc-requests-decline'],['approved','Approve request','gc-requests-approve']]){
          const b=make('button',cls,label);b.type='button';b.addEventListener('click',async()=>{
            const action=decision==='approved'?'approve':'decline';
            if(!window.confirm(`Do you want to ${action} this join request? No invitation will be sent.`))return;
            b.disabled=true;try{await reviewSessionJoinRequest(r.id,decision);await reload();message(`Request ${decision}. No invitation was sent.`);}
            catch(e){message(e.message||'Could not review request.',true);b.disabled=false;}
          });foot.append(b);
        }
      }
      card.append(foot);list.append(card);
    }
  }
  async function reload(){
    if(loading)return;
    loading=true;demo=false;message('Loading join requests…');
    try{const [fresh,all]=await Promise.all([loadMatchData(),loadSessionJoinRequests()]);data=fresh;requests=all;render();message('');}
    catch(e){message(e.message||'Could not load join requests.',true);}
    finally{loading=false;}
  }
  $('gcr-demo').addEventListener('click',()=>{
    demo=true;
    const starts=new Date(Date.now()+86400000).toISOString();
    const ends=new Date(Date.now()+90000000).toISOString();
    data={teachers:[
      {id:'demo-a',display_name:'Sample teacher — Japan',schools:{name:'Sample Japanese School',country_code:'JP'}},
      {id:'demo-b',display_name:'Sample teacher — Philippines',schools:{name:'Sample Philippine School',country_code:'PH'}}
    ],offers:[{id:'demo-offer',teacher_id:'demo-a',starts_at:starts,ends_at:ends,timezone:'Asia/Tokyo',topic:'Food & Culture'}]};
    requests=[{id:'demo-1',offer_id:'demo-offer',requesting_teacher_id:'demo-b',status:'pending',created_at:new Date().toISOString(),message:'Our class would love to join.'}];
    $('gcr-filter').value='all';render();
    message('SAMPLE PREVIEW ONLY — no database changes. Review buttons are hidden. Click Refresh for real data.');
  });
  $('gcr-refresh').addEventListener('click',reload);
  $('gcr-filter').addEventListener('change',render);
  reload();
}
