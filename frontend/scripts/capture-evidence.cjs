const fs=require('node:fs');const path=require('node:path');
const {chromium}=require('@playwright/test');const AxeBuilder=require('@axe-core/playwright').default;
async function main(){
  const origin=process.env.EVIDENCE_SITE_URL||'http://localhost:5173';const api=process.env.EVIDENCE_API_URL||'http://localhost:5000/api/v1';
  if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('This capture is local only');
  const login=await fetch(api+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@crowdfunding.vn',password:process.env.DEMO_TEST_PASSWORD||'Password@123'})});
  if(!login.ok)throw Error('Demo admin login failed');const {data}=await login.json();
  const output=path.resolve(__dirname,'../../lecture/hoan-thien-V4-V5/evidence');fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    const page=await context.newPage();
    await page.addInitScript(session=>sessionStorage.setItem('fundtrust-session-v2',JSON.stringify({state:session,version:0})),{user:{...data.user,name:data.user.fullName},token:data.accessToken,isAuthenticated:true});
    await page.goto(origin+'/admin/analytics');await page.getByRole('heading',{name:'Báo cáo thống kê',exact:true}).waitFor();
    await page.getByRole('button',{name:'Xuất CSV toàn bộ báo cáo'}).nth(2).waitFor();
    const sections=page.locator('section.panel');for(let i=0;i<3;i++)await sections.nth(i).screenshot({path:path.join(output,`V5_B7_0${i+1}_Bieu_do.png`)});
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:path.join(output,'V5_B7_Trang_thong_ke.png'),fullPage:true});
    const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    fs.writeFileSync(path.join(output,'wcag-analytics-live.json'),JSON.stringify({generatedAt:new Date().toISOString(),environment:'LOCAL',url:origin+'/admin/analytics',violations:audit.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),passes:audit.passes.map(p=>p.id)},null,2));
    console.log(JSON.stringify({screenshots:4,wcagViolations:audit.violations.length}));
    if(audit.violations.some(v=>['serious','critical'].includes(v.impact)))process.exitCode=1;
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
