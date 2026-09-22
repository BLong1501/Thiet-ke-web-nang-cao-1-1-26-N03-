import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { UserRole } from '@prisma/client';
// Configure isolated test values before importing application modules.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-access-key-never-use-in-production';
process.env.JWT_REFRESH_SECRET = 'test-only-refresh-key-never-use-in-production';
process.env.DATABASE_URL = 'mysql://test:test@127.0.0.1:1/test_not_connected';

let app: any, verificationService: any, authService: any, authRepository: any, AuthService: any, VerificationService: any;
const originals: Array<[any,string,any]> = [];
function replace(target: any, key: string, fn: any) {
  originals.push([target,key,target[key]]); target[key] = fn;
}
let calls: any[] = [];
const token = (role: UserRole, userId='user-a') => jwt.sign({userId,email:'test@example.test',role}, process.env.JWT_SECRET!, {expiresIn:'5m'});
const body = { idCardNumber:'000000000001',frontCardImage:'https://example.test/front.jpg',backCardImage:'https://example.test/back.jpg',portraitImage:'https://example.test/portrait.jpg' };
const protectedRoutes = [
  ['get','/auth/me'],['post','/verifications/request'],['get','/verifications/my-status'],
  ['get','/verifications/pending'],['get','/verifications/existing-id'],['patch','/verifications/existing-id/review']
];
const adminRoutes = [['get','/verifications/pending'],['get','/verifications/existing-id'],['patch','/verifications/existing-id/review']];
const hit = (method:string,url:string) => (request(app) as any)[method]('/api/v1'+url);
before(async()=>{
  app=(await import('../src/app')).default;
  const verificationModule=await import('../src/modules/verifications/verification.service');
  verificationService=verificationModule.verificationService; VerificationService=verificationModule.VerificationService;
  const authModule=await import('../src/modules/auth/auth.service');
  authService=authModule.authService; AuthService=authModule.AuthService;
  authRepository=(await import('../src/modules/auth/auth.repository')).authRepository;
  replace(authService,'getProfile',async(id:string)=>{calls.push(['profile',id]);return {id,role:'USER'};});
  replace(verificationService,'getMyVerificationStatus',async(id:string)=>{calls.push(['status',id]);return {hasSubmitted:false,status:null,verification:null};});
  replace(verificationService,'submitVerification',async(id:string,input:any)=>{calls.push(['submit',id,input]);return {message:'ok',verification:{id:'kyc-a',userId:id,status:'PENDING'}};});
  replace(verificationService,'getPendingVerifications',async()=>{calls.push(['list']);return {items:[],meta:{page:1,limit:10,total:0,totalPages:0}};});
  replace(verificationService,'getVerificationDetail',async(id:string)=>{calls.push(['detail',id]);return {id};});
  replace(verificationService,'reviewVerification',async(admin:string,id:string,input:any)=>{calls.push(['review',admin,id,input]);return {message:'ok',verification:{id,status:input.status}};});
});
beforeEach(()=>{calls=[];});
after(()=>{for(const [target,key,fn] of originals.reverse()) target[key]=fn;});

