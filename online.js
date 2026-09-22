// Public project key only. All data access is authorized by Supabase RPCs.
const ONLINE_URL = 'https://gjzzgomvompliikdjcuq.supabase.co';
const ONLINE_KEY = 'sb_publishable_FbUy_qi_66zBwMZM20q2oQ_cGSeqpG8';
const SESSION_KEY = 'purchase-online-session-v1';
let onlineSession = null;
let onlineRevision = null;
let onlinePending = null;
let onlineBusy = false;
let onlineReading = false;
let onlineEpoch = 0;
let onlineVersion = 0;
let onlineRefreshPromise = null;
let onlineBaseline = null;
let onlineVersions = {};
const onlineKinds = ['suppliers','requests','tenders','orders','receipts','payments'];
function onlineCanonical(value) {
  if(Array.isArray(value)) return value.map(onlineCanonical);
  if(value && typeof value==='object') return Object.fromEntries(Object.keys(value).sort().map(key=>[key,onlineCanonical(value[key])]));
  return value;
}
const onlineEqual = (a,b) => JSON.stringify(onlineCanonical(a))===JSON.stringify(onlineCanonical(b));
function onlineChanges() {
  const changes=[], guards=new Map();
  for(const kind of onlineKinds) {
    const before=new Map(onlineBaseline[kind].map(row=>[row.id,row]));
    const after=new Map(state[kind].map(row=>[row.id,row]));
    for(const id of new Set([...before.keys(),...after.keys()])) {
      if(!onlineEqual(before.get(id),after.get(id))) changes.push({kind,id,
        expected_version:onlineVersions[kind]?.[id] || null,data:after.get(id) || null});
    }
  }
  const changed=new Set(changes.map(c=>c.kind+':'+c.id));
  const guard=(kind,id)=>{
    if(!id || changed.has(kind+':'+id)) return;
    guards.set(kind+':'+id,{kind,id,expected_version:onlineVersions[kind]?.[id] || null});
  };
  for(const c of changes) {
    const d=c.data;
    if(!d) continue;
    if(c.kind==='tenders' || c.kind==='orders') guard('requests',d.requestId);
    if(c.kind==='tenders') {
      guard('suppliers',d.selectedSupplierId);
      for(const q of d.quotes || []) guard('suppliers',q.supplierId);
    }
    if(c.kind==='orders') {guard('tenders',d.tenderId);guard('suppliers',d.supplierId);}
    if(c.kind==='receipts' || c.kind==='payments') guard('orders',d.orderId);
  }
  return {changes,guards:[...guards.values()],added_units:state.units.filter(u=>!onlineBaseline.units.includes(u))};
}
const onlineEmpty = () => ({suppliers:[],requests:[],orders:[],tenders:[],receipts:[],payments:[],units:[]});
const onlineEl = id => document.getElementById(id);
function onlineLock(value) {
  document.querySelector('.app-shell').inert = value;
  onlineEl('modalBackdrop').inert = value;
}
function onlineNotice(text, recovery=false, retry=true) {
  onlineEl('onlineBanner').hidden = !text;
  onlineEl('onlineMessage').textContent = text;
  onlineEl('onlineRecovery').hidden = !recovery;
  onlineEl('onlineRetry').hidden = !retry;
}
function onlineDraftKey() { return 'purchase-online-draft-' + onlineSession.user.id; }
function onlineStoreDraft() {
  try {
    if (onlinePending) sessionStorage.setItem(onlineDraftKey(),JSON.stringify(onlinePending));
    else sessionStorage.removeItem(onlineDraftKey());
  } catch (_) { /* The download button remains available. */ }
}
function onlineKeepSession(session) {
  onlineSession = session;
  try {
    if (session) sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch (_) {}
}
async function onlineFetch(path, body, token) {
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(),15000);
  try {
    const response = await fetch(ONLINE_URL+path, {
      method:'POST', cache:'no-store', signal:controller.signal,
      headers:{apikey:ONLINE_KEY,'Content-Type':'application/json',...(token ? {Authorization:'Bearer '+token}: {})},
      body:JSON.stringify(body)
    });
    const raw = await response.text();
    let result;
    try { result=raw ? JSON.parse(raw) : null; } catch (_) { result=null; }
    if (!response.ok) {
      const error=new Error(result?.message || result?.msg || result?.error_description || 'Không kết nối được Supabase.');
      error.status=response.status;
      throw error;
    }
    return result;
  } finally { clearTimeout(timeout); }
}
async function onlineToken() {
  if (!onlineSession) throw Object.assign(new Error('Hãy đăng nhập lại.'),{status:401});
  if (onlineSession.expires_at*1000 > Date.now()+60000) return onlineSession.access_token;
  if (!onlineRefreshPromise) {
    const epoch=onlineEpoch;
    onlineRefreshPromise=onlineFetch('/auth/v1/token?grant_type=refresh_token',{refresh_token:onlineSession.refresh_token})
      .then(session=>{ if(epoch!==onlineEpoch) throw new Error('Phiên đã thay đổi.'); onlineKeepSession(session); return session.access_token; })
      .catch(error=>{ if(error.status===400) error.status=401; throw error; })
      .finally(()=>{onlineRefreshPromise=null;});
  }
  return onlineRefreshPromise;
}
async function onlineRpc(name, body={}) {
  return onlineFetch('/rest/v1/rpc/'+name,body,await onlineToken());
}
function onlineShowLogin(message='') {
  onlineEpoch++;
  onlineKeepSession(null);
  onlinePending=null;
  onlineRevision=null;
  onlineBaseline=null; onlineVersions={};
  state=onlineEmpty();
  closeModal();
  render();
  onlineEl('onlineMembers').close();
  onlineEl('onlineMemberList').replaceChildren();
  onlineEl('onlineLogin').hidden=false;
  onlineEl('onlineAccount').hidden=true;
  onlineEl('onlineAuthMessage').textContent=message;
  onlineNotice('');
  onlineLock(true);
}
function onlineAccessError(error) {
  if(error.status===401 || error.status===403) {
    onlineShowLogin('Phiên đăng nhập hết hạn hoặc tài khoản chưa được cấp quyền. Hãy đăng nhập lại hoặc liên hệ quản trị.');
    return true;
  }
  return false;
}
function onlineApply(packet, updateUI=true) {
  onlineRevision=packet.revision;
  state=normalizeLoadedData({...onlineEmpty(),...packet.data});
  onlineBaseline=structuredClone(state);
  onlineVersions=structuredClone(packet.versions || {});
  if(updateUI) render();
}
async function onlineConnect() {
  const epoch=onlineEpoch;
  const packet=await onlineRpc('purchase_load_v2');
  if(epoch!==onlineEpoch) return;
  onlineApply(packet);
  onlineEl('onlineLogin').hidden=true;
  onlineEl('onlineAccount').hidden=false;
  onlineEl('onlineUser').textContent=packet.email;
  onlineEl('onlineManage').hidden=packet.role!=='admin';
  document.querySelector('.sidebar-footer strong').textContent=packet.role==='admin' ? 'Quản trị viên' : 'Nhân viên';
  try { onlinePending=JSON.parse(sessionStorage.getItem(onlineDraftKey()) || 'null'); } catch(_) {}
  if(onlinePending) {
    onlineNotice(onlinePending.format===2 ? 'Phiên này còn thay đổi chưa xác nhận lưu. Thử lại hoặc tải bản nháp trước khi lấy dữ liệu mới.' : 'Còn bản nháp từ phiên bản cũ. Hãy tải bản nháp để giữ lại, rồi lấy dữ liệu mới và nhập lại thay đổi.',true,onlinePending.format===2);
    onlineLock(true);
  } else {
    onlineLock(false);
    onlineNotice('');
    setCloudStatus('Online · Lưu từng chứng từ');
  }
}
async function onlineRefresh(force=false) {
  if(!onlineSession || onlineBusy || onlinePending || onlineReading || onlineRevision===null) return;
  const modalOpen=()=>!onlineEl('modalBackdrop').hidden;
  if(modalOpen()) { if(force) alert('Hãy lưu hoặc đóng biểu mẫu trước.'); return; }
  const epoch=onlineEpoch;
  const version=onlineVersion;
  onlineReading=true;
  try {
    const packet=await onlineRpc('purchase_load_v2');
    if(epoch!==onlineEpoch || version!==onlineVersion || modalOpen() || onlinePending || onlineBusy) return;
    if(packet.revision!==onlineRevision) onlineApply(packet);
    setCloudStatus('Đã cập nhật online');
  } catch(error) {
    if(epoch===onlineEpoch && !onlineAccessError(error)) setCloudStatus('Mất kết nối · Chưa tải được dữ liệu mới');
  } finally {onlineReading=false;}
}
function onlineSave() {
  if(onlineBusy || onlinePending || !onlineSession || onlineRevision===null) return;
  onlineVersion++;
  const mutation=onlineChanges();
  if(!mutation.changes.length && !mutation.added_units.length) return;
  onlinePending={format:2,operation_id:crypto.randomUUID(),...mutation,document:structuredClone(state)};
  onlineStoreDraft();
  onlineSend();
}
async function onlineSend() {
  if(onlineBusy || !onlinePending || onlinePending.format!==2) return;
  const epoch=onlineEpoch;
  onlineBusy=true;
  onlineLock(true);
  onlineNotice('Đang lưu dữ liệu online…');
  setCloudStatus('Đang lưu…');
  try {
    const {operation_id,changes,guards,added_units}=onlinePending;
    const packet=await onlineRpc('purchase_save_v2',{operation_id,changes,guards,added_units});
    if(epoch!==onlineEpoch) return;
    if(onlineEl('modalBackdrop').hidden) onlineApply(packet);
    else {
      // Adding a supplier may return to an unfinished order/tender form.
      // Keep its original dependency versions until that form is saved.
      for(const c of changes) {
        onlineBaseline[c.kind]=onlineBaseline[c.kind].filter(row=>row.id!==c.id);
        if(c.data) onlineBaseline[c.kind].push(structuredClone(c.data));
        onlineVersions[c.kind] ||= {};
        if(packet.versions[c.kind]?.[c.id]) onlineVersions[c.kind][c.id]=
          onlineEqual(c.data,packet.data[c.kind].find(row=>row.id===c.id)) ? packet.versions[c.kind][c.id] : c.expected_version;
        else delete onlineVersions[c.kind][c.id];
      }
      onlineBaseline.units=[...new Set([...onlineBaseline.units,...added_units])];
      // Force a full refresh once the unfinished form is closed.
      onlineRevision=-1;
    }
    onlinePending=null;
    onlineStoreDraft();
    onlineNotice('');
    onlineLock(false);
    if(onlineEl('modalBackdrop').hidden) render();
    setCloudStatus('Đã lưu online');
  } catch(error) {
    if(epoch!==onlineEpoch || onlineAccessError(error)) return;
    onlineNotice(error.status===409
      ? error.message+' Tải bản nháp, sau đó lấy dữ liệu mới nhất và nhập lại phần thay đổi.'
      : 'Chưa xác nhận được việc lưu. Giữ cửa sổ này và thử lại; bạn cũng có thể tải bản nháp để giữ thay đổi.',true,error.status!==409);
    setCloudStatus('Chưa xác nhận lưu');
  } finally {onlineBusy=false;}
}
function onlineDownload(data,name) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a=document.createElement('a'); a.href=url; a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function onlineReload() {
  if(onlineBusy || !onlineSession) return;
  if(onlinePending && !confirm('Bạn đã tải bản nháp nếu cần? Tiếp tục sẽ bỏ thay đổi chưa lưu và lấy dữ liệu chung.')) return;
  const epoch=onlineEpoch;
  onlineBusy=true;
  try {
    const packet=await onlineRpc('purchase_load_v2');
    if(epoch!==onlineEpoch) return;
    onlineVersion++;
    onlinePending=null; onlineStoreDraft(); closeModal(); onlineApply(packet);
    onlineNotice(''); onlineLock(false); setCloudStatus('Đã tải dữ liệu mới nhất');
  } catch(error) { if(epoch===onlineEpoch && !onlineAccessError(error)) onlineNotice('Chưa tải được dữ liệu. Bản nháp vẫn được giữ trong phiên này.',true); }
  finally {onlineBusy=false;}
}
async function onlineMembers(email=null,enabled=null) {
  const epoch=onlineEpoch;
  onlineEl('onlineMemberMessage').textContent='Đang tải…';
  try {
    const rows=await onlineRpc('purchase_members',{email_address:email,enabled});
    if(epoch!==onlineEpoch) return;
    const list=onlineEl('onlineMemberList'); list.replaceChildren();
    for(const member of rows) {
      const li=document.createElement('li');
      li.textContent=member.email+' — '+(member.role==='admin' ? 'Quản trị' : member.active ? 'Đang hoạt động' : 'Đã khóa');
      if(member.role!=='admin') {
        const button=document.createElement('button'); button.type='button'; button.className='mini-button';
        button.textContent=member.active ? 'Khóa quyền' : 'Mở quyền';
        button.onclick=()=>onlineMembers(member.email,!member.active); li.append(' ',button);
      }
      list.append(li);
    }
    onlineEl('onlineMemberMessage').textContent='';
  } catch(error) { if(epoch===onlineEpoch && !onlineAccessError(error)) onlineEl('onlineMemberMessage').textContent=error.message; }
}
function onlineStart() {
  document.querySelector('[data-open-modal="cloudModal"]').hidden=true;
  onlineEl('resetDataBtn').hidden=true;
  onlineEl('syncNowBtn').textContent='Tải dữ liệu mới';
  onlineLock(true); render();
  onlineEl('onlineLoginForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const form=event.currentTarget, button=form.querySelector('button');
    button.disabled=true; onlineEl('onlineAuthMessage').textContent='Đang đăng nhập…';
    try {
      const session=await onlineFetch('/auth/v1/token?grant_type=password',{email:form.elements.email.value.trim(),password:form.elements.password.value});
      onlineEpoch++; onlineKeepSession(session); form.elements.password.value=''; await onlineConnect();
    } catch(error) {
      onlineShowLogin(error.status===400 ? 'Email hoặc mật khẩu không đúng.' : error.status===403 ? error.message : 'Không đăng nhập được. Kiểm tra kết nối và thử lại.');
    } finally {button.disabled=false;}
  });
  onlineEl('onlineLogout').onclick=async()=>{
    if(onlineBusy) return;
    if(onlinePending && !confirm('Còn thay đổi chưa lưu. Bạn nên tải bản nháp trước. Vẫn đăng xuất?')) return;
    const token=onlineSession?.access_token;
    onlineShowLogin('Đã đăng xuất trên trình duyệt này.');
    if(token) try { await onlineFetch('/auth/v1/logout?scope=local',{},token); } catch(_) {}
  };
  onlineEl('onlineRetry').onclick=()=>onlinePending ? onlineSend() : onlineReload();
  onlineEl('onlineDownload').onclick=()=>onlinePending && onlineDownload(onlinePending,'mua-hang-ban-nhap-chua-luu.json');
  onlineEl('onlineReload').onclick=onlineReload;
  onlineEl('onlineBackup').onclick=async()=>{
    const epoch=onlineEpoch;
    try { const packet=await onlineRpc('purchase_load_v2'); if(epoch===onlineEpoch) onlineDownload(packet.data,'mua-hang-sao-luu-'+new Date().toISOString().slice(0,10)+'.json'); }
    catch(error) {if(!onlineAccessError(error)) alert('Chưa tải được bản sao lưu. Hãy thử lại.');}
  };
  onlineEl('onlineManage').onclick=()=>{onlineEl('onlineMembers').showModal();onlineMembers();};
  onlineEl('onlineCloseMembers').onclick=()=>onlineEl('onlineMembers').close();
  onlineEl('onlineMemberForm').onsubmit=event=>{event.preventDefault();onlineMembers(event.currentTarget.elements.email.value,true);};
  try {onlineSession=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');}catch(_){}
  if(onlineSession) onlineConnect().catch(error=>onlineShowLogin('Hãy đăng nhập lại để kết nối dữ liệu.'));
  setInterval(()=>onlineRefresh(),5000);
  window.addEventListener('beforeunload',event=>{if(onlinePending || onlineBusy){event.preventDefault();event.returnValue='';}});
}
