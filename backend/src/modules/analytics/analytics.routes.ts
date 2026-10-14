import { Router } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../core/database/prisma';
import { authenticate, authorize } from '../../core/middleware/auth.middleware';
import { sendError, sendSuccess } from '../../core/utils/response.util';

export const analyticsRouter = Router();
export const titles = {daily:'Thu và hoàn theo ngày',campaigns:'Thu và hoàn theo chiến dịch',categories:'Thu và hoàn theo danh mục'};
export function dateRange(from: unknown,to: unknown) {
  const valid=(v: unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
  if(!valid(from)||!valid(to)||from>to||Date.parse(to)-Date.parse(from)>365*86400000) throw Object.assign(new Error('Khoảng ngày phải hợp lệ dạng YYYY-MM-DD, tối đa 366 ngày'),{statusCode:400});
  return {start:new Date(`${from}T00:00:00+07:00`),end:new Date(Date.parse(`${to}T00:00:00+07:00`)+86400000)};
}
export function encodeCsv(rows: any[]) {
  const cell=(v:unknown)=>{let s=String(v??'');if(/^\s*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  return '\uFEFF'+[['Nhóm','Số khoản có bút toán','Đã thu VND','Đã hoàn VND','Ròng VND'],...rows.map(r=>[r.label,r.donations,r.received,r.refunded,r.net])].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
analyticsRouter.use(authenticate,authorize('ADMIN'));
analyticsRouter.get('/:kind',async(req,res,next)=>{
  try {
    const kind=String(req.params.kind);
    if(!Object.hasOwn(titles,kind)){sendError(res,404,'Không tìm thấy báo cáo');return;}
    if(req.query.format!==undefined&&req.query.format!=='csv'){sendError(res,400,'Chỉ hỗ trợ csv');return;}
    const range=dateRange(req.query.from,req.query.to);
    const group=kind==='daily'?Prisma.sql`DATE_FORMAT(DATE_ADD(l.created_at, INTERVAL 7 HOUR),'%Y-%m-%d')`:kind==='campaigns'?Prisma.sql`c.id`:Prisma.sql`cat.id`;
    const label=kind==='daily'?group:kind==='campaigns'?Prisma.sql`MAX(c.title)`:Prisma.sql`MAX(cat.name)`;
    const raw=await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT ${group} AS id, ${label} AS label, COUNT(DISTINCT d.id) AS donations,
      CAST(SUM(CASE WHEN l.kind='RECEIPT' THEN l.amount ELSE 0 END) AS CHAR) AS received,
      CAST(SUM(CASE WHEN l.kind='REFUND' THEN l.amount ELSE 0 END) AS CHAR) AS refunded,
      CAST(SUM(CASE WHEN l.kind='RECEIPT' THEN l.amount ELSE -l.amount END) AS CHAR) AS net
      FROM ledger_entries l JOIN donations d ON d.id=l.donation_id
      JOIN campaigns c ON c.id=d.campaign_id JOIN categories cat ON cat.id=c.category_id
      WHERE l.created_at >= ${range.start} AND l.created_at < ${range.end}
      GROUP BY ${group} ORDER BY ${group} ASC LIMIT 1001`);
    if(raw.length>1000){sendError(res,422,'Hơn 1000 nhóm; thu hẹp khoảng ngày để xuất đầy đủ');return;}
    const rows=raw.map(r=>({...r,donations:Number(r.donations)}));
    res.set('Cache-Control','private, no-store');
    if(req.query.format==='csv'){
      res.set({'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${kind}-${req.query.from}-${req.query.to}.csv"`}).send(encodeCsv(rows));return;
    }
    sendSuccess(res,200,'Lấy báo cáo thống kê thành công',{kind,title:titles[kind as keyof typeof titles],from:req.query.from,to:req.query.to,timezone:'Asia/Ho_Chi_Minh',generatedAt:new Date().toISOString(),note:'Dựa trên bút toán thu/hoàn theo ngày phát sinh UTC+7; ròng chưa trừ giải ngân. Số khoản đếm riêng từng nhóm; không cộng số khoản theo ngày để suy ra số người.',rows});
  }catch(e){next(e);}
});
