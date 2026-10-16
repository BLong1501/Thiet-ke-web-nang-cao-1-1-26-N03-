const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
http.createServer((req,res)=>{
 if(req.url!=='/'&&req.url!=='/newman-report.html'){res.writeHead(404);return res.end('Not found');}
 res.setHeader('Content-Type','text/html; charset=utf-8');
 res.end(fs.readFileSync(path.join(__dirname,'evidence/newman-report.html')));
}).listen(5196,'127.0.0.1',()=>console.log('Newman evidence: http://127.0.0.1:5196/'));
