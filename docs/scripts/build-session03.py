"""Build initial reviewed policy and OpenAPI. Run from the repository root."""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / 'docs'
for name in ['security', 'session03', 'evidence', 'deployment']:
    (DOCS / name).mkdir(exist_ok=True)

rows = []
mapping = {
 '/api/v1/users/me': '/auth/me',
}
for line in (ROOT / 'README.md').read_text(encoding='utf-8').splitlines():
    match = re.match(r'\|\s*`(GET|POST|PUT|PATCH|DELETE)`\s*\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|', line)
    if not match: continue
    method, url, name, access = [s.strip() for s in match.groups()]
    url = url.removeprefix('/api/v1')
    if method == 'GET' and url == '/users/me': url = '/auth/me'
    if method == 'POST' and url == '/verifications': url = '/verifications/request'
    if method == 'GET' and url == '/verifications': url = '/verifications/pending'
    url = re.sub(r':([A-Za-z]+)', r'{\1}', url)
    ident = f'API-{len(rows)+1:02}'
    if url == '/verifications/request': ident = 'KYC-SUBMIT'
    elif url == '/verifications/my-status': ident = 'KYC-ME'
    elif url == '/verifications/pending': ident = 'KYC-LIST'
    elif url == '/verifications/{id}': ident = 'KYC-DETAIL'
    elif url == '/verifications/{id}/review': ident = 'KYC-REVIEW'
    elif url == '/payments/webhook': ident = 'PAY-WEBHOOK'
    elif url == '/auth/me': ident = 'AUTH-ME'
    elif url == '/auth/register': ident = 'AUTH-REGISTER'
    elif url == '/auth/login': ident = 'AUTH-LOGIN'
    live = ident.startswith('KYC-') or ident in ['AUTH-ME', 'AUTH-REGISTER', 'AUTH-LOGIN']
    condition = 'Theo danh mục API README; chỉ triển khai sau khi chốt hợp đồng dữ liệu.'
    if 'Public' in access: allow = ['GUEST', 'USER', 'FUNDRAISER', 'ADMIN']
    elif access == 'Admin': allow = ['ADMIN']
    elif access.startswith('Fundraiser'): allow = ['FUNDRAISER'] + (['ADMIN'] if 'Admin' in access else [])
    else: allow = ['USER', 'FUNDRAISER', 'ADMIN']
    if 'sở hữu' in access or url == '/disbursements' and method == 'POST':
        condition = 'Fundraiser chỉ thao tác chiến dịch của mình; kiểm tra ownership và trạng thái.'
        if url == '/disbursements': condition += ' Admin được lập phiếu theo quyền quản trị trong README; phải ghi audit log.'
    if url in ['/auth/me', '/users/me', '/users/me/password', '/users/me/avatar', '/donations/my-history'] or url.startswith('/notifications'):
        condition = 'Chỉ dữ liệu của principal đăng nhập; bỏ qua/từ chối userId do client gửi. Không có quyền đọc hộ kể cả Admin.'
    if ident == 'KYC-SUBMIT':
        allow = ['USER']; condition = 'UC02: USER nộp lần đầu hoặc gửi lại hồ sơ REJECTED. FUNDRAISER/ADMIN hiện bị service trả 400; PENDING/APPROVED không được nộp lại.'
    if ident == 'KYC-ME': condition = 'Chỉ hồ sơ của req.user.userId; chưa nộp trả hasSubmitted=false, status=null, verification=null.'
    if ident in ['KYC-LIST','KYC-DETAIL','KYC-REVIEW']: condition = 'Middleware authorize(ADMIN). Review chỉ hồ sơ PENDING; chỉ nhận quyết định APPROVED hoặc REJECTED.'
    if ident == 'KYC-LIST': name = 'Danh sách hồ sơ KYC đang chờ duyệt (phân trang)'
    if ident == 'PAY-WEBHOOK':
        allow = ['GATEWAY']; condition = 'Xác minh chữ ký, giao dịch, số tiền và chống xử lý lặp. JWT Admin không cấp quyền giả mạo gateway.'
    if url in ['/donations','/payments/create-url']:
        allow = ['USER','FUNDRAISER','ADMIN']; condition = 'Thiết kế theo actor UC06–07/phạm vi: yêu cầu đăng nhập. README ghi Public/User và DB cho user_id NULL: nhóm cần chốt; chưa có backend. Ẩn danh là ẩn tên công khai, không bỏ xác thực.'
    if url == '/donations/{id}/receipt': condition = 'Chỉ người đóng góp sở hữu giao dịch; Admin không tự động được xem biên lai riêng tư qua API này.'
    if '/communities' in url and '/posts' in url:
        condition = 'Nhóm công khai: ai cũng đọc; nhóm riêng: chỉ thành viên. Đăng bài cần tư cách MEMBER/MODERATOR/ADMIN trong nhóm, kể cả tài khoản Admin hệ thống.'
    state = 'LIVE' if live else 'DEFERRED' if '/communities' in url or '/follow' in url else 'PLANNED'
    if 'Public' in access and ident != 'PAY-WEBHOOK' and url not in ['/donations', '/payments/create-url']:
        allow.append('GATEWAY')
    rows.append(dict(id=ident, method=method, path=url, name=name.replace('`',''), allow=allow, state=state, condition=condition))
