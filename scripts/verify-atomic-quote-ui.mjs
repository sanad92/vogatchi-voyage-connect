import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

let org='org-a',user='user-a',failure=null,response={id:'quote-a'},sequence=0;
const calls=[]; const requestRef={current:null};
const source=await readFile(new URL('../src/hooks/useQuotes.ts',import.meta.url),'utf8');
const output=ts.transpileModule(source,{fileName:'useQuotes.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const imports={
  react:{useRef:()=>requestRef},
  '@tanstack/react-query':{useMutation:x=>x,useQuery:x=>x,useQueryClient:()=>({invalidateQueries:()=>{}})},
  '@/integrations/supabase/client':{supabase:{from:()=>{throw new Error('Unexpected client-side table write');}}},
  '@/hooks/useOrgId':{useOrgId:()=>org},
  '@/hooks/useOptimizedAuth':{useOptimizedAuth:()=>({user:user?{id:user}:null})},
  '@/lib/supabaseRpc':{callUntypedRpc:async(name,args)=>{calls.push({name,args});return {data:response,error:failure};}},
  sonner:{toast:{success:()=>{},error:()=>{}}},
};
const exports={};
vm.runInNewContext(output,{exports,crypto:{randomUUID:()=>`request-${++sequence}`},require:name=>{assert.ok(name in imports,name);return imports[name];}});
const form={customer_name:'Test',items:[{item_type:'hotel',description:'Room',quantity:1,cost_price:70,selling_price:100}],status:'draft'};
let create=exports.useQuotes().createQuote.mutationFn;
failure={message:'network timeout'};
await assert.rejects(create(form),/network timeout/);
const firstKey=calls.at(-1).args._request_id;
failure=null;
assert.equal((await create({...form})).id,'quote-a');
assert.equal(calls.at(-1).args._request_id,firstKey,'retry must reuse key');
assert.equal(calls.at(-1).name,'create_quote_atomic');
await create({...form,notes:'changed'});
assert.notEqual(calls.at(-1).args._request_id,firstKey,'changed payload gets new key');
org='org-b';create=exports.useQuotes().createQuote.mutationFn;
await create(form);
assert.equal(calls.at(-1).args._org,'org-b');
assert.notEqual(calls.at(-1).args._request_id,firstKey,'company switch gets new key');
response=null;
await assert.rejects(create(form),/تأكيد حفظ/);
user=null;create=exports.useQuotes().createQuote.mutationFn;
const count=calls.length;
await assert.rejects(create(form),/المستخدم/);
assert.equal(calls.length,count,'missing identity must not call RPC');
console.log('Atomic quote UI: single RPC, retry keys, payload/company isolation, errors and missing identity passed.');
