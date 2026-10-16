/** Run a shareable Postman collection against the actual app and local MySQL.
 * Install the report tools under submission-output/ch6-tools; never export tokens.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
dotenv.config({quiet:true});
const root=path.resolve(__dirname,'../..');
const out=path.join(root,'lecture/chuong6/evidence');
const tools=path.join(root,'submission-output/ch6-tools/node_modules');
const newman=require(path.join(tools,'newman'));
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
type Case={id:string;name:string;pre:string;steps:string;expected:string;role:string;method:string;url:string;code:number;token?:string;body?:any;checks?:string[];origin?:string;file?:boolean};
async function main(){
  const dbUrl=new URL(process.env.DATABASE_URL!);
  if(!['localhost','127.0.0.1'].includes(dbUrl.hostname))throw Error('Local database only');
  process.env.NODE_ENV='test';
  const app=(await import('../src/app')).default;
  const db=(await import('../src/core/database/prisma')).prisma;
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  fs.mkdirSync(out,{recursive:true});
  const fixture=path.join(out,'invalid-image.jpg');fs.writeFileSync(fixture,'<?php echo 123; ?>');
  try{
    const year=new Date().getUTCFullYear(); const from=`${year}-01-01`,to=`${year}-12-31`;
    const {dateRange}=await import('../src/modules/analytics/analytics.routes');const range=dateRange(from,to);
    const [sum]=await db.$queryRaw<any[]>`SELECT CAST(COALESCE(SUM(CASE WHEN kind='RECEIPT' THEN amount ELSE 0 END),0) AS CHAR) received FROM ledger_entries WHERE created_at >= ${range.start} AND created_at < ${range.end}`;
    const counts={users:await db.user.count(),categories:await db.category.count(),campaigns:await db.campaign.count(),donations:await db.donation.count(),ledgerEntries:await db.ledgerEntry.count()};
    const [version]=await db.$queryRaw<any[]>`SELECT VERSION() version`;
    const cases:Case[]=[];
    const add=(c:Omit<Case,'id'>)=>cases.push({id:`TC-${String(cases.length+1).padStart(2,'0')}`,...c});
    for(const [role,email,key] of [['ADMIN','admin@crowdfunding.vn','admin'],['USER','donor1@gmail.com','user'],['FUNDRAISER','fundraiser@gmail.com','fundraiser']])add({name:`Đăng nhập ${role}`,pre:`Tài khoản mẫu ${email} đang ACTIVE và đã xác minh email.`,steps:'POST /auth/login với email đúng và biến demoPassword; kiểm tra vai trò và token trả về.',expected:`HTTP 200; role=${role}; có accessToken; không có passwordHash.`,role,method:'POST',url:'/auth/login',code:200,body:{email,password:'{{demoPassword}}'},checks:[`pm.expect(j.data.user.role).to.eql('${role}'); pm.expect(j.data.accessToken).to.be.a('string'); pm.expect(j.data.user).not.to.have.property('passwordHash'); pm.collectionVariables.set('${key}',j.data.accessToken);`]});
    add({name:'Danh mục công khai',pre:'CSDL local có danh mục mẫu.',steps:'GET /campaigns/categories không kèm token.',expected:'HTTP 200; mảng danh mục không rỗng.',role:'GUEST',method:'GET',url:'/campaigns/categories',code:200,checks:["pm.expect(j.data).to.be.an('array').that.is.not.empty;"]});
    add({name:'Danh sách chiến dịch',pre:'Có ít nhất một chiến dịch công khai.',steps:'GET /campaigns; lưu id chiến dịch đầu tiên để dùng tại TC-06.',expected:'HTTP 200; danh sách không rỗng và có meta phân trang.',role:'GUEST',method:'GET',url:'/campaigns',code:200,checks:["pm.expect(j.data).to.be.an('array').that.is.not.empty; pm.expect(j.meta).to.have.property('page'); pm.collectionVariables.set('campaign',j.data[0].id);"]});
    add({name:'Chi tiết chiến dịch',pre:'TC-05 đã lấy được campaign.',steps:'GET /campaigns/{{campaign}}.',expected:'HTTP 200; data.id khớp campaign đã chọn.',role:'GUEST',method:'GET',url:'/campaigns/{{campaign}}',code:200,checks:["pm.expect(j.data.id).to.eql(pm.collectionVariables.get('campaign'));"]});
    add({name:'Hồ sơ chính mình',pre:'Token USER từ TC-02 còn hiệu lực.',steps:'GET /auth/me với Bearer USER.',expected:'HTTP 200; email đúng donor1@gmail.com; không trả passwordHash.',role:'USER',method:'GET',url:'/auth/me',token:'user',code:200,checks:["pm.expect(j.data.email).to.eql('donor1@gmail.com'); pm.expect(j.data).not.to.have.property('passwordHash');"]});
    add({name:'Lịch sử đóng góp',pre:'USER đã đăng nhập.',steps:'GET /donations/my/history với Bearer USER.',expected:'HTTP 200; data là mảng giao dịch của người dùng.',role:'USER',method:'GET',url:'/donations/my/history',token:'user',code:200,checks:["pm.expect(j.data).to.be.an('array');"]});
    add({name:'Thông báo cá nhân',pre:'USER đã đăng nhập.',steps:'GET /notifications với Bearer USER.',expected:'HTTP 200; data là mảng thông báo.',role:'USER',method:'GET',url:'/notifications',token:'user',code:200,checks:["pm.expect(j.data).to.be.an('array');"]});
    add({name:'Email sai định dạng',pre:'Không cần phiên đăng nhập.',steps:'POST /auth/login với email=bad và mật khẩu chuỗi.',expected:'HTTP 400; success=false.',role:'GUEST',method:'POST',url:'/auth/login',code:400,body:{email:'bad',password:'InvalidExample123!'}});
    add({name:'Ngày không tồn tại',pre:'Token ADMIN hợp lệ.',steps:'GET /admin/analytics/daily?from=2026-02-30&to=2026-03-01.',expected:'HTTP 400; từ chối ngày 30/02.',role:'ADMIN',method:'GET',url:'/admin/analytics/daily?from=2026-02-30&to=2026-03-01',token:'admin',code:400});
    add({name:'Trang âm',pre:'Endpoint danh sách hoạt động.',steps:'GET /campaigns?page=-1.',expected:'HTTP 400; không thực hiện phân trang âm.',role:'GUEST',method:'GET',url:'/campaigns?page=-1',code:400});
    add({name:'Kích thước trang vượt giới hạn',pre:'Endpoint danh sách hoạt động.',steps:'GET /campaigns?limit=999999.',expected:'HTTP 400; từ chối limit vượt giới hạn.',role:'GUEST',method:'GET',url:'/campaigns?limit=999999',code:400});
    add({name:'KYC thiếu dữ liệu',pre:'USER có quyền gửi hồ sơ.',steps:'POST /verifications/request với body {} và Bearer USER.',expected:'HTTP 400; dữ liệu thiếu trường không được chấp nhận.',role:'USER',method:'POST',url:'/verifications/request',token:'user',code:400,body:{}});
    add({name:'Upload thiếu tệp',pre:'USER đã đăng nhập.',steps:'POST /uploads, không gửi trường file.',expected:'HTTP 400; không báo tải lên thành công.',role:'USER',method:'POST',url:'/uploads',token:'user',code:400});
    add({name:'Thiếu Bearer token',pre:'Không gửi Authorization.',steps:'GET /auth/me không gửi token.',expected:'HTTP 401; yêu cầu đăng nhập.',role:'GUEST',method:'GET',url:'/auth/me',code:401});
    add({name:'JWT sai chữ ký',pre:'Có token ký bằng khóa kiểm thử sai.',steps:'GET /auth/me với Bearer badToken.',expected:'HTTP 401; không chấp nhận JWT giả.',role:'GUEST',method:'GET',url:'/auth/me',token:'badToken',code:401});
    add({name:'USER bị cấm đọc thống kê ADMIN',pre:'Token USER hợp lệ.',steps:`GET /admin/analytics/daily?from=${from}&to=${to} với Bearer USER.`,expected:'HTTP 403; không trả dữ liệu thống kê.',role:'USER',method:'GET',url:`/admin/analytics/daily?from=${from}&to=${to}`,token:'user',code:403});
    add({name:'Origin giả chứa localhost',pre:'Yêu cầu xuất phát từ Origin không được tin cậy.',steps:'POST /auth/login, đặt Origin=https://localhost.attacker.example.',expected:'HTTP 403 trước bước đăng nhập.',role:'GUEST',method:'POST',url:'/auth/login',origin:'https://localhost.attacker.example',code:403,body:{email:'donor1@gmail.com',password:'{{demoPassword}}'}});
    add({name:'Chuỗi SQL injection tìm kiếm',pre:'CSDL mẫu không có tên chiến dịch trùng chuỗi tấn công.',steps:"GET /campaigns?search=' OR '1'='1 (URL encoded).",expected:'HTTP 200 với mảng rỗng; không lộ truy vấn/stack Prisma.',role:'GUEST',method:'GET',url:'/campaigns?search='+encodeURIComponent("' OR '1'='1"),code:200,checks:["pm.expect(j.data).to.have.lengthOf(0); pm.expect(pm.response.text()).not.to.match(/prisma|SELECT|\\.ts:\\d/i);"]});
    add({name:'Mã PHP đổi đuôi JPG',pre:'USER có quyền upload; invalid-image.jpg chứa mã PHP thuần.',steps:'POST /uploads multipart/form-data: file=invalid-image.jpg, MIME image/jpeg.',expected:'HTTP 415; từ chối nội dung giả ảnh.',role:'USER',method:'POST',url:'/uploads',token:'user',code:415,file:true});
    add({name:'Tệp riêng tư thiếu xác thực',pre:'Không có Bearer token; ID dùng để kiểm tra chặn trước lookup.',steps:'GET /uploads/00000000-0000-4000-8000-000000000001 không token.',expected:'HTTP 401; chặn trước tra cứu tệp. Ca này không chứng minh tệp tồn tại.',role:'GUEST',method:'GET',url:'/uploads/00000000-0000-4000-8000-000000000001',code:401});
    for(const kind of ['daily','campaigns','categories'])add({name:`Báo cáo ${kind} và CSV`,pre:`ADMIN hợp lệ; tổng RECEIPT từ SQL độc lập trong ${from}–${to} là ${sum.received} VND.`,steps:`1. GET /admin/analytics/${kind}?from=${from}&to=${to}. 2. Cộng received các nhóm và đối chiếu SQL. 3. Gửi lại với format=csv.`,expected:`JSON HTTP 200; tổng received=${sum.received}; CSV HTTP 200, Content-Type text/csv, có cột Đã thu VND.`,role:'ADMIN',method:'GET',url:`/admin/analytics/${kind}?from=${from}&to=${to}`,token:'admin',code:200,checks:[`pm.expect(j.data.rows).to.be.an('array'); pm.expect(j.data.rows.reduce((s,r)=>s+Number(r.received),0)).to.eql(Number(pm.variables.get('expectedReceived')));`]});
    const items=cases.flatMap(c=>{
      const script=[`pm.test('${c.id} HTTP ${c.code}',()=>pm.response.to.have.status(${c.code}));`,`const j=pm.response.json();`,`pm.test('${c.id} noi dung',()=>{${c.code>=400?'pm.expect(j.success).to.eql(false);':"pm.expect(j.success).to.eql(true);"}${(c.checks||[]).join('\n')}});`];
      const request:any={method:c.method,header:[{key:'Origin',value:c.origin||'http://localhost:5173'},...(c.token?[{key:'Authorization',value:`Bearer {{${c.token}}}`}]:[])],url:'{{baseUrl}}'+c.url};
      if(c.body){request.header.push({key:'Content-Type',value:'application/json'});request.body={mode:'raw',raw:JSON.stringify(c.body),options:{raw:{language:'json'}}};}
      if(c.file)request.body={mode:'formdata',formdata:[{key:'file',type:'file',src:'invalid-image.jpg',contentType:'image/jpeg'}]};
      const item:any={name:`${c.id} ${c.name} [${c.role}]`,request,event:[{listen:'test',script:{type:'text/javascript',exec:script}}]};
      if(Number(c.id.slice(3))<23)return[item];
      return[item,{name:`${c.id} CSV [ADMIN]`,request:{...request,url:request.url+'&format=csv'},event:[{listen:'test',script:{type:'text/javascript',exec:[`pm.test('${c.id} CSV HTTP 200',()=>pm.response.to.have.status(200));`,`pm.test('${c.id} CSV content',()=>{pm.expect(pm.response.headers.get('Content-Type')).to.include('text/csv');pm.expect(pm.response.text()).to.include('Đã thu VND');});`]}}]}];
    });
    const collection={info:{name:'CSE702051 Chuong 6 - 25 ca API local',schema:'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'},variable:[{key:'baseUrl',value:'http://localhost:5000/api/v1'},{key:'demoPassword',value:''},{key:'expectedReceived',value:String(sum.received)},{key:'badToken',value:'invalid.jwt.signature'}],item:items};
    fs.writeFileSync(path.join(out,'chapter06.postman_collection.json'),JSON.stringify(collection,null,2));
    const result:any=await new Promise((resolve,reject)=>newman.run({collection,workingDir:out,envVar:[{key:'baseUrl',value:base},{key:'demoPassword',value:process.env.DEMO_TEST_PASSWORD||'Password@123'},{key:'expectedReceived',value:String(sum.received)},{key:'badToken',value:jwt.sign({userId:'invalid',role:'ADMIN'},'wrong-key-for-test')}],reporters:['cli','htmlextra'],reporter:{htmlextra:{export:path.join(out,'newman-report.html'),skipSensitiveData:true,titleSize:6,showEnvironmentData:false,showGlobalData:false,title:`Chuong 6 API LOCAL - ${base} - ADMIN USER FUNDRAISER GUEST`,browserTitle:'Newman Chapter 6 actual run',timezone:'Asia/Ho_Chi_Minh'}},timeoutRequest:15000},(err:any,summary:any)=>err?reject(err):resolve(summary)));
    const executions=result.run.executions.map((e:any)=>({name:e.item.name,method:e.request.method,url:e.request.url.toString(),status:e.response?.code,durationMs:e.response?.responseTime,assertions:(e.assertions||[]).map((a:any)=>({name:a.assertion,passed:!a.error,error:a.error?.message})),requestError:e.requestError?.message}));
    const records=cases.map(c=>{const es=executions.filter((e:any)=>e.name.startsWith(c.id+' '));const pass=es.length===(Number(c.id.slice(3))>=23?2:1)&&es.every((e:any)=>!e.requestError&&e.assertions.length===2&&e.assertions.every((a:any)=>a.passed));return{...c,body:undefined,checks:undefined,actual:es.map((e:any)=>`${e.method} ${e.status}; ${e.assertions.filter((a:any)=>a.passed).length}/${e.assertions.length} xác nhận đạt`).join(' | ')+(Number(c.id.slice(3))>=23?`; tổng thu đối chiếu ${sum.received} VND.`:''),result:pass?'PASS':'FAIL'};});
    const report={generatedAt:new Date().toISOString(),sourceCommit,sourceChanges:'Only test teardown and chapter06 evidence scripts; application source unchanged.',environment:'LOCAL real Express/MySQL, test money only',baseUrl:base,database:dbUrl.pathname.slice(1),versions:{node:process.version,mysql:version.version,newman:require(path.join(tools,'newman/package.json')).version},counts,total:records.length,pass:records.filter(c=>c.result==='PASS').length,requests:executions.length,stats:result.run.stats,records,executions};
    fs.writeFileSync(path.join(out,'newman-results.json'),JSON.stringify(report,null,2));
    console.log(`CHAPTER06 ${report.pass}/${report.total} cases; ${report.requests} actual HTTP requests`);
    process.exitCode=report.pass===25?0:1;
  }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));(await import('../src/core/database/redis')).shutdownRedis();await db.$disconnect();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