rows.insert(0,dict(id='HEALTH',method='GET',path='/health',name='Kiểm tra tiến trình API',allow=['GUEST','USER','FUNDRAISER','ADMIN','GATEWAY'],state='LIVE',condition='Chỉ phản ánh tiến trình Express; không kiểm tra kết nối DB.'))

extras = [
 ('KYC-SUPPLEMENT','PATCH','/verifications/{id}/supplement','Yêu cầu bổ sung KYC',['ADMIN'],'PLANNED','UC02/03, YCCN09; đường dẫn đề xuất, V3 cần chốt. Enum hiện chưa có NEEDS_ADDITION.'),
 ('CAMPAIGN-REVISION','PATCH','/admin/campaigns/{id}/revision','Yêu cầu chỉnh sửa chiến dịch',['ADMIN'],'PLANNED','UC05/YCCN16; đường dẫn đề xuất, chưa có trong README hoặc backend.'),
 ('PAY-STATUS','GET','/donations/{id}/status','Theo dõi trạng thái giao dịch của mình',['USER','FUNDRAISER','ADMIN'],'PLANNED','YCCN21; đường dẫn đề xuất. Phải kiểm tra ownership; API quản trị tách riêng.'),
 ('PAY-ADMIN','GET','/admin/donations','Tra soát Donation/Payment',['ADMIN'],'PLANNED','YCCN32; đường dẫn đề xuất. Không cấp quyền sửa tùy ý giao dịch đã xác nhận.'),
 ('EXPENSE-EVIDENCE','POST','/disbursements/{id}/attachments','Bổ sung chứng từ khoản chi',['FUNDRAISER'],'PLANNED','UC08/YCCN25; đường dẫn đề xuất. Chỉ chủ chiến dịch; tối thiểu 1 chứng từ JPG/PNG/PDF <=5MB.'),
 ('SOCIAL-LIKE','POST','/comments/{id}/likes','Thích bình luận',['USER','FUNDRAISER','ADMIN'],'DEFERRED','YCCN29; chưa chốt phạm vi/endpoint. Không triển khai mạng xã hội độc lập.'),
]
for id, method, path, name, allow, state, condition in extras:
    rows.append(dict(id=id,method=method,path=path,name=name,allow=allow,state=state,condition=condition))
def ids(*patterns):
    return [r['id'] for r in rows if any(p in r['path'] for p in patterns)]
