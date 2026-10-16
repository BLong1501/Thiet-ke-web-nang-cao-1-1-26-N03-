import {useState} from 'react';
import {BarChart,Bar,XAxis,YAxis,Tooltip,Legend,ResponsiveContainer,CartesianGrid} from 'recharts';
import {api,formatCurrency} from '../services/api';
import {useRemote} from '../hooks/useRemote';
import {Page,Notice,RemoteState,Empty} from '../components/ui/WorkspaceUI';

type Row={id:string;label:string;donations:number;received:string;refunded:string;net:string};
type Report={title:string;note:string;generatedAt:string;rows:Row[]};
const reports=[['daily','Theo ngày'],['campaigns','Theo chiến dịch'],['categories','Theo danh mục']] as const;
function Panel({kind,from,to}:{kind:string;from:string;to:string}){
  const result=useRemote<Report>(()=>api.get(`/admin/analytics/${kind}`,{params:{from,to}}).then(r=>r.data.data),[kind,from,to]);
  const [error,setError]=useState('');
  async function download(){
    try{
      setError('');const r=await api.get(`/admin/analytics/${kind}`,{params:{from,to,format:'csv'},responseType:'blob'});
      const url=URL.createObjectURL(r.data);const a=document.createElement('a');a.href=url;a.download=`${kind}-${from}-${to}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch{setError('Không xuất được file. Kiểm tra kết nối và thử lại.');}
  }
  const data=result.data;
  return <section className="panel" style={{marginTop:24,padding:24}} aria-label={data?.title||kind}>
    <RemoteState {...result}/>
    {error&&<Notice error>{error}</Notice>}
    {data&&<><div className="actions"><h2>{data.title}</h2><button className="button secondary" onClick={download}>Xuất CSV toàn bộ báo cáo</button></div>
      <p>{data.note}</p><small>Cập nhật: {new Date(data.generatedAt).toLocaleString('vi-VN')}</small>
      {!data.rows.length?<Empty>Không có bút toán trong khoảng ngày này.</Empty>:<>
        <div role="img" aria-label={`Biểu đồ ${data.title}. Số liệu đầy đủ ở bảng ngay bên dưới.`} style={{height:320,width:'100%',marginTop:24}}>
          <ResponsiveContainer><BarChart data={data.rows.map(r=>({...r,received:Number(r.received),refunded:Number(r.refunded),net:Number(r.net)}))} margin={{left:24,right:16,bottom:24}}>
            <CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label" tickFormatter={v=>String(v).length>18?String(v).slice(0,18)+'…':String(v)}/><YAxis tickFormatter={v=>`${Number(v)/1000000} tr`}/><Tooltip formatter={v=>formatCurrency(Number(v))}/><Legend/>
            <Bar dataKey="received" name="Đã thu" fill="#2563eb"/><Bar dataKey="refunded" name="Đã hoàn" fill="#c2410c"/><Bar dataKey="net" name="Ròng" fill="#047857"/>
          </BarChart></ResponsiveContainer>
        </div>
        <div className="table-wrap"><table><caption>{data.title}: {from} đến {to}</caption><thead><tr><th scope="col">Nhóm</th><th scope="col">Số khoản</th><th scope="col">Đã thu</th><th scope="col">Đã hoàn</th><th scope="col">Ròng</th></tr></thead><tbody>{data.rows.map(r=><tr key={r.id}><th scope="row">{r.label}</th><td>{r.donations}</td><td>{formatCurrency(Number(r.received))}</td><td>{formatCurrency(Number(r.refunded))}</td><td>{formatCurrency(Number(r.net))}</td></tr>)}</tbody></table></div>
      </>}
    </>}
  </section>;
}
export default function AdminAnalyticsPage(){
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
  const [from,setFrom]=useState(today.slice(0,4)+'-01-01');const [to,setTo]=useState(today);
  const [range,setRange]=useState({from,to});const [error,setError]=useState('');
  return <Page title="Báo cáo thống kê" intro="Ba báo cáo từ sổ cái, lọc theo thời gian và xuất CSV.">
    <form className="actions" onSubmit={e=>{e.preventDefault();if(from>to){setError('Từ ngày phải trước hoặc bằng đến ngày');return;}setError('');setRange({from,to});}}>
      <label>Từ ngày <input type="date" required value={from} onChange={e=>setFrom(e.target.value)}/></label>
      <label>Đến ngày <input type="date" required value={to} onChange={e=>setTo(e.target.value)}/></label>
      <button className="button">Xem báo cáo</button>
    </form>{error&&<Notice error>{error}</Notice>}
    {reports.map(([kind])=><Panel key={kind} kind={kind} {...range}/>)}
  </Page>;
}
