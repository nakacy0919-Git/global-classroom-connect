// Server-only. No roster or teacher information is accepted by this endpoint.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const response=(status,body,headers)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function createBotVerifierV239({allowedOrigins,secret,issueReceipt,fetcher=fetch}){
 const origins=new Set(allowedOrigins);
 return async function handle(req){
  const origin=req.headers.get('origin')||'';
  if(!origins.has(origin))return response(403,{error:'not_allowed'},{});
  const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type, authorization, apikey, x-client-info','Vary':'Origin'};
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return response(405,{error:'method_not_allowed'},headers);
  if(!secret||!issueReceipt)return response(503,{error:'unavailable'},headers);
  let body;
  try{
   if(!req.headers.get('content-type')?.toLowerCase().includes('application/json'))throw Error();
   const size=Number(req.headers.get('content-length')||0);
   if(size>8192)throw Error();
   const reader=req.body.getReader();let total=0;const chunks=[];
   try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>8192){await reader.cancel();throw Error();}chunks.push(value);}}
   finally{reader.releaseLock();}
   const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
   body=JSON.parse(new TextDecoder().decode(bytes));
   if(!body||Object.keys(body).sort().join(',')!=='eventId,token'||!uuid.test(body.eventId)||typeof body.token!=='string'||body.token.length<1||body.token.length>2048)throw Error();
  }catch{return response(400,{error:'invalid_request'},headers);}
  try{
   const result=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
    method:'POST',body:new URLSearchParams({secret,response:body.token}),
    redirect:'error',signal:AbortSignal.timeout(5000)
   });
   if(!result.ok)return response(503,{error:'unavailable'},headers);
   const v=await result.json();
   if(v?.success!==true||v.hostname!==new URL(origin).hostname||v.action!=='gcc_roster'||v.cdata!==body.eventId)
    return response(400,{error:'verification_failed'},headers);
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.token));
   const hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
   const receipt=await issueReceipt(body.eventId,hash);
   if(typeof receipt!=='string'||!/^[a-f0-9]{64}$/.test(receipt))return response(503,{error:'unavailable'},headers);
   return response(200,{receipt},headers);
  }catch{return response(503,{error:'unavailable'},headers);}
 };
}
