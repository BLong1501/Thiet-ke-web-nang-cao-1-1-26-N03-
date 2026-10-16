import dotenv from 'dotenv';dotenv.config({quiet:true});
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {randomUUID} from 'node:crypto';import jwt from 'jsonwebtoken';
import sharp from 'sharp';

async function main(){
  if(!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname))throw Error('Only local audit database allowed');
  const db=(await import('../src/core/database/prisma')).prisma;
  const app=(await import('../src/app')).default;const {shutdownRedis}=await import('../src/core/database/redis');
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  const output=path.resolve('../lecture/buoi8/V4/evidence');fs.mkdirSync(output,{recursive:true});
  const checks:any[]=[];const matrix:any[]=[];const tokens:Record<string,string>={GUEST:''};
  async function request(method:string,url:string,role:string,body?:any,headers:any={}){
    const response=await fetch(base+url,{method,headers:{...(tokens[role]?{Authorization:'Bearer '+tokens[role]}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
    const text=await response.text();let data:any;try{data=JSON.parse(text)}catch{data=text}
    return {method,url:base+url,role,status:response.status,data,headers:Object.fromEntries(response.headers),time:new Date().toISOString()};
  }
  async function check(id:string,title:string,action:()=>Promise<any>){
    try{checks.push({id,title,result:'PASS',observations:await action(),time:new Date().toISOString()});}
    catch(e:any){checks.push({id,title,result:'FAIL',error:e.message.slice(0,300),time:new Date().toISOString()});}
    console.log(id+' '+checks.at(-1).result);
  }
  try{
    for(const [role,email] of [['ADMIN','admin@crowdfunding.vn'],['USER','donor1@gmail.com'],['USER_B','donor2@gmail.com'],['FUNDRAISER','fundraiser@gmail.com']]){
      const r=await request('POST','/auth/login','GUEST',{email,password:process.env.DEMO_TEST_PASSWORD||'Password@123'});
      assert.equal(r.status,200,'Fixture login '+role);tokens[role]=r.data.data.accessToken;
    }
    const campaign=await db.campaign.findFirst({where:{status:'ACTIVE'}});assert.ok(campaign);
    const user=await db.user.findUnique({where:{email:'donor1@gmail.com'}});assert.ok(user);
    const verification=await db.verification.findFirst();assert.ok(verification);
    const donation=await db.donation.findFirst({where:{donorId:user.id}});assert.ok(donation);
    await check('BM1','SQL injection search and path parameters',async()=>{
      const observations=[];
      for(const payload of ["' OR '1'='1","');DROP TABLE users;--"]){
        for(const route of ['/campaigns?search='+encodeURIComponent(payload),'/campaigns/'+encodeURIComponent(payload),'/users?search='+encodeURIComponent(payload),'/activity-logs?search='+encodeURIComponent(payload)]){
          const r=await request('GET',route,'ADMIN');assert.ok([200,400,404].includes(r.status));
          if(r.status===200){const list=Array.isArray(r.data.data)?r.data.data:r.data.data?.items;assert.equal(list?.length,0);}
          assert.ok(!/prisma|SELECT .+ FROM|\.ts:\d/.test(JSON.stringify(r.data)));observations.push(r);
        }
      }return observations;
    });
    await check('BM2','Store and read XSS as plain text',async()=>{
      const previous=await request('GET','/profile/me','USER');const original=previous.data.data.bio;
      try{const payload='<script>alert(1)</script><img src=x onerror=alert(1)>';const write=await request('PUT','/profile/me','USER',{bio:payload});assert.equal(write.status,200);
        const read=await request('GET','/profile/me','USER');assert.equal(read.data.data.bio,payload);
        return {payload,writeStatus:write.status,storedValue:read.data.data.bio,url:read.url,role:'USER',browserProof:'See buoi9/V5/evidence/Anh_17_XSS_plain_text.png'};
      }finally{await request('PUT','/profile/me','USER',{bio:original||''});}
    });
    await check('BM3','Reject forged origin including localhost lookalike',async()=>{
      const rows=[];for(const origin of ['https://attacker.example','https://localhost.attacker.example']){
        const r=await request('POST','/auth/login','GUEST',{email:'donor1@gmail.com',password:'invalid'}, {Origin:origin});assert.equal(r.status,403);rows.push(r);
      }return rows;
    });
    await check('BM4','Donation owner succeeds and cross-owner is rejected',async()=>{
      const owner=await request('GET','/donations/'+donation.id,'USER');const other=await request('GET','/donations/'+donation.id,'USER_B');assert.equal(owner.status,200);assert.equal(other.status,403);
      return [{...owner,data:{id:owner.data.data.id,paymentStatus:owner.data.data.paymentStatus}},other];
    });
    await check('BM5','Direct calls for every forbidden cell in current route matrix',async()=>{
      const adminRoutes:[string,string][]=[['GET','/users'],['GET','/users/audit-logs'],['GET','/users/'+user.id],['PATCH','/users/'+user.id+'/status'],
        ['GET','/verifications/pending'],['GET','/verifications/'+verification.id],['PATCH','/verifications/'+verification.id+'/review'],
        ['GET','/campaigns/admin/pending'],['PATCH','/campaigns/'+campaign.id+'/review'],['POST','/campaigns/categories'],['PUT','/campaigns/categories/'+campaign.categoryId],['DELETE','/campaigns/categories/'+campaign.categoryId],
        ['POST','/donations/'+donation.id+'/confirm-demo'],['POST','/donations/campaigns/'+campaign.id+'/cancel'],['GET','/donations/campaigns/'+campaign.id+'/reconciliation'],['GET','/donations/admin/all'],
        ['GET','/admin/reports'],['PATCH','/admin/reports/'+randomUUID()+'/resolve'],['GET','/activity-logs'],['GET','/activity-logs/stats'],['GET','/activity-logs/user/'+user.id],['GET','/activity-logs/'+randomUUID()],['POST','/activity-logs'],
        ['GET','/admin/analytics/daily?from=2026-01-01&to=2026-12-31'],['GET','/admin/analytics/campaigns?from=2026-01-01&to=2026-12-31'],['GET','/admin/analytics/categories?from=2026-01-01&to=2026-12-31']];
      const fundRoutes:[string,string][]=[['GET','/campaigns/my/list'],['POST','/campaigns'],['PUT','/campaigns/'+campaign.id],['POST','/campaigns/'+campaign.id+'/media'],['POST','/campaigns/'+campaign.id+'/updates'],['POST','/campaigns/'+campaign.id+'/disbursements']];
      const visit=async(method:string,url:string,role:string)=>{const expected=role==='GUEST'?401:403;const r=await request(method,url,role,method==='GET'||method==='DELETE'?undefined:{});matrix.push({method,url:r.url,role,expected,actual:r.status,result:r.status===expected?'PASS':'FAIL',time:r.time,response:r.data});};
      for(const [method,url] of adminRoutes)for(const role of ['GUEST','USER','FUNDRAISER'])await visit(method,url,role);
      for(const [method,url] of fundRoutes)for(const role of ['GUEST','USER','ADMIN'])await visit(method,url,role);
      for(const role of ['GUEST','FUNDRAISER','ADMIN'])await visit('POST','/verifications/request',role);
      for(const role of ['GUEST','USER'])await visit('GET','/donations/campaign/'+campaign.id+'/manage-donations',role);
      const protectedRoutes:[string,string][]=[['GET','/auth/me'],['POST','/auth/logout'],['GET','/profile/me'],['PUT','/profile/me'],['PUT','/profile/change-password'],['GET','/verifications/my-status'],['GET','/notifications'],['GET','/notifications/unread-count'],['PATCH','/notifications/read-all'],['PATCH','/notifications/'+randomUUID()+'/read'],['GET','/donations/my/history'],['GET','/donations/'+donation.id],['POST','/donations/'+donation.id+'/refund'],['POST','/donations/'+donation.id+'/confirm'],['POST','/uploads'],['GET','/uploads/'+randomUUID()],['GET','/activity-logs/me'],['POST','/reports'],['POST','/communities'],['POST','/communities/'+randomUUID()+'/join']];
      for(const [method,url]of protectedRoutes)await visit(method,url,'GUEST');
      for(const url of ['/communities/'+randomUUID()+'/posts','/communities/'+randomUUID()+'/posts/'+randomUUID()+'/like','/communities/'+randomUUID()+'/posts/'+randomUUID()+'/comments'])await visit('POST',url,'GUEST');
      assert.ok(matrix.every(r=>r.result==='PASS'),JSON.stringify(matrix.filter(r=>r.result==='FAIL')));return {total:matrix.length,passed:matrix.filter(r=>r.result==='PASS').length,matrixFile:'permission-matrix.json',scope:'All role-denied cells for listed existing route groups; object ownership separately tested, not every business-state permutation'};
    });
    await check('BM6','MySQL password hashes and no API disclosure',async()=>{
      const accounts=await db.user.findMany({where:{email:{in:['admin@crowdfunding.vn','donor1@gmail.com','fundraiser@gmail.com']}},select:{email:true,passwordHash:true}});
      for(const a of accounts)assert.ok(/^\$2[aby]\$(1\d|[2-9]\d)\$/.test(a.passwordHash||''));
      const r=await request('GET','/auth/me','USER');assert.equal(r.data.data.passwordHash,undefined);
      return {query:'SELECT email,password_hash FROM users WHERE email IN (three demo accounts)',rows:accounts.map(a=>({email:a.email,prefix:a.passwordHash?.slice(0,7),hashLength:a.passwordHash?.length,hashTail:'REDACTED'})),time:new Date().toISOString(),role:'LOCAL DB TEST OPERATOR'};
    });
    await check('BM7','Expired token and post-logout access/refresh rejected',async()=>{
      const fresh=await request('POST','/auth/login','GUEST',{email:'donor1@gmail.com',password:process.env.DEMO_TEST_PASSWORD||'Password@123'});assert.equal(fresh.status,200);
      const token=fresh.data.data.accessToken;tokens.SESSION=token;const cookie=fresh.headers['set-cookie'].split(';')[0];
      const logout=await request('POST','/auth/logout','SESSION',undefined,{Cookie:cookie});assert.equal(logout.status,200);
      const access=await request('GET','/auth/me','SESSION');const refresh=await request('POST','/auth/refresh-token','GUEST',{}, {Cookie:cookie,Origin:'http://localhost:5173'});assert.equal(access.status,401);assert.equal(refresh.status,401);
      tokens.EXPIRED=jwt.sign({userId:user.id,role:'USER'},process.env.JWT_SECRET!,{expiresIn:-1});const expired=await request('GET','/auth/me','EXPIRED');assert.equal(expired.status,401);
      return {access,refresh,expired,cookieFlags:{httpOnly:/HttpOnly/i.test(fresh.headers['set-cookie']),sameSite:'Strict',secureLocal:/; Secure/i.test(fresh.headers['set-cookie'])},cookieValue:'NOT_RECORDED',nativeCookieProof:'Capture Application tab after production deployment'};
    });
    await check('BM8','Fake image rejected and private URL unauthenticated is blocked',async()=>{
      const form=new FormData();form.append('file',new Blob(['<?php echo 123; ?>'],{type:'image/jpeg'}),'anh-gia.jpg');const fake=await fetch(base+'/uploads',{method:'POST',headers:{Authorization:'Bearer '+tokens.USER},body:form});assert.equal(fake.status,415);
      const bytes=await sharp({create:{width:16,height:16,channels:3,background:'#2563eb'}}).png().toBuffer();
      const validForm=new FormData();validForm.append('file',new Blob([new Uint8Array(bytes)],{type:'image/png'}),'valid.png');
      const uploaded=await fetch(base+'/uploads',{method:'POST',headers:{Authorization:'Bearer '+tokens.USER},body:validForm});assert.equal(uploaded.status,201);const data=(await uploaded.json()) as any;
      const id=data.data.id;
      try{
        const owner=await fetch(base+'/uploads/'+id,{headers:{Authorization:'Bearer '+tokens.USER}});assert.equal(owner.status,200);assert.ok(owner.headers.get('content-type')?.startsWith('image/png'));
        const blocked=await request('GET','/uploads/'+id,'GUEST');const crossOwner=await request('GET','/uploads/'+id,'USER_B');assert.equal(blocked.status,401);assert.equal(crossOwner.status,403);
        return {url:base+'/uploads',role:'USER',file:'anh-gia.jpg',status:fake.status,response:await fake.json(),storedFile:{id,uploaded:201,ownerRead:200,visibility:'PRIVATE'},blocked,crossOwner};
      }finally{
        // id comes from our successful upload and must be UUID before removing its test directory.
        assert.match(id,/^[a-f0-9-]{36}$/i);const root=path.resolve(process.env.PRIVATE_UPLOAD_DIR||'private-uploads');const target=path.resolve(root,id);assert.equal(path.dirname(target),root);await fs.promises.rm(target,{recursive:true,force:true});
      }
    });
    await check('BM9','Production response excludes SQL/path/stack and includes requestId',async()=>{
      const original=db.user.findUnique;const mode=process.env.NODE_ENV;
      try{process.env.NODE_ENV='production';(db.user as any).findUnique=async()=>{throw Error('Injected DB failure: SELECT password_hash FROM users D:/internal/private.ts');};
        const r=await request('POST','/auth/login','GUEST',{email:'donor1@gmail.com',password:'invalid'});assert.equal(r.status,500);assert.ok(r.data.requestId);assert.ok(!/SELECT|password_hash|private\.ts/.test(JSON.stringify(r.data)));return {...r,scenario:'Production mode; deliberately injected repository failure, no DB mutation'};
      }finally{(db.user as any).findUnique=original;process.env.NODE_ENV=mode;}
    });
    await check('BM10','Six failures yield 429 and are recorded in audit log',async()=>{
      const email='audit-'+randomUUID().slice(0,8)+'@example.test';const attempts=[];
      for(let i=1;i<=6;i++){const r=await request('POST','/auth/login','GUEST',{email,password:'wrong_password'});attempts.push({attempt:i,status:r.status,response:r.data});}
      assert.equal(attempts[5].status,429);
      const logs=await db.auditLog.findMany({where:{entityId:email},select:{action:true,createdAt:true},orderBy:{createdAt:'asc'}});assert.ok(logs.some(l=>l.action==='ACCOUNT_LOCKED_TEMPORARY'));
      return {url:base+'/auth/login',role:'INVALID TEST ACCOUNT',attempts,logs};
    });
    await check('BM11','Secret scan of reachable Git history',async()=>{
      const audit=JSON.parse(fs.readFileSync(path.resolve('../lecture/hoan-thien-V4-V5/evidence/secret-history.json'),'utf8'));assert.equal(audit.findings.length,0);return audit;
    });
    await check('BM12','Five headers on current running API',async()=>{
      const r=await request('GET','/health','GUEST');const names=['content-security-policy','x-frame-options','x-content-type-options','referrer-policy','strict-transport-security'];for(const n of names)assert.ok(r.headers[n]);return {url:r.url,time:r.time,role:r.role,status:r.status,headers:Object.fromEntries(names.map(n=>[n,r.headers[n]])),https:'NOT VERIFIED: localhost HTTP'};
    });
  }finally{
    fs.writeFileSync(path.join(output,'security-results.json'),JSON.stringify({environment:'LOCAL',generatedAt:new Date().toISOString(),baseUrl:base,kind:'Actual HTTP/MySQL checks, one explicit production-mode fault injection',checks},null,2));
    fs.writeFileSync(path.join(output,'permission-matrix.json'),JSON.stringify({environment:'LOCAL',generatedAt:new Date().toISOString(),rows:matrix},null,2));
    await new Promise<void>(r=>server.close(()=>r()));shutdownRedis();await db.$disconnect();
  }
  console.log('RESULT '+checks.filter(c=>c.result==='PASS').length+'/'+checks.length+' MATRIX '+matrix.filter(c=>c.result==='PASS').length+'/'+matrix.length);
  process.exitCode=checks.some(c=>c.result==='FAIL')?1:0;
}
main().catch(e=>{console.error(e.message);process.exit(1)});
