// Pure helpers shared by the teacher message inbox and Node regression tests.
export const unreadTotalV214=threads=>Array.isArray(threads)?
 threads.reduce((sum,item)=>sum+Math.max(0,Number(item.unread_count)||0),0):0;
export const chatBadgeV214=count=>count>99?'99+':
 String(Math.max(0,Math.floor(Number(count)||0)));
