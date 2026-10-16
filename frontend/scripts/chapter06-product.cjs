// Visible Chrome, real app/API/database. No route.fulfill, fixture responses or UI result injection.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'lecture/chuong6/evidence');
require(path.join(root,'backend/node_modules/dotenv')).config({path:path.join(root,'backend/.env'),quiet:true});
const site='http://localhost:5173',api='http://localhost:5000/api/v1';
async function main(){
 assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
 const browser=await chromium.launch({headless:false,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const results=[];let originalBio,userToken;
 async function capture(page,file,role,description){
  const timestamp=new Date().toISOString();
  await page.evaluate(({role,timestamp})=>{document.getElementById('chapter6-evidence')?.remove();const bar=document.createElement('div');bar.id='chapter6-evidence';bar.textContent=`KIỂM THỬ TRÊN SẢN PHẨM LOCAL | ${location.href} | ${new Date(timestamp).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} UTC+7 | ${role}`;bar.style.cssText='position:fixed;bottom:0;left:0;right:0;padding:10px 16px;background:#fff;color:#111;border:1px solid #888;z-index:2147483647;font:14px Arial';document.body.appendChild(bar);},{role,timestamp});
  await page.screenshot({path:path.join(out,file)});
  results.push({id:'UI-'+file.split('_')[2],file,url:page.url(),role,timestamp,result:'PASS',description});
  await page.evaluate(()=>document.getElementById('chapter6-evidence')?.remove());
 }
 async function login(page,email,role){
  await page.goto(site+'/login');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill(process.env.DEMO_TEST_PASSWORD||'Password@123');
  const pending=page.waitForResponse(r=>r.url().endsWith('/auth/login')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();const r=await pending;assert.equal(r.status(),200);const j=await r.json();assert.equal(j.data.user.role,role);await page.waitForURL(/\/(dashboard|admin)/);await page.getByRole('heading',{level:1}).first().waitFor();return j.data.accessToken;
 }
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  userToken=await login(page,'donor1@gmail.com','USER');
  await capture(page,'Hinh_6_3_San_pham_dang_nhap.png','USER','Đăng nhập bằng form thật; API 200 trả USER; trang dashboard hiển thị.');
  const get=await fetch(api+'/profile/me',{headers:{Authorization:'Bearer '+userToken}}).then(r=>r.json());originalBio=get.data.bio;
  await page.goto(site+'/profile');const bio=page.getByLabel('Giới thiệu',{exact:true});await bio.fill('Kiểm thử Chương 6 ngày 16/10/2026: lưu hồ sơ và đọc lại từ hệ thống.');
  const save=page.waitForResponse(r=>r.url().endsWith('/profile/me')&&r.request().method()==='PUT');await page.getByRole('button',{name:'Lưu thông tin',exact:true}).click();assert.equal((await save).status(),200);await page.getByText('Đã lưu hồ sơ.',{exact:true}).waitFor();await page.reload();await bio.waitFor();assert.equal(await bio.inputValue(),'Kiểm thử Chương 6 ngày 16/10/2026: lưu hồ sơ và đọc lại từ hệ thống.');
  await bio.scrollIntoViewIfNeeded();await capture(page,'Hinh_6_4_San_pham_luu_ho_so.png','USER','Lưu qua UI; PUT 200; tải lại trang và đối chiếu nội dung từ API thật.');
  await page.goto(site+'/admin/analytics');await page.getByRole('heading',{name:'Bạn chưa có quyền truy cập'}).waitFor();await capture(page,'Hinh_6_5_San_pham_chan_quan_tri.png','USER','Route guard chặn USER mở trang thống kê quản trị; kiểm quyền backend riêng tại TC-18.');
  await page.goto(site+'/profile?tab=kyc');const file=page.locator('input[type=file]').first();await file.waitFor();const upload=page.waitForResponse(r=>r.url().endsWith('/uploads')&&r.request().method()==='POST');await file.setInputFiles({name:'invalid-image.jpg',mimeType:'image/jpeg',buffer:Buffer.from('<?php echo 123; ?>')});assert.equal((await upload).status(),415);const error=page.getByRole('alert').filter({hasText:'Chỉ nhận ảnh PNG/JPEG thật'});await error.waitFor();await error.scrollIntoViewIfNeeded();await capture(page,'Hinh_6_6_San_pham_tu_choi_anh_gia.png','USER','Chọn JPG giả trên form KYC; API thật trả 415; UI hiển thị lỗi, không gửi hồ sơ.');
  const list=await fetch(api+'/campaigns').then(r=>r.json());const campaign=list.data[0];assert.ok(campaign?.id);
  await page.goto(site+'/campaigns');const link=page.locator(`a[href="/campaigns/${campaign.slug||campaign.id}"]`).first();await link.waitFor();await link.click();await page.getByRole('heading',{name:campaign.title,exact:true}).waitFor();assert.ok(page.url().includes(campaign.slug||campaign.id));await capture(page,'Hinh_6_7_San_pham_chien_dich.png','USER','Mở danh sách, chọn đúng chiến dịch trong API, đối chiếu tiêu đề và URL trang chi tiết.');
  const adminContext=await browser.newContext({viewport:{width:1440,height:1300}}),adminPage=await adminContext.newPage();await login(adminPage,'admin@crowdfunding.vn','ADMIN');
  const reports=[];adminPage.on('response',async r=>{if(r.url().includes('/admin/analytics/')&&!r.url().includes('format=csv')&&r.status()===200){try{reports.push(await r.json());}catch{}}});
  await adminPage.goto(site+'/admin/analytics');await adminPage.getByRole('heading',{name:'Báo cáo thống kê',exact:true}).waitFor();await adminPage.getByRole('heading',{name:'Thu và hoàn theo ngày',exact:true}).waitFor();await adminPage.locator('table tbody tr').first().waitFor();
  await adminPage.waitForTimeout(2000); // Let the real chart animation reach its final values before capture.
  await capture(adminPage,'Hinh_6_8_San_pham_thong_ke.png','ADMIN','Ba báo cáo gọi API thật; biểu đồ và bảng số liệu từ MySQL local.');
  const download=adminPage.waitForEvent('download');await adminPage.getByRole('button',{name:'Xuất CSV toàn bộ báo cáo'}).first().click();const d=await download;await d.saveAs(path.join(out,'product-daily.csv'));const csv=fs.readFileSync(path.join(out,'product-daily.csv'),'utf8');assert.ok(csv.includes('Đã thu VND'));assert.equal(reports.length,3);for(const r of reports)assert.equal(r.data.rows.reduce((s,x)=>s+Number(x.received),0),35000000);
  results.push({id:'UI-CSV',result:'PASS',role:'ADMIN',timestamp:new Date().toISOString(),description:'Nhấn xuất CSV trên sản phẩm, nhận tệp thật; ba báo cáo đều có tổng thu 35.000.000 VND.'});
 }finally{
  if(userToken&&originalBio!==undefined){const restore=await fetch(api+'/profile/me',{method:'PUT',headers:{Authorization:'Bearer '+userToken,'Content-Type':'application/json'},body:JSON.stringify({bio:originalBio||''})});assert.equal(restore.status,200);}
  fs.writeFileSync(path.join(out,'product-results.json'),JSON.stringify({generatedAt:new Date().toISOString(),environment:'Visible Chrome + actual frontend/API/MySQL local; no response mocking',annotation:'Only a provenance strip with actual URL, timestamp and verified role is added for screenshots. Application results are unchanged.',results},null,2));
  await browser.close();
 }
 console.log(`PRODUCT ${results.length}/${results.length} checks; six actual application screenshots`);
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