requirements = {
 'YCCN01':['AUTH-REGISTER'], 'YCCN02':['AUTH-LOGIN']+ids('/auth/logout'), 'YCCN03':['AUTH-ME']+ids('/users/me'),
 'YCCN04':ids('/users/me/password','/auth/refresh-token'), 'YCCN05':ids('/auth/verify-email'),
 'YCCN06':['KYC-SUBMIT'], 'YCCN07':['KYC-SUBMIT'], 'YCCN08':['KYC-ME'],
 'YCCN09':['KYC-LIST','KYC-DETAIL','KYC-REVIEW','KYC-SUPPLEMENT'], 'YCCN10':ids('/admin/users/{id}/role')+['KYC-REVIEW'],
 'YCCN11':[], 'YCCN12':[], 'YCCN13':[], 'YCCN14':ids('/media'), 'YCCN15':ids('/submit'),
 'YCCN16':ids('/admin/campaigns'), 'YCCN17':[], 'YCCN18':[], 'YCCN19':[], 'YCCN20':ids('/payments'),
 'YCCN21':['PAY-STATUS'], 'YCCN22':ids('/my-history','/receipt'), 'YCCN23':[],
 'YCCN24':ids('/disbursements'), 'YCCN25':['EXPENSE-EVIDENCE']+ids('/disbursements'),
 'YCCN26':ids('/disbursements','/export-statement'), 'YCCN27':ids('/updates'),
 'YCCN28':ids('/communities'), 'YCCN29':ids('/comments','/posts')+['SOCIAL-LIKE'],
 'YCCN30':ids('/reports'), 'YCCN31':ids('/admin/users'), 'YCCN32':['PAY-ADMIN'],
 'YCCN33':ids('/admin/reports','/admin/users/{id}/status','/admin/campaigns/{id}/status'),
 'YCCN34':['SYSTEM-NOTIFICATION']+ids('/notifications'), 'YCCN35':['SYSTEM-AUDIT']+ids('/audit-logs')
}
for k in ['YCCN11','YCCN12','YCCN13']:
    requirements[k]=[r['id'] for r in rows if r['path'] in ['/campaigns','/campaigns/{id}'] and r['method'] in ['POST','PUT']]
for k in ['YCCN17','YCCN23']:
    requirements[k]=[r['id'] for r in rows if r['path'] in ['/campaigns','/campaigns/{slug}'] and r['method']=='GET']
for k in ['YCCN18','YCCN19']:
    requirements[k]=[r['id'] for r in rows if r['path']=='/donations' and r['method']=='POST']
