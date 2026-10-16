const {execFileSync}=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const objects=execFileSync('git',['rev-list','--objects','--all'],{cwd:root,encoding:'utf8'}).trim().split('\n');
const findings=[];let scanned=0;
for(const entry of objects){
  const match=entry.match(/^([a-f0-9]+) (.+)$/);if(!match)continue;
  const [,oid,file]=match;if(!/\.(ts|tsx|js|cjs|json|md|ya?ml|sql|env|txt|example)$/.test(file)&&!/(^|\/)\.env/.test(file))continue;
  let text;try{text=execFileSync('git',['cat-file','blob',oid],{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024});}catch{continue;}
  scanned++;
  for(const [name,pattern] of [['Aiven credential',/AVNS_[A-Za-z0-9]{12,}/],['Private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['GitHub token',/gh[pousr]_[A-Za-z0-9]{30,}/],['Tracked env file',/(?:^|\/)\.env(?:$|\.(?!example)[^/]+$)/]]){
    if(pattern.test(name==='Tracked env file'?file:text))findings.push({oid,file,type:name});
  }
}
const destination=path.resolve(root,'lecture/hoan-thien-V4-V5/evidence/secret-history.json');fs.mkdirSync(path.dirname(destination),{recursive:true});
fs.writeFileSync(destination,JSON.stringify({generatedAt:new Date().toISOString(),scope:'All reachable git objects; four explicit detectors, not exhaustive secret assurance',scanned,findings},null,2));
console.log(JSON.stringify({scanned,findings:findings.length,report:destination}));process.exitCode=findings.length?1:0;
