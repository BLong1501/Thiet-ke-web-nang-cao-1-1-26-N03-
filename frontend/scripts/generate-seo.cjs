const fs=require('node:fs');const path=require('node:path');
const site=new URL(process.env.SITE_URL||'http://localhost:5173');
if(site.pathname!=='/'||!['https:','http:'].includes(site.protocol)||site.username||site.password)throw Error('SITE_URL must be an origin');
const origin=site.origin;const publicDir=path.resolve(__dirname,'../public');
fs.writeFileSync(path.join(publicDir,'robots.txt'),`User-agent: *\nDisallow: /admin\nDisallow: /dashboard\nDisallow: /profile\nDisallow: /notifications\nDisallow: /donations\nDisallow: /activity-logs\nSitemap: ${origin}/sitemap.xml\n`);
const routes=['/','/campaigns','/how-it-works','/community'];
fs.writeFileSync(path.join(publicDir,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+routes.map(r=>`<url><loc>${origin}${r}</loc></url>`).join('')+'</urlset>\n');
console.log('Generated public SEO files for '+origin);
