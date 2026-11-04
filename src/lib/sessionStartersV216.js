// Optional starter ideas for verified GCC teachers; never auto-publish a session.
// Dates, class size, capacity, school level and approval remain teacher-controlled.
export const SESSION_STARTERS_V216=Object.freeze([
 Object.freeze({id:'culture',label:'Cultural Exchange',title:'Discover Our School Lives',theme:'Cultural Exchange',topic:'School life and traditions'}),
 Object.freeze({id:'language',label:'Language Exchange',title:'Let’s Practice Speaking Together',theme:'Language Exchange',topic:'Everyday conversations'}),
 Object.freeze({id:'sdgs',label:'SDG Discussion',title:'Our Ideas for a Better World',theme:'SDGs',topic:'Climate action'})
]);
export function sessionStarterV216(id){
 return SESSION_STARTERS_V216.find(item=>item.id===id)||null;
}
