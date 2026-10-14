import dotenv from 'dotenv';
dotenv.config({quiet:true});
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';

async function main(){
  if(!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname)) throw Error('Only local test database allowed; do not run writes against cloud');
  process.env.NODE_ENV='test';
  const app=(await import('../src/app')).default;
  const db=(await import('../src/core/database/prisma')).prisma;
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  const output=path.resolve('../lecture/hoan-thien-V4-V5/evidence');fs.mkdirSync(output,{recursive:true});
  const results:any[]=[];let admin='',user='',fundraiser='',campaign='';
  const security:any[]=[];
  const hit=async(url:string,token='',method='GET',body?:any,headers:any={})=>{
    const r=await fetch(base+url,{method,headers:{...(token?{Authorization:`Bearer ${token}`} :{}),...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
    const raw=await r.text();let data:any;try{data=JSON.parse(raw)}catch{data=raw}return {status:r.status,data,headers:r.headers,raw};
  };
  const check=async(id:string,group:string,name:string,run:()=>Promise<any>)=>{try{const detail=await run();results.push({id,group,name,result:'PASS',detail});}catch(e:any){results.push({id,group,name,result:'FAIL',detail:e.message.slice(0,400)});}console.log(id+' '+results.at(-1).result+' '+name);};
  try{
    for(const [id,email,role] of [['01','admin@crowdfunding.vn','ADMIN'],['02','donor1@gmail.com','USER'],['03','fundraiser@gmail.com','FUNDRAISER']]){
      await check('TC-'+id,'main','Đăng nhập '+role,async()=>{const r=await hit('/auth/login','','POST',{email,password:process.env.DEMO_TEST_PASSWORD||'Password@123'});assert.equal(r.status,200);assert.equal(r.data.data.user.role,role);assert.equal(r.data.data.user.passwordHash,undefined);if(role==='ADMIN')admin=r.data.data.accessToken;else if(role==='USER')user=r.data.data.accessToken;else fundraiser=r.data.data.accessToken;return {status:r.status,role};});
    }
    await check('TC-04','main','Danh mục thật',async()=>{const r=await hit('/campaigns/categories');assert.equal(r.status,200);assert.ok(r.data.data.length);return {count:r.data.data.length};});
    await check('TC-05','main','Danh sách chiến dịch',async()=>{const r=await hit('/campaigns');assert.equal(r.status,200);assert.ok(r.data.data.length);campaign=r.data.data[0].id;return {count:r.data.data.length};});
    await check('TC-06','main','Chi tiết chiến dịch',async()=>{const r=await hit('/campaigns/'+campaign);assert.equal(r.status,200);assert.equal(r.data.data.id,campaign);});
    await check('TC-07','main','Hồ sơ chính mình',async()=>{assert.equal((await hit('/auth/me',user)).status,200);});
    await check('TC-08','main','Lịch sử đóng góp của tôi',async()=>{assert.equal((await hit('/donations/my/history',user)).status,200);});
    await check('TC-09','main','Danh sách thông báo',async()=>{assert.equal((await hit('/notifications',user)).status,200);});
    await check('TC-10','edge','Email đăng nhập sai định dạng',async()=>{assert.equal((await hit('/auth/login','','POST',{email:'bad',password:'123456Aa@'})).status,400);});
    await check('TC-11','edge','Ngày không tồn tại',async()=>{assert.equal((await hit('/admin/analytics/daily?from=2026-02-30&to=2026-03-01',admin)).status,400);});
    await check('TC-12','edge','Trang âm',async()=>{assert.equal((await hit('/campaigns?page=-1')).status,400);});
    await check('TC-13','edge','Giới hạn trang quá lớn',async()=>{assert.equal((await hit('/campaigns?limit=999999')).status,400);});
    await check('TC-14','edge','Thiếu trường KYC',async()=>{assert.equal((await hit('/verifications/request',user,'POST',{})).status,400);});
    await check('TC-15','edge','Upload thiếu tệp',async()=>{assert.equal((await hit('/uploads',user,'POST')).status,400);});
    await check('TC-16','security','Thiếu token',async()=>{assert.equal((await hit('/auth/me')).status,401);});
    await check('TC-17','security','Chữ ký token giả',async()=>{assert.equal((await hit('/auth/me',jwt.sign({userId:'x',role:'ADMIN'},'wrong'))).status,401);});
    await check('TC-18','security','USER không được đọc thống kê admin',async()=>{assert.equal((await hit('/admin/analytics/daily?from=2026-01-01&to=2026-12-31',user)).status,403);});
    await check('TC-19','security','CSRF domain giả chứa localhost',async()=>{assert.equal((await hit('/auth/login','','POST',{email:'donor1@gmail.com',password:'Password@123'},{Origin:'https://localhost.attacker.example'})).status,403);});
    await check('TC-20','security','SQL injection tìm kiếm',async()=>{const r=await hit('/campaigns?search='+encodeURIComponent("' OR '1'='1"));assert.ok([200,400].includes(r.status));if(r.status===200)assert.equal(r.data.data.length,0);assert.ok(!/prisma|SELECT|\.ts:\d/i.test(r.raw));});
    await check('TC-21','security','Script đổi đuôi ảnh',async()=>{const form=new FormData();form.append('file',new Blob(['<?php echo 123; ?>'],{type:'image/jpeg'}),'fake.jpg');const r=await fetch(base+'/uploads',{method:'POST',headers:{Authorization:`Bearer ${user}`},body:form});assert.equal(r.status,415);});
    await check('TC-22','security','Tệp riêng tư yêu cầu đăng nhập',async()=>{assert.equal((await hit('/uploads/00000000-0000-4000-8000-000000000001')).status,401);});
    const from=new Date().getUTCFullYear()+'-01-01',to=new Date().getUTCFullYear()+'-12-31';
    const {dateRange}=await import('../src/modules/analytics/analytics.routes');const range=dateRange(from,to);
    const [manual]=await db.$queryRaw<any[]>`SELECT CAST(COALESCE(SUM(CASE WHEN kind='RECEIPT' THEN amount ELSE 0 END),0) AS CHAR) received FROM ledger_entries WHERE created_at >= ${range.start} AND created_at < ${range.end}`;
    for(const [i,kind] of ['daily','campaigns','categories'].entries()){
      await check('TC-'+(23+i),'report','Báo cáo '+kind+' và xuất CSV',async()=>{
        const url=`/admin/analytics/${kind}?from=${from}&to=${to}`;const r=await hit(url,admin);assert.equal(r.status,200);assert.ok(Array.isArray(r.data.data.rows));
        const total=r.data.data.rows.reduce((s:number,row:any)=>s+Number(row.received),0);assert.equal(total,Number(manual.received));
        const csv=await hit(url+'&format=csv',admin);assert.equal(csv.status,200);assert.ok(csv.headers.get('content-type')?.startsWith('text/csv'));assert.ok(csv.raw.includes('Đã thu VND'));
        fs.writeFileSync(path.join(output,kind+'.csv'),csv.raw);fs.writeFileSync(path.join(output,kind+'.json'),JSON.stringify(r.data.data,null,2));return {groups:r.data.data.rows.length,received:total,manualReceived:manual.received};
      });
    }
    const image=await sharp({create:{width:20,height:20,channels:3,background:'#2563eb'}}).png().toBuffer();assert.ok(image.length);
    const extra=async(name:string,run:()=>Promise<any>)=>{try{security.push({name,result:'PASS',detail:await run()});}catch(e:any){security.push({name,result:'FAIL',detail:e.message.slice(0,200)});}};
    await extra('BM12 five headers',async()=>{const r=await hit('/health');const names=['content-security-policy','x-frame-options','x-content-type-options','referrer-policy','strict-transport-security'];for(const name of names)assert.ok(r.headers.get(name));return Object.fromEntries(names.map(n=>[n,r.headers.get(n)]));});
    await extra('BM6 bcrypt passwords',async()=>{const accounts=await db.user.findMany({where:{email:{in:['admin@crowdfunding.vn','donor1@gmail.com']}},select:{passwordHash:true}});assert.ok(accounts.length===2);for(const a of accounts)assert.ok(/^\$2[aby]\$(1\d|[2-9]\d)\$/.test(a.passwordHash||''));return {count:accounts.length,costAtLeast:10};});
    await extra('BM7 logout revokes access and refresh',async()=>{
      const r=await hit('/auth/login','','POST',{email:'donor1@gmail.com',password:process.env.DEMO_TEST_PASSWORD||'Password@123'});assert.equal(r.status,200);
      const cookie=r.headers.get('set-cookie')!;assert.ok(/HttpOnly/i.test(cookie)&&/SameSite=Strict/i.test(cookie));
      const token=r.data.data.accessToken;assert.notEqual(token,user);
      const cookieHeader=cookie.split(';')[0];assert.equal((await hit('/auth/logout',token,'POST',undefined,{Cookie:cookieHeader})).status,200);
      assert.equal((await hit('/auth/me',token)).status,401);
      assert.equal((await hit('/auth/refresh-token','','POST',{}, {Cookie:cookieHeader,Origin:'http://localhost:5173'})).status,401);
      return {revoked:true,httpOnly:true,sameSite:'Strict'};
    });
    await extra('BM10 sixth invalid login 429',async()=>{
      const email=`invalid-${Date.now()}@example.test`;let last:any;
      for(let i=0;i<6;i++)last=await hit('/auth/login','','POST',{email,password:'invalid123'});
      assert.equal(last.status,429);return {attempts:6,status:429};
    });
    await extra('BM4 donation owner isolation',async()=>{
      const owner=await db.user.findUnique({where:{email:'donor1@gmail.com'}});assert.ok(owner);
      const donation=await db.donation.findFirst({where:{donorId:owner.id}});assert.ok(donation);
      assert.equal((await hit('/donations/'+donation.id,user)).status,200);
      const login=await hit('/auth/login','','POST',{email:'donor2@gmail.com',password:process.env.DEMO_TEST_PASSWORD||'Password@123'});assert.equal(login.status,200);
      assert.equal((await hit('/donations/'+donation.id,login.data.data.accessToken)).status,403);return {owner:200,crossOwner:403};
    });
    await extra('BM2 stored XSS sanitized',async()=>{
      const profile=await hit('/profile/me',user);const original=profile.data.data.bio;
      try{
        const attack='<script>alert(1)</script><img src=x onerror=alert(1)>';
        const r=await hit('/profile/me',user,'PUT',{bio:attack});assert.equal(r.status,200);
        const read=await hit('/profile/me',user);assert.ok(!/script|onerror/i.test(read.data.data.bio));return {storedWithoutExecutableMarkup:true};
      }finally{await hit('/profile/me',user,'PUT',{bio:original||''});}
    });
    await extra('BM9 production masks internal errors',async()=>{
      const original=db.user.findUnique;const mode=process.env.NODE_ENV;
      try{process.env.NODE_ENV='production';(db.user as any).findUnique=async()=>{throw Error('SELECT secret FROM users D:/private/internal.ts');};
        const r=await hit('/auth/login','','POST',{email:'donor1@gmail.com',password:'Password@123'});assert.equal(r.status,500);assert.ok(r.data.requestId);assert.ok(!/SELECT|internal\.ts|secret/.test(r.raw));
        return {status:500,hasRequestId:true};
      }finally{(db.user as any).findUnique=original;process.env.NODE_ENV=mode;}
    });
    fs.writeFileSync(path.join(output,'security-supplement.json'),JSON.stringify({environment:'LOCAL',generatedAt:new Date().toISOString(),scope:'Application HTTP, MySQL hash inspection, and one injected database failure for production masking',results:security},null,2));
  }finally{
    const report={generatedAt:new Date().toISOString(),environment:'LOCAL',scope:'Real application HTTP routes and local MySQL; no claim of online validation',distribution:{main:9,edge:6,security:7,report:3},total:results.length,pass:results.filter(r=>r.result==='PASS').length,results};
    fs.writeFileSync(path.join(output,'25-api-results.json'),JSON.stringify(report,null,2));
    await new Promise<void>(r=>server.close(()=>r()));await db.$disconnect();
    console.log(`RESULT ${report.pass}/${report.total}; SECURITY ${security.filter(s=>s.result==='PASS').length}/${security.length}`);process.exit(report.pass===25&&security.every(s=>s.result==='PASS')?0:1);
  }
}
main().catch(e=>{console.error(e.message);process.exit(1)});
