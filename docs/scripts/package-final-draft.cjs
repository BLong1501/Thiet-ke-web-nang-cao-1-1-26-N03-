const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');const name=process.env.SUBMISSION_NAME||'CSE702051_N03_Nhom09_DT09_DRAFT';
if(!/^[A-Za-z0-9_-]+$/.test(name))throw Error('Invalid submission name');
const output=path.join(root,'submission-output',name);
if(fs.existsSync(output))throw Error('Output already exists; use a new SUBMISSION_NAME (no overwrite)');
const folders=['00_HOSO','01_BAOCAO','02_MANGUON','03_CSDL','04_TAILIEU','05_KIEMTHU','06_DEMO','07_THIETKE'];folders.forEach(f=>fs.mkdirSync(path.join(output,f),{recursive:true}));
const manifest=[];function copy(source,target){const data=fs.readFileSync(path.join(root,source));const dest=path.join(output,target);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,data);manifest.push({file:target,sha256:crypto.createHash('sha256').update(data).digest('hex')});}
const candidates=execFileSync('git',['ls-files','--cached','--others','--exclude-standard'],{cwd:root,encoding:'utf8'}).trim().split('\n');
for(const file of [...new Set(candidates)]){
  if(!/^(backend|frontend)\//.test(file)||/(^|\/)(node_modules|dist|private-uploads|test-results|playwright-report|\.git)(\/|$)/.test(file)||/(^|\/)\.env(?!\.example$)/.test(file))continue;
  if(!fs.existsSync(path.join(root,file)))continue;
  copy(file,'02_MANGUON/'+file);
}
for(const file of ['docker-compose.yml','.gitignore','README.md','render.yaml'])if(fs.existsSync(path.join(root,file)))copy(file,'02_MANGUON/'+file);
for(const file of ['schema.sql','init.sql'])copy('database/'+file,'03_CSDL/'+file);
const handoff='lecture/hoan-thien-V4-V5';
for(const file of ['CHUONG_5_BAO_MAT_KIEM_THU.md','CHUONG_6_KET_QUA_VA_DANH_GIA.md','PHU_LUC_25_CA.md'])copy(handoff+'/'+file,'01_BAOCAO/'+file);
for(const file of ['TIEN_DO.md','HUONG_DAN_NOP.md','KICH_BAN_VIDEO.md'])copy(handoff+'/'+file,'04_TAILIEU/'+file);
copy(handoff+'/TIEN_DO.md','00_HOSO/TRANG_THAI_CHUA_KY.md');
for(const file of fs.readdirSync(path.join(root,handoff,'evidence')))if(!/trace|token|secret-value/i.test(file))copy(handoff+'/evidence/'+file,'05_KIEMTHU/'+file);
copy('docs/openapi.json','04_TAILIEU/openapi.json');copy('database/ERD.md','07_THIETKE/ERD.md');
fs.writeFileSync(path.join(output,'06_DEMO/CHUA_CO_VIDEO.txt'),'Video 8–15 phút có thuyết minh trên URL online phải được quay và bổ sung sau khi deploy. Không có video giả trong gói này.\n');
fs.writeFileSync(path.join(output,'README.md'),'GÓI NHÁP – chưa phải bài nộp hoàn chỉnh. Đọc 04_TAILIEU/HUONG_DAN_NOP.md. Chưa có URL, video, báo cáo DOCX/PDF toàn nhóm, chữ ký hoặc dump/restore online. Tên N03/Nhom09/DT09 cần kiểm tra với thông tin học phần chính thức trước nộp.\n');
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({generatedAt:new Date().toISOString(),status:'DRAFT',excluded:['.env','node_modules','private-uploads','dist','.git'],files:manifest},null,2));
console.log(JSON.stringify({output,files:manifest.length,folders}));