for(const [method,url] of protectedRoutes) {
  test(`TOKEN-01 ${method.toUpperCase()} ${url}: missing token -> 401`,async()=>{
    const response=await hit(method,url).send({status:'APPROVED',...body});
    assert.equal(response.status,401);assert.equal(response.body.success,false);assert.equal(calls.length,0);
  });
  test(`TOKEN-02 ${method.toUpperCase()} ${url}: bad signature -> 401`,async()=>{
    const bad=jwt.sign({userId:'a',role:'ADMIN'},'wrong-key');
    const response=await hit(method,url).set('Authorization',`Bearer ${bad}`).send({status:'APPROVED',...body});
    assert.equal(response.status,401);assert.equal(calls.length,0);
  });
}
for(const role of [UserRole.USER,UserRole.FUNDRAISER]) for(const [method,url] of adminRoutes) {
  test(`DENY ${role} ${method.toUpperCase()} ${url}: 403 before business handler`,async()=>{
    const response=await hit(method,url).set('Authorization',`Bearer ${token(role)}`).send({status:'APPROVED'});
    assert.equal(response.status,403);assert.equal(response.body.success,false);assert.equal(calls.length,0);
  });
}
for(const [method,url] of adminRoutes) test(`ALLOW ADMIN ${method.toUpperCase()} ${url}`,async()=>{
  const response=await hit(method,url).set('Authorization',`Bearer ${token(UserRole.ADMIN)}`).send({status:'APPROVED'});
  assert.equal(response.status,200);assert.equal(calls.length,1);
});
for(const [name,key,options] of [['expired',process.env.JWT_SECRET!,{expiresIn:-1}],['refresh',process.env.JWT_REFRESH_SECRET!,{expiresIn:300}]] as const) {
  test(`TOKEN-02 ${name} token is rejected`,async()=>{
    const value=jwt.sign({userId:'a',role:'ADMIN'},key,options);
    const response=await hit('get','/verifications/pending').set('Authorization',`Bearer ${value}`);
    assert.equal(response.status,401);assert.equal(calls.length,0);
  });
}
test('IDOR-01 profile identity comes from token',async()=>{
  const response=await hit('get','/auth/me?userId=user-b').set('Authorization',`Bearer ${token(UserRole.USER)}`);
  assert.equal(response.status,200);assert.deepEqual(calls,[['profile','user-a']]);
});
test('IDOR-02 KYC status identity comes from token',async()=>{
  const response=await hit('get','/verifications/my-status?userId=user-b').set('Authorization',`Bearer ${token(UserRole.USER)}`);
  assert.equal(response.status,200);assert.deepEqual(calls,[['status','user-a']]);
});
test('IDOR-03 submit strips injected owner and role',async()=>{
  const response=await hit('post','/verifications/request').set('Authorization',`Bearer ${token(UserRole.USER)}`).send({...body,userId:'user-b',role:'ADMIN'});
  assert.equal(response.status,201);assert.equal(calls[0][1],'user-a');assert.equal(calls[0][2].userId,undefined);assert.equal(calls[0][2].role,undefined);
});
for(const status of ['PENDING','UNKNOWN']) test(`ROLE-07 review ${status} rejected before side effects`,async()=>{
  const response=await hit('patch','/verifications/existing-id/review').set('Authorization',`Bearer ${token(UserRole.ADMIN)}`).send({status});
  assert.equal(response.status,400);assert.equal(calls.length,0);assert.ok(response.body.errors.some((e:any)=>e.field==='status'));
});
for(const reason of [undefined,'  ab  ']) test(`ROLE-08 invalid rejection reason ${String(reason)}`,async()=>{
  const response=await hit('patch','/verifications/existing-id/review').set('Authorization',`Bearer ${token(UserRole.ADMIN)}`).send({status:'REJECTED',rejectionReason:reason});
  assert.equal(response.status,400);assert.equal(calls.length,0);
});
for(const role of [UserRole.FUNDRAISER,UserRole.ADMIN]) test(`ROLE-03 service rejects ${role} KYC with 400`,async()=>{
  let writes=0;
  const service=new VerificationService({create:()=>{writes++;},findByUserId:()=>{throw new Error('must not look up KYC');}}, {findById:async()=>({id:'a',role})});
  await assert.rejects(()=>service.submitVerification('a',body),(error:any)=>error.statusCode===400);assert.equal(writes,0);
});
test('ROLE-01 registration cannot forward an injected ADMIN role; hashes password',async()=>{
  let saved:any;
  const repo={findByEmail:async()=>null,createUser:async(data:any)=>{saved=data;return {id:'new-user',email:data.email,role:'USER'};}};
  const service=new AuthService(repo);
  const result=await service.register({email:'new@example.test',password:'Example123!',fullName:'Test',role:'ADMIN'});
  assert.equal(saved.role,undefined);assert.notEqual(saved.passwordHash,'Example123!');assert.match(saved.passwordHash,/^\$2[aby]\$10\$/);assert.equal(result.user.role,'USER');
});
test('BM05-01 invalid KYC input fails before writes',async()=>{
  const response=await hit('post','/verifications/request').set('Authorization',`Bearer ${token(UserRole.USER)}`).send({idCardNumber:'x'});
  assert.equal(response.status,400);assert.equal(calls.length,0);assert.ok(response.body.errors.length>0);
});
test('health route is public and keeps its actual response format',async()=>{
  const response=await hit('get','/health');assert.equal(response.status,200);assert.equal(response.body.status,'success');assert.ok(response.body.timestamp);
});