requirements = {key: list(dict.fromkeys(values)) for key, values in requirements.items()}
(DOCS/'security/authorization-policy.json').write_text(json.dumps({'operations':rows,'requirements':requirements},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# OpenAPI describes only mounted backend routes. Proposed endpoints stay in the matrix.
ref=lambda name:{'$ref':f'#/components/schemas/{name}'}
string=lambda **kw:dict(type='string',**kw)
obj=lambda props,required=None:dict(type='object',properties=props,**({'required':required} if required else {}))
date=string(format='date-time')
nullable=lambda schema:dict(schema,nullable=True)
roles=['ADMIN','FUNDRAISER','USER']
userprops={k:string() for k in ['id','email','fullName']}
userprops.update({k:nullable(string()) for k in ['phoneNumber','avatarUrl','bio']})
userprops.update(role=string(enum=roles),status=string(enum=['ACTIVE','SUSPENDED','BANNED']),isEmailVerified={'type':'boolean'},emailVerifiedAt=nullable(date),createdAt=date,updatedAt=date)
vprops={k:string() for k in ['id','userId','idCardNumber','frontCardImage','backCardImage','portraitImage']}
vprops.update({k:nullable(string()) for k in ['cardIssuedPlace','rejectionReason','reviewedBy']})
vprops.update(cardIssuedDate=nullable(date),supportingDocuments={'nullable':True,'description':'Dữ liệu JSON theo Prisma; chưa có kiểm tra cấu trúc nghiệp vụ riêng.'},status=string(enum=['PENDING','APPROVED','REJECTED']),reviewedAt=nullable(date),createdAt=date,updatedAt=date)
summary=obj({k:userprops[k] for k in ['id','email','fullName','phoneNumber','role','avatarUrl']},['id','email','fullName','role'])
vprops['user']=summary
vprops['reviewer']=nullable(obj({k:userprops[k] for k in ['id','fullName','email']}))
schemas={
 'Error':obj({'success':{'type':'boolean','enum':[False]},'message':string(),'errors':{'type':'array','items':obj({'field':string(),'message':string()},['field','message'])}},['success','message']),
 'User':obj(userprops,list(userprops)),
 'Verification':obj(vprops,['id','userId','idCardNumber','frontCardImage','backCardImage','portraitImage','status','createdAt','updatedAt']),
 'RegisterInput':obj({'email':string(format='email',maxLength=255),'password':string(minLength=6,maxLength=100,format='password'),'fullName':string(minLength=2,maxLength=150),'phoneNumber':string(description='Không bắt buộc, cho phép chuỗi rỗng; kiểm tra regex số điện thoại trong backend.')},['email','password','fullName']),
 'LoginInput':obj({'email':string(format='email'),'password':string(minLength=1,format='password')},['email','password']),
 'SubmitVerificationInput':obj({'idCardNumber':string(minLength=9,maxLength=20,pattern='^[0-9]+$'),'cardIssuedDate':string(description='YYYY-MM-DD hoặc datetime ISO có múi giờ; không bắt buộc.'),'cardIssuedPlace':string(maxLength=200),'frontCardImage':string(format='uri',maxLength=500),'backCardImage':string(format='uri',maxLength=500),'portraitImage':string(format='uri',maxLength=500),'supportingDocuments':{'description':'JSON tùy ý; backend dùng z.any(). Không phải endpoint upload file.'}},['idCardNumber','frontCardImage','backCardImage','portraitImage']),
 'ReviewVerificationInput':obj({'status':string(enum=['APPROVED','REJECTED'],description='Chỉ nhận APPROVED hoặc REJECTED. PENDING bị validation từ chối.'),'rejectionReason':string(maxLength=1000,description='Bắt buộc ít nhất 5 ký tự sau trim nếu REJECTED.')},['status']),
 'Pagination':obj({k:{'type':'integer'} for k in ['page','limit','total','totalPages']},['page','limit','total','totalPages']),
}
schemas['RegisterInput']['description']='Không nhận role; backend bỏ trường không khai báo và tạo USER theo mặc định DB. Không thể đăng ký trực tiếp FUNDRAISER/ADMIN.'
schemas['ReviewVerificationInput']['oneOf']=[
 obj({'status':string(enum=['APPROVED'])}),
 obj({'status':string(enum=['REJECTED']),'rejectionReason':string(minLength=5,maxLength=1000)},['rejectionReason'])
]
def envelope(data): return obj({'success':{'type':'boolean','enum':[True]},'message':string(),'data':data},['success','message','data'])
schemas['AuthResponse']=envelope(obj({'user':ref('User'),'accessToken':string()},['user','accessToken']))
schemas['ProfileResponse']=envelope(ref('User'))
schemas['VerificationResponse']=envelope(ref('Verification'))
# Use inline nullable properties rather than sibling nullable next to $ref (OpenAPI 3.0).
nullable_verification=dict(schemas['Verification'],nullable=True)
schemas['VerificationStatusResponse']=envelope(obj({'hasSubmitted':{'type':'boolean'},'status':nullable(string(enum=['PENDING','APPROVED','REJECTED',None])),'verification':nullable_verification},['hasSubmitted','status','verification']))
schemas['VerificationListResponse']=envelope({'type':'array','items':ref('Verification')})
schemas['VerificationListResponse']['properties']['meta']=ref('Pagination')
schemas['ReviewResponse']=envelope(obj({'message':string(),'verification':ref('Verification'),'user':obj({k:userprops[k] for k in ['id','email','fullName','role']})},['message','verification']))
schemas['HealthResponse']=obj({'status':string(enum=['success']),'message':string(),'timestamp':date},['status','message','timestamp'])
spec={'openapi':'3.0.3','info':{'title':'Crowdfunding CĐ09 — API hiện có','version':'1.0.0','description':'Đặc tả Buổi 03 cho 9 API đã đăng ký trong backend. API tương lai nằm trong ma trận phân quyền. LIVE chỉ có nghĩa route tồn tại. Validation review đã giới hạn APPROVED/REJECTED (ISSUE-01). Health dùng cấu trúc riêng. Cookie refreshToken đã được cấp nhưng chưa có API refresh/logout. Không đưa token hoặc dữ liệu CCCD thật vào tài liệu.'},'servers':[{'url':'http://localhost:5000/api/v1','description':'Backend cục bộ; chưa xác nhận máy chủ trực tuyến'}],'tags':[{'name':'Health'},{'name':'Auth'},{'name':'KYC'}],'paths':{},'components':{'securitySchemes':{'bearerAuth':{'type':'http','scheme':'bearer','bearerFormat':'JWT'},'accessCookie':{'type':'apiKey','in':'cookie','name':'accessToken','description':'Middleware cũng nhận cookie accessToken. Login hiện chỉ đặt refreshToken; hai cookie này không thay thế nhau.'}},'schemas':schemas,'responses':{}}}
for code,text in [('400','Dữ liệu không hợp lệ hoặc điều kiện nghiệp vụ không cho phép.'),('401','Thiếu, sai hoặc hết hạn access token; đăng nhập sai thông tin.'),('403','Không đủ vai trò; hoặc tài khoản bị khóa/cấm khi đăng nhập.'),('404','Không tìm thấy hồ sơ/tài khoản.'),('409','Email đã được đăng ký.'),('500','Lỗi máy chủ. Backend hiện chưa che toàn bộ err.message; xem ISSUE-04.')]:
 spec['components']['responses'][code]={'description':text,'content':{'application/json':{'schema':ref('Error')}}}
definitions=[
 ('/health','get','health','Health',None,'HealthResponse','200',[]),
 ('/auth/register','post','register','Auth','RegisterInput','AuthResponse','201',['400','409','500']),
 ('/auth/login','post','login','Auth','LoginInput','AuthResponse','200',['400','401','403','500']),
 ('/auth/me','get','getProfile','Auth',None,'ProfileResponse','200',['401','404','500']),
 ('/verifications/request','post','submitVerification','KYC','SubmitVerificationInput','VerificationResponse','201',['400','401','404','500']),
 ('/verifications/my-status','get','getVerificationStatus','KYC',None,'VerificationStatusResponse','200',['401','500']),
 ('/verifications/pending','get','listPendingVerifications','KYC',None,'VerificationListResponse','200',['401','403','500']),
 ('/verifications/{id}','get','getVerification','KYC',None,'VerificationResponse','200',['401','403','404','500']),
 ('/verifications/{id}/review','patch','reviewVerification','KYC','ReviewVerificationInput','ReviewResponse','200',['400','401','403','404','500']),
]
examples={
 'RegisterInput':{'email':'user@example.test','password':'Example123!','fullName':'Người dùng kiểm thử'},
 'LoginInput':{'email':'user@example.test','password':'Example123!'},
 'SubmitVerificationInput':{'idCardNumber':'000000000001','frontCardImage':'https://example.test/front.jpg','backCardImage':'https://example.test/back.jpg','portraitImage':'https://example.test/portrait.jpg'},
 'ReviewVerificationInput':{'status':'REJECTED','rejectionReason':'Ảnh minh chứng chưa rõ'}
}
for url,method,id,tag,inp,out,success,errors in definitions:
 row=next(r for r in rows if r['path']==url and r['method'].lower()==method)
 op={'operationId':id,'summary':row['name'],'description':row['condition'],'tags':[tag],'x-authorization-id':row['id'],'x-roles':[r for r in row['allow'] if r!='GATEWAY'],'security':[] if id in ['health','register','login'] else [{'bearerAuth':[]},{'accessCookie':[]}],'responses':{success:{'description':'Thành công','content':{'application/json':{'schema':ref(out)}}}}}
 for code in errors: op['responses'][code]={'$ref':f'#/components/responses/{code}'}
 if inp: op['requestBody']={'required':True,'content':{'application/json':{'schema':ref(inp),'example':examples[inp]}}}
 if '{id}' in url: op['parameters']=[{'in':'path','name':'id','required':True,'schema':string(),'description':'ID hồ sơ xác minh. Hiện backend không validate định dạng UUID.'}]
 if id in ['register','login']:
  op['responses'][success]['headers']={'Set-Cookie':{'description':'refreshToken: HttpOnly, SameSite=Lax, Secure khi NODE_ENV=production, Max-Age 30 ngày. Chưa có route refresh/logout.','schema':string()}}
 if id=='listPendingVerifications':
  op['parameters']=[{'in':'query','name':k,'schema':{'type':'integer','default':v},'description':'Backend dùng parseInt và giá trị mặc định; hiện chưa giới hạn số âm/kích thước trang (ISSUE-05).'} for k,v in [('page',1),('limit',10)]]
 spec['paths'].setdefault(url,{})[method]=op
(DOCS/'openapi.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Created policy ({len(rows)} operations) and OpenAPI ({len(definitions)} operations).')
