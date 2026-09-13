import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../supabase/functions/whatsapp-chatbot-reply/index.ts',import.meta.url),'utf8');
const policyExports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../supabase/functions/_shared/whatsapp-bot-policy.ts',import.meta.url),'utf8'),{ compilerOptions:{module:ts.ModuleKind.CommonJS} }).outputText,{exports:policyExports});
async function run(scenario) {
  let handler, sends=0, aiCalls=0, reads=0;
  const writes=[];
  const db={from(table){
    let operation='select',payload; const filters=[];
    const query=new Proxy({}, {get(_,method){
      if(method==='then') return (resolve,reject)=> Promise.resolve().then(()=>{
        if(operation!=='select') writes.push({table,operation,payload});
        if(table==='whatsapp_messages' && operation==='insert') return scenario==='duplicate'
          ? {error:{code:'23505'}} : {data:{id:'reserved'}};
        if(operation!=='select') return {data:null,error:null};
        if(table==='whatsapp_messages' && filters.some(f=>f[0]==='id')) return scenario==='invalid inbound'
          ? {error:{message:'not found'}} : {data:{content:scenario==='handoff'?'موظف':'عايز أسافر'}};
        if(table==='whatsapp_chatbot_settings') return {data:{is_enabled:true,system_prompt:'Collect requirements',handoff_keywords:['موظف'],max_bot_replies:5,model:'test',auto_handoff_on_error:true}};
        if(table==='whatsapp_conversations') { reads++; return {data:{id:'conversation',phone_number:'201000000000',status:'active',
          assigned_to: scenario==='assigned' || (scenario==='claim during AI' && reads>1) ? 'employee':null}}; }
        if(table==='whatsapp_chatbot_interactions') return {count:0};
        if(table==='whatsapp_messages') return {data:[{direction:'inbound',content:'عايز أسافر'}]};
        throw new Error(`Unexpected query: ${table}`);
      }).then(resolve,reject);
      return (...args)=>{if(['insert','update'].includes(method)){operation=method;payload=args[0];}if(method==='eq') filters.push(args);return query;};
    }}); return query;
  }};
  const modules={
    'npm:@supabase/supabase-js@2':{createClient:()=>db},
    '../_shared/ai-gateway.ts':{corsHeaders:{},callLovableAI:async()=>{aiCalls++;return 'ما هي الوجهة؟';}},
    '../_shared/auth.ts':{requireInternalCaller:()=>{},authErrorResponse:()=>null},
    '../_shared/whatsapp-bot-policy.ts':policyExports,
    '../_shared/whatsapp.ts':{isWindowOpen:async()=>true,resolveSettings:async()=>({id:'account'}),normalizePhone:x=>x,
      graphSend:async()=>{sends++;return scenario==='send failure' ? {ok:false,errorMessage:'provider failed'} : {ok:true,providerMessageId:'provider-id'};}},
  };
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports:{},require:name=>modules[name],Deno:{env:{get:()=> 'test'},serve:fn=>{handler=fn;}},Response,crypto,console});
  const response=await handler(new Request('https://local.test',{method:'POST',body:JSON.stringify({organization_id:'org',conversation_id:'conversation',message_id:'message'})}));
  return {sends,aiCalls,writes,status:response.status,body:await response.json()};
}
for(const scenario of ['assigned','handoff','duplicate','invalid inbound','claim during AI']) {
  const r=await run(scenario);assert.equal(r.sends,0,scenario);
  if(scenario==='claim during AI') {assert.equal(r.aiCalls,1);assert.ok(r.writes.some(w=>w.payload?.status==='failed'));}
  if(scenario==='handoff') assert.ok(r.writes.some(w=>w.table==='whatsapp_conversations' && w.payload.status==='pending'));
}
const failed=await run('send failure');assert.equal(failed.status,500);
assert.ok(failed.writes.some(w=>w.table==='whatsapp_conversations' && w.payload.assignment_reason==='chatbot_error'));
const happy=await run('normal');assert.equal(happy.sends,1);assert.equal(happy.status,200);
assert.ok(happy.writes.some(w=>w.payload?.status==='sent'));
console.log('WhatsApp bot runtime: successful send, invalid inbound, duplicate, handoff and pickup during AI generation passed.');
