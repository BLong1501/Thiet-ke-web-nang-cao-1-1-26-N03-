// Capture the unmodified Newman htmlextra result page, not an imitation of Apidog.
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('@playwright/test');
async function main(){
 const out=path.resolve(__dirname,'../../lecture/chuong6/evidence');
 const browser=await chromium.launch({headless:false,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:5196/',{waitUntil:'networkidle'});
  await page.locator('#pills-summary-tab').waitFor();
  await page.locator('#switch').click();
  await page.screenshot({path:path.join(out,'Hinh_6_1_Newman_tong_hop.png'),fullPage:true});
  await page.locator('#pills-requests-tab').click();
  const buttons=await page.locator('a[data-toggle="collapse"]').allTextContents();
  fs.writeFileSync(path.join(out,'capture-controls.json'),JSON.stringify(buttons,null,2));
  const target=page.locator('a[data-toggle="collapse"]').filter({hasText:'TC-18'}).first();
  await target.click();
  await page.waitForTimeout(500);
  await target.evaluate(el=>el.scrollIntoView({block:'start'}));
  await page.evaluate(()=>{const p=document.createElement('div');p.textContent='Newman · 16/10/2026 · Kết quả LOCAL · TC-18 · Vai trò USER · URL và mã HTTP trong báo cáo bên dưới';p.style.cssText='position:fixed;bottom:0;left:0;right:0;padding:12px;background:white;color:black;border:1px solid #aaa;z-index:9999;font:16px Arial';document.body.appendChild(p);});
  await page.screenshot({path:path.join(out,'Hinh_6_2_Newman_403.png')});
  await page.locator('#pills-summary-tab').click();
  console.log('Captured actual Newman reporter summary and TC-18 assertion details.');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
