import {supabase} from '../services/supabase.js';
import {signupOverviewV134} from '../services/teacherOnboardingV120.js';
import '../styles/registrationConsoleV226.css';

import {GCC226_STAGES,legacyRegistrationSnapshotV226} from './registrationConsoleDataV226.js';

const make=(tag,cls='',label='')=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(label!==undefined)node.textContent=label;
  return node;
};
const flag=(code)=>/^[A-Z]{2}$/.test(code||'')?[...code].map(c=>String.fromCodePoint(127397+c.charCodeAt())).join(''):'🌍';
const dateText=(value)=>{
  if(!value)return '—';
  const date=new Date(value);
  return Number.isNaN(date.valueOf())?'—':date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
};
const isMissingRpc=(err)=>['PGRST202','42883'].includes(err?.code) ||
  /could not find the function|function .*gcc_v226_registration_console.*does not exist/i.test(err?.message||'');

export function mountRegistrationConsoleV226(root) {
  const counts=root.querySelector('#gcc134-counts');
  const accounts=root.querySelector('#gcc134-accounts');
  const updated=root.querySelector('#gcc134-refresh-time');
  const countriesBox=root.querySelector('#gcc226-countries-list');
  const tabs=[...root.querySelectorAll('[data-gcc226-tab]')];
  const views=[...root.querySelectorAll('[data-gcc226-view]')];
  const statusOptions=[['','All statuses'],...Object.entries(GCC226_STAGES)];
  const state={page:1,pageSize:8,status:'',country:'',search:'',countryPage:1};
  let legacyMode=false,requestToken=0,busy=false,rerun=false,lastSnapshot=null;

  const filters=make('div','gcc226-filters');
  const search=make('input','gcc226-search');
  search.type='search';search.placeholder='Search teacher, school, email…';
  search.setAttribute('aria-label','Search registered teachers');
  search.maxLength=120;
  const status=make('select','gcc226-select');
  status.setAttribute('aria-label','Filter by registration status');
  for(const [key,label] of statusOptions) status.add(new Option(label,key));
  const country=make('select','gcc226-select');
  country.setAttribute('aria-label','Filter by country');
  country.add(new Option('All countries',''));
  const pageActions=make('div','gcc226-pagination');
  const prev=make('button','gcc226-page-button','← Previous');
  const pageLabel=make('span','gcc226-page-label');
  const next=make('button','gcc226-page-button','Next →');
  prev.type=next.type='button';
  pageActions.append(prev,pageLabel,next);
  filters.append(search,status,country);
  accounts.before(filters);
  accounts.after(pageActions);

  const showTab=(name)=>{
    for(const tab of tabs){
      const selected=tab.dataset.gcc226Tab===name;
      tab.setAttribute('aria-selected',String(selected));
      tab.tabIndex=selected?0:-1;
    }
    for(const view of views)view.hidden=view.dataset.gcc226View!==name;
  };
  for(const tab of tabs)tab.addEventListener('click',()=>showTab(tab.dataset.gcc226Tab));
  const nav=root.querySelector('.gcc226-admin-tabs');
  nav?.addEventListener('keydown',(event)=>{
    if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
    const current=tabs.indexOf(document.activeElement);
    if(current<0)return;
    event.preventDefault();
    const delta=event.key==='ArrowRight'?1:-1;
    const target=tabs[(current+delta+tabs.length)%tabs.length];
    target.focus();showTab(target.dataset.gcc226Tab);
  });
  showTab('registrations');

  function renderCounts(snapshot) {
    counts.replaceChildren();
    const values=snapshot.stats||{};
    for(const [code,label] of [['total','Registered accounts'],...Object.entries(GCC226_STAGES)]){
      const item=make('button','gcc134-stat gcc226-stat');
      item.type='button';
      item.setAttribute('aria-label',label+': '+(values[code]||0));
      const number=make('strong','',String(values[code]||0));
      item.append(number,make('span','',label));
      item.addEventListener('click',()=>{
        state.status=code==='total'?'':code;state.page=1;
        status.value=state.status;
        showTab('registrations');void refresh();
      });
      counts.append(item);
    }
  }
  function renderCountries(snapshot) {
    const active=state.country;
    const prior=country.value;
    country.replaceChildren(new Option('All countries',''));
    for(const item of snapshot.countries||[]){
      country.add(new Option([flag(item.code),item.name, '('+item.total+')'].join(' '),item.code||'__UNKNOWN'));
    }
    country.value=active;
    if(country.selectedIndex<0){country.value='';state.country='';}
    countriesBox.replaceChildren();
    const groups=snapshot.countries||[];
    const pageSize=12, pages=Math.max(1,Math.ceil(groups.length/pageSize));
    state.countryPage=Math.min(state.countryPage,pages);
    const start=(state.countryPage-1)*pageSize;
    for(const entry of groups.slice(start,start+pageSize)){
      const row=make('div','gcc226-country-row');
      row.append(make('span','gcc226-country-name',flag(entry.code)+' '+entry.name),
        make('span','',String(entry.total)+' teachers'),
        make('span','',String(entry.approved)+' approved'),
        make('span','',String(entry.pending)+' pending'));
      const view=make('button','gcc226-country-button','View');
      view.type='button';view.addEventListener('click',()=>{
        state.country=entry.code||'__UNKNOWN';state.page=1;state.status='';status.value='';
        showTab('registrations');void refresh();
      });
      row.append(view);countriesBox.append(row);
    }
    if(groups.length===0)countriesBox.append(make('p','gcc226-empty','No country data is available.'));
    const pager=root.querySelector('#gcc226-country-pagination');
    pager.replaceChildren();
    const back=make('button','gcc226-page-button','← Previous');
    back.type='button';back.disabled=state.countryPage<=1;
    back.addEventListener('click',()=>{state.countryPage--;renderCountries(snapshot);});
    const forward=make('button','gcc226-page-button','Next →');
    forward.type='button';forward.disabled=state.countryPage>=pages;
    forward.addEventListener('click',()=>{state.countryPage++;renderCountries(snapshot);});
    pager.append(back,make('span','', 'Page '+state.countryPage+' of '+pages),forward);
    if(prior!==country.value&&active!==state.country) country.value=state.country;
  }
  function renderRows(snapshot) {
    accounts.replaceChildren();
    const caption=make('p','gcc226-caption',
      snapshot.legacy
      ? 'Limited view: latest 200 accounts only. Apply the staged V22.6 database migration to unlock complete global totals and country information.'
      : snapshot.total_matches+' matching accounts · '+snapshot.stats.total+' accounts worldwide');
    if(snapshot.legacy)caption.setAttribute('role','status');
    accounts.append(caption);
    const table=make('table','gcc226-table');
    const thead=make('thead'),header=make('tr');
    for(const heading of ['Teacher / email','School','Country','Status','Registered'])header.append(make('th','',heading));
    thead.append(header);table.append(thead);
    const tbody=make('tbody');
    for(const row of snapshot.items||[]){
      const tr=make('tr');
      const teacher=make('td');
      teacher.append(make('strong','',row.name||'Name not provided'));
      teacher.append(make('small','',row.email||''));
      tr.append(teacher,make('td','',row.school||'—'),
        make('td','',row.country_code?flag(row.country_code)+' '+(row.country||row.country_code):'Not provided'));
      const st=make('td');
      st.append(make('span','gcc134-status gcc134-status-'+(GCC226_STAGES[row.status]?row.status:'profile_incomplete'),
        GCC226_STAGES[row.status]||GCC226_STAGES.profile_incomplete));
      tr.append(st,make('td','',dateText(row.created_at)));
      tbody.append(tr);
    }
    if(!(snapshot.items||[]).length){
      const tr=make('tr'),td=make('td','gcc226-empty','No accounts match these filters. Try a different search or status.');
      td.colSpan=5;tr.append(td);tbody.append(tr);
    }
    table.append(tbody);
    const scroller=make('div','gcc226-table-scroll');scroller.append(table);
    accounts.append(scroller);
    const pages=Math.max(1,Math.ceil(Number(snapshot.total_matches||0)/state.pageSize));
    prev.disabled=state.page<=1;
    next.disabled=state.page>=pages;
    pageLabel.textContent='Page '+state.page+' of '+pages;
  }
  async function fetchSnapshot() {
    const options={...state};
    if(!legacyMode) {
      const {data,error}=await supabase.rpc('gcc_v226_registration_console',{
        p_page:options.page,p_page_size:options.pageSize,
        p_status:options.status,p_country:options.country,p_search:options.search,
      });
      if(!error)return {...data,legacy:false};
      if(!isMissingRpc(error))throw error;
      legacyMode=true;
    }
    return legacyRegistrationSnapshotV226(await signupOverviewV134(),options);
  }
  async function refresh(){
    if(!root.isConnected)return;
    if(busy){rerun=true;return;}
    busy=true;const token=++requestToken;
    try {
      const snapshot=await fetchSnapshot();
      if(!root.isConnected||token!==requestToken)return;
      const maxPage=Math.max(1,Math.ceil(Number(snapshot.total_matches||0)/state.pageSize));
      if(state.page>maxPage){state.page=maxPage;rerun=true;}
      lastSnapshot=snapshot;
      renderCounts(snapshot);renderCountries(snapshot);renderRows(snapshot);
      updated.textContent='Updated '+new Date().toLocaleTimeString()+' · Automatically checks every 15 seconds';
    }catch(error){
      updated.textContent='Could not update registration data. Refresh or check administrator access.';
      if(!lastSnapshot)accounts.replaceChildren(make('p','gcc226-empty','Registration data is unavailable. No records have been changed.'));
      console.error('Registration console refresh failed:',error);
    }finally{
      busy=false;
      if(rerun){rerun=false;void refresh();}
    }
  }
  let timer;
  const change=()=>{state.page=1;state.status=status.value;state.country=country.value;state.search=search.value.trim();void refresh();};
  status.addEventListener('change',change);
  country.addEventListener('change',change);
  search.addEventListener('input',()=>{
    window.clearTimeout(timer);
    timer=window.setTimeout(change,320);
  });
  prev.addEventListener('click',()=>{if(state.page>1){state.page--;void refresh();}});
  next.addEventListener('click',()=>{state.page++;void refresh();});
  return {refresh,showTab};
}
