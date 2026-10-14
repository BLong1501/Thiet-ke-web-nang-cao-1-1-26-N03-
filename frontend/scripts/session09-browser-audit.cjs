const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {execFileSync}=require('node:child_process');
const {chromium}=require('@playwright/test');const AxeBuilder=require('@axe-core/playwright').default;
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
require(path.join(root,'backend/node_modules/dotenv')).config({path:path.join(root,'backend/.env'),quiet:true});
const site=process.env.EVIDENCE_SITE_URL||'http://localhost:5173',api=process.env.EVIDENCE_API_URL||'http://localhost:5000/api/v1';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function main(){
  for(const url of [site,api,process.env.DATABASE_URL])if(!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('This script only tests local services');
  const output=path.join(root,'lecture/buoi9/V5/evidence'),securityDir=path.join(root,'lecture/buoi8/V4/evidence');fs.mkdirSync(output,{recursive:true});
  const audit=JSON.parse(fs.readFileSync(path.join(securityDir,'security-results.json'),'utf8'));
  const matrix=JSON.parse(fs.readFileSync(path.join(securityDir,'permission-matrix.json'),'utf8'));
  const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
    const results=[],keyboard=[],dialogs=[];let reportServer;
  const password=process.env.DEMO_TEST_PASSWORD||'Password@123';
  async function login(email){const r=await fetch(api+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});assert.equal(r.status,200,'Login '+email);return (await r.json()).data;}
  async function session(data){const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(state=>sessionStorage.setItem('fundtrust-session-v2',JSON.stringify({state,version:0})),{user:{...data.user,name:data.user.fullName},token:data.accessToken,isAuthenticated:true});return context;}
  async function tabTo(page,locator){await locator.waitFor();for(let i=0;i<70;i++){if(await locator.evaluate(el=>el===document.activeElement))return;await page.keyboard.press('Tab');}throw Error('Cannot reach element using Tab');}
  async function appScreenshot(page,file,role){
    await page.evaluate(role=>{
      const context=document.createElement('div');context.id='test-evidence-context';
      context.textContent=`Ngữ cảnh kiểm thử thực tế: ${location.href} · ${new Date().toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} (UTC+7) · Vai trò ${role} · LOCAL`;
      context.style.cssText='position:relative;z-index:99999;padding:12px 20px;background:#17243b;color:white;font:14px Arial,sans-serif;';
      document.body.prepend(context);
    },role);
    await page.screenshot({path:file,fullPage:true});
    await page.evaluate(()=>document.getElementById('test-evidence-context')?.remove());
  }
  try{
    // Keyboard-only real login: no click/focus/fill shortcuts after initial navigation.
    const loginContext=await browser.newContext({viewport:{width:1440,height:1000}});const page=await loginContext.newPage();
    await page.goto(site+'/login');await page.getByLabel('Email',{exact:true}).waitFor();
    await tabTo(page,page.getByLabel('Email',{exact:true}));await page.keyboard.type('donor1@gmail.com');
    await tabTo(page,page.getByLabel('Mật khẩu',{exact:true}));await page.keyboard.type(password);
    await tabTo(page,page.getByRole('button',{name:'Đăng nhập',exact:true}));
    await appScreenshot(page,path.join(output,'Ban_phim_01_Dang_nhap_focus.png'),'GUEST');
    await page.keyboard.press('Enter');await page.waitForURL(/\/dashboard/,{timeout:20000});
    await page.getByRole('heading',{level:1}).first().waitFor();await appScreenshot(page,path.join(output,'Ban_phim_02_Dang_nhap_thanh_cong.png'),'USER');
    keyboard.push({flow:'Login using Tab/type/Enter only',result:'PASS',url:page.url(),role:'USER',time:new Date().toISOString()});
    // Real profile persistence and output escaping, with restoration afterward.
    const user=await login('donor1@gmail.com');
    const old=await fetch(api+'/profile/me',{headers:{Authorization:'Bearer '+user.accessToken}}).then(r=>r.json());
    const original=old.data.bio;const payload='<script>alert(1)</script><img src=x onerror=alert(1)>';
    try{
      const write=await fetch(api+'/profile/me',{method:'PUT',headers:{Authorization:'Bearer '+user.accessToken,'Content-Type':'application/json'},body:JSON.stringify({bio:payload})});assert.equal(write.status,200);
      await page.goto(site+'/profile');page.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss();});
      await page.getByLabel('Giới thiệu',{exact:true}).waitFor();assert.equal(await page.getByLabel('Giới thiệu',{exact:true}).inputValue(),payload);
      await page.waitForTimeout(300);assert.equal(dialogs.length,0);
      await appScreenshot(page,path.join(output,'Anh_17_XSS_plain_text.png'),'USER');
      await tabTo(page,page.getByLabel('Giới thiệu',{exact:true}));
      await page.keyboard.press('Control+A');await page.keyboard.type('Kiểm thử bàn phím Buổi 9: lưu và đọc lại hồ sơ.');
      await tabTo(page,page.getByRole('button',{name:'Lưu thông tin',exact:true}));await appScreenshot(page,path.join(output,'Ban_phim_03_Luu_ho_so_focus.png'),'USER');await page.keyboard.press('Enter');
      await page.getByText('Đã lưu hồ sơ.',{exact:true}).waitFor();await page.reload();await page.getByLabel('Giới thiệu',{exact:true}).waitFor();
      assert.equal(await page.getByLabel('Giới thiệu',{exact:true}).inputValue(),'Kiểm thử bàn phím Buổi 9: lưu và đọc lại hồ sơ.');
      keyboard.push({flow:'Profile edit/save/reload using Tab/type/Enter',result:'PASS',url:page.url(),role:'USER',time:new Date().toISOString()});
    }finally{await fetch(api+'/profile/me',{method:'PUT',headers:{Authorization:'Bearer '+user.accessToken,'Content-Type':'application/json'},body:JSON.stringify({bio:original||''})});}
    const admin=await login('admin@crowdfunding.vn');const adminContext=await session(admin);const adminPage=await adminContext.newPage();
    // Read-only scans with real HTTP/MySQL, not route interception or fixtures.
    for(const [url,role,p] of [['/','GUEST',await (await browser.newContext({viewport:{width:1440,height:1000}})).newPage()],['/login','GUEST',await (await browser.newContext({viewport:{width:1440,height:1000}})).newPage()],['/profile','USER',page],['/admin','ADMIN',adminPage],['/admin/analytics','ADMIN',adminPage],['/admin/categories','ADMIN',adminPage]]){
      await p.goto(site+url);await p.getByRole('heading',{level:1}).first().waitFor();await p.waitForLoadState('networkidle');
      const scan=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
      const metadata=await p.evaluate(()=>({title:document.title,description:document.querySelector('meta[name="description"]')?.getAttribute('content'),canonical:document.querySelector('link[rel="canonical"]')?.getAttribute('href'),robots:document.querySelector('meta[name="robots"]')?.getAttribute('content')}));
      assert.ok(metadata.title);assert.ok(metadata.description);assert.ok(metadata.canonical);
      if(role!=='GUEST')assert.ok(metadata.robots?.includes('noindex'));
      results.push({url:site+url,role,time:new Date().toISOString(),metadata,passes:scan.passes.length,violations:scan.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:scan.incomplete.map(v=>({id:v.id,description:v.description}))});
    }
    const cookies=await loginContext.cookies();const cookie=cookies.find(c=>c.name==='refreshToken');assert.ok(cookie);
    const safeCookie={name:cookie.name,httpOnly:cookie.httpOnly,secure:cookie.secure,sameSite:cookie.sameSite,path:cookie.path,expires:cookie.expires,value:'REDACTED',origin:site,role:'USER',time:new Date().toISOString(),note:'Actual Chrome cookie properties on local development; not a DevTools Application-tab screenshot or online Secure proof'};
    const publicFiles=[];
    for(const file of ['/robots.txt','/sitemap.xml']){const response=await fetch(site+file);assert.equal(response.status,200);const text=await response.text();assert.ok(file==='/robots.txt'?text.includes('Disallow: /admin'):text.includes('<urlset'));publicFiles.push({url:site+file,status:response.status,role:'GUEST',time:new Date().toISOString(),body:text});}
    fs.writeFileSync(path.join(output,'browser-audit.json'),JSON.stringify({environment:'LOCAL',generatedAt:new Date().toISOString(),scope:'Real browser, API and MySQL; no intercepted network responses',results,publicFiles,keyboard,xss:{url:site+'/profile',role:'USER',dialogs:dialogs.length,payload,result:'PASS'},cookie:safeCookie},null,2));
    const curl=execFileSync('curl.exe',['-sS','-I',api+'/health'],{encoding:'utf8'});
    fs.writeFileSync(path.join(securityDir,'curl-headers.txt'),curl);
    const blocks={};
    for(const c of audit.checks)blocks[c.id]=`<h2>${escape(c.id+' — '+c.title)}</h2><p>Trạng thái thực tế: <strong>${escape(c.result)}</strong> · ${escape(c.time)}</p><pre>${escape(JSON.stringify(c.observations??c.error,null,2))}</pre>`;
    blocks.BM5=`<h2>BM5 — Ma trận gọi trực tiếp API</h2><p>${matrix.rows.length} lần gọi · ${escape(matrix.generatedAt)} · LOCAL</p><table><thead><tr><th>Role</th><th>Method / URL đã gọi</th><th>Mong đợi</th><th>HTTP thực tế</th></tr></thead><tbody>${matrix.rows.map(r=>`<tr><td>${escape(r.role)}</td><td>${escape(r.method+' '+r.url)}</td><td>${r.expected}</td><td>${r.actual} ${escape(r.result)}</td></tr>`).join('')}</tbody></table>`;
    blocks.BM12=`<h2>BM12 — curl -I chạy thật trên API local</h2><p>Lệnh: curl.exe -sS -I ${escape(api+'/health')} · GUEST · ${escape(new Date().toISOString())}</p><pre>${escape(curl)}</pre><p>Chưa có tên miền HTTPS; ảnh này là bằng chứng local.</p>`;
    blocks.COOKIE=`<h2>BM7 — Thuộc tính cookie do Chrome đọc thật</h2><pre>${escape(JSON.stringify(safeCookie,null,2))}</pre><p>Cần bổ sung ảnh tab Application khi triển khai.</p>`;
    blocks.WCAG=`<h2>Ảnh 30 — Kết quả axe WCAG 2.1 A/AA</h2><p>Quét trình duyệt thật nối API/MySQL local. Axe không cung cấp điểm Lighthouse; không tự tạo điểm số.</p><table><tr><th>URL thật</th><th>Vai trò</th><th>Thời điểm</th><th>Rule đạt</th><th>Violation</th><th>Cần kiểm thủ công</th></tr>${results.map(r=>`<tr><td>${escape(r.url)}</td><td>${escape(r.role)}</td><td>${escape(r.time)}</td><td>${r.passes}</td><td>${r.violations.length}</td><td>${r.incomplete.length}</td></tr>`).join('')}</table><pre>${escape(JSON.stringify(keyboard,null,2))}</pre><p>Kết quả chi tiết và selector lỗi: browser-audit.json.</p>`;
    const style='body{font:16px Arial,sans-serif;color:#17243b;background:#f4f7fb;margin:0;padding:32px}main{max-width:1300px;margin:auto;background:white;padding:28px;border:1px solid #dce4ef;border-radius:12px}h1{font-size:25px}h2{font-size:22px}p{line-height:1.5}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#eef3f9;padding:18px;font:15px Consolas,monospace}table{border-collapse:collapse;width:100%;font-size:14px}th,td{border:1px solid #dce4ef;padding:10px;text-align:left;overflow-wrap:anywhere}th{background:#e8f0fc}strong{color:#075b3a}';
    const html=key=>`<!doctype html><html lang="vi"><meta charset="UTF-8"><title>Bằng chứng thực tế ${escape(key)}</title><style>${style}</style><main><h1>Báo cáo kiểm chứng tự động · Buổi 8 V4 / Buổi 9 V5</h1><p>Đây là báo cáo từ request, query và Chrome chạy thật; LOCAL, không phải bằng chứng trực tuyến. Không chứa token hay cookie value.</p>${blocks[key]||'<p>Không tìm thấy</p>'}</main></html>`;
    reportServer=http.createServer((req,res)=>{const key=req.url.slice(1).split('?')[0]||'WCAG';res.setHeader('Content-Type','text/html; charset=utf-8');
      if(key==='ATTACKFORM'){res.end(`<html lang="vi"><meta charset="UTF-8"><title>Biểu mẫu ngoài hệ thống</title><h1>Kiểm thử CSRF từ origin khác</h1><form method="post" action="${escape(api+'/auth/login')}"><input type="hidden" name="email" value="csrf-test@example.test"><input type="hidden" name="password" value="invalid"><button>Gửi biểu mẫu ngoài</button></form></html>`);return;}
      res.end(key==='LIGHTHOUSE'?fs.readFileSync(path.join(output,'lighthouse-home.report.html')):html(key));});
    await new Promise(r=>reportServer.listen(0,'127.0.0.1',r));const reportOrigin='http://127.0.0.1:'+reportServer.address().port;
    const reportPage=await (await browser.newContext({viewport:{width:1440,height:1000}})).newPage();
    await reportPage.goto(reportOrigin+'/ATTACKFORM');
    const forgedNavigation=reportPage.waitForNavigation();await reportPage.getByRole('button',{name:'Gửi biểu mẫu ngoài'}).click();
    const forgedResponse=await forgedNavigation;assert.equal(forgedResponse.status(),403);
    await appScreenshot(reportPage,path.join(securityDir,'Anh_18b_Bieu_mau_ngoai_403.png'),'GUEST — biểu mẫu từ origin khác — HTTP '+forgedResponse.status());
    await reportPage.context().setExtraHTTPHeaders({Authorization:'Bearer '+admin.accessToken});
    const invalidResponse=await reportPage.goto(api+'/users?limit=invalid');assert.equal(invalidResponse.status(),400);
    await appScreenshot(reportPage,path.join(securityDir,'Anh_24b_Phan_hoi_loi_that.png'),'ADMIN — HTTP '+invalidResponse.status());
    await reportPage.context().setExtraHTTPHeaders({});
    const map={BM1:'Anh_16_SQLi.png',BM3:'Anh_18_CSRF.png',BM4:'Anh_19_IDOR.png',BM5:'Anh_20_Ma_tran_quyen.png',BM6:'Anh_21_Hash_mat_khau.png',BM8:'Anh_23_Upload_private.png',BM9:'Anh_24_Che_loi_production_test.png',BM10:'Anh_25_429_va_nhat_ky.png',BM11:'BM11_Quet_lich_su.png',BM12:'Anh_26_Curl_LOCAL.png',COOKIE:'BM7_Cookie_Chrome_LOCAL.png',WCAG:'Anh_30_Axe_WCAG_LOCAL.png'};
    for(const [key,file]of Object.entries(map)){
      fs.writeFileSync(path.join(key==='WCAG'?output:securityDir,key+'-report.html'),html(key));
      await reportPage.goto(reportOrigin+'/'+key);await reportPage.screenshot({path:path.join(key==='WCAG'?output:securityDir,file),fullPage:true});
    }
    // Capture the unmodified Lighthouse HTML report, not a recreated score graphic.
    if(fs.existsSync(path.join(output,'lighthouse-home.report.html'))){
      await reportPage.goto(reportOrigin+'/LIGHTHOUSE');await reportPage.locator('.lh-gauge__percentage:visible').first().waitFor();
      await reportPage.screenshot({path:path.join(output,'Anh_30_Lighthouse_Accessibility_SEO.png'),fullPage:true});
    }
    // Paginate the actual permission results for readable submission images.
    for(let offset=0;offset<matrix.rows.length;offset+=35){
      const pageIndex=Math.floor(offset/35)+1,key='BM5_PAGE_'+pageIndex;
      blocks[key]=`<h2>BM5 — Kết quả thực tế ${offset+1}–${Math.min(offset+35,matrix.rows.length)} / ${matrix.rows.length}</h2><p>LOCAL · ${escape(matrix.generatedAt)}</p><table><tr><th>Vai trò</th><th>Method / URL thực tế</th><th>Mong đợi</th><th>HTTP nhận được</th></tr>${matrix.rows.slice(offset,offset+35).map(r=>`<tr><td>${escape(r.role)}</td><td>${escape(r.method+' '+r.url)}</td><td>${r.expected}</td><td>${r.actual} ${escape(r.result)}</td></tr>`).join('')}</table>`;
      await reportPage.goto(reportOrigin+'/'+key);await reportPage.screenshot({path:path.join(securityDir,`Anh_20_${pageIndex}_Ma_tran_quyen.png`),fullPage:true});
    }
    console.log(JSON.stringify({pages:results.length,violations:results.reduce((s,r)=>s+r.violations.length,0),keyboard:keyboard.length,xssDialogs:dialogs.length,reportScreenshots:Object.keys(map).length}));
    if(results.some(r=>r.violations.some(v=>['serious','critical'].includes(v.impact))))process.exitCode=1;
  }finally{if(reportServer)await new Promise(r=>reportServer.close(r));await browser.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
