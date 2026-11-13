import '../styles/teacherDirectoryPaginationV228.css';

const element=(tag,cls='',label='')=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  node.textContent=label;
  return node;
};
export function bindTeacherDirectoryPaginationV228(root=document) {
  const grid=root.querySelector('#teacher-grid');
  const toolbar=root.querySelector('.teacher-toolbar');
  const search=root.querySelector('#teacher-search');
  if(!grid||!toolbar||!search)return;
  const cards=Array.from(grid.querySelectorAll('.teacher-card'));
  // Country is already shown on every card. Legacy headings must not be stranded between pages.
  grid.querySelectorAll('.teacher-country-heading').forEach(heading=>{heading.hidden=true;});
  const country=element('select','input gcc228-country');
  country.setAttribute('aria-label','Filter teacher directory by country');
  country.add(new Option('All countries',''));
  const countryNames=new Map();
  for(const card of cards){
    const code=card.dataset.teacherCountry||'';
    const name=card.dataset.teacherCountryName||'Not provided';
    if(!countryNames.has(code))countryNames.set(code,name);
  }
  for(const [code,name] of [...countryNames].sort((a,b)=>a[1].localeCompare(b[1])))
    country.add(new Option(name,code||'__UNKNOWN'));
  toolbar.append(country);
  const counter=element('p','gcc228-result-count');
  counter.setAttribute('role','status');
  const pager=element('nav','gcc228-pagination');
  pager.setAttribute('aria-label','Teacher directory pages');
  grid.before(counter);grid.after(pager);
  const state={page:1,pageSize:8};
  function render(){
    const query=search.value.trim().toLocaleLowerCase();
    const code=country.value;
    const found=cards.filter(card=>{
      const searchable=(card.dataset.teacherSearch||'').toLocaleLowerCase();
      const cardCode=card.dataset.teacherCountry||'';
      return searchable.includes(query)&&(!code||(code==='__UNKNOWN'?!cardCode:cardCode===code));
    });
    const pages=Math.max(1,Math.ceil(found.length/state.pageSize));
    state.page=Math.min(state.page,pages);
    const start=(state.page-1)*state.pageSize;
    const visible=new Set(found.slice(start,start+state.pageSize));
    cards.forEach(card=>{card.hidden=!visible.has(card);});
    counter.textContent=found.length===0
      ? 'No matching teachers. Clear the search or country filter.'
      : 'Showing '+(start+1)+'–'+Math.min(start+state.pageSize,found.length)+' of '+found.length+' teachers';
    pager.replaceChildren();
    if(pages===1)return;
    const previous=element('button','gcc228-page-button','← Previous');
    previous.type='button';previous.disabled=state.page===1;
    previous.addEventListener('click',()=>{state.page--;render();});
    const next=element('button','gcc228-page-button','Next →');
    next.type='button';next.disabled=state.page===pages;
    next.addEventListener('click',()=>{state.page++;render();});
    pager.append(previous,element('span','','Page '+state.page+' of '+pages),next);
  }
  search.addEventListener('input',()=>{state.page=1;render();});
  country.addEventListener('change',()=>{state.page=1;render();});
  render();
}
