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
  if(updateUI) render();
}
async function onlineConnect() {
  const epoch=onlineEpoch;
  const packet=await onlineRpc('purchase_load');
  if(epoch!==onlineEpoch) return;
  onlineApply(packet);
  onlineEl('onlineLogin').hidden=true;
  onlineEl('onlineAccount').hidden=false;
  onlineEl('onlineUser').textContent=packet.email;
  onlineEl('onlineManage').hidden=packet.role!=='admin';
  document.querySelector('.sidebar-footer strong').textContent=packet.role==='admin' ? 'Quản trị viên' : 'Nhân viên';
  try { onlinePending=JSON.parse(sessionStorage.getItem(onlineDraftKey()) || 'null'); } catch(_) {}
  if(onlinePending) {
    onlineNotice('Phiên này còn thay đổi chưa xác nhận lưu. Thử lại hoặc tải bản nháp trước khi lấy dữ liệu mới.',true);
    onlineLock(true);
  } else {
    onlineLock(false);
    onlineNotice('');
    setCloudStatus('Đã tải dữ liệu online');
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
    const packet=await onlineRpc('purchase_load');
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
  onlinePending={expected_revision:onlineRevision,operation_id:crypto.randomUUID(),document:structuredClone(state)};
  onlineStoreDraft();
  onlineSend();
}
async function onlineSend() {
  if(onlineBusy || !onlinePending) return;
  const epoch=onlineEpoch;
  onlineBusy=true;
  onlineLock(true);
  onlineNotice('Đang lưu dữ liệu online…');
  setCloudStatus('Đang lưu…');
  try {
    const packet=await onlineRpc('purchase_save',onlinePending);
    if(epoch!==onlineEpoch) return;
    onlineRevision=packet.revision;
    state=normalizeLoadedData(structuredClone(onlinePending.document));
    onlinePending=null;
    onlineStoreDraft();
    onlineNotice('');
    onlineLock(false);
    if(onlineEl('modalBackdrop').hidden) render();
    setCloudStatus('Đã lưu online');
  } catch(error) {
    if(epoch!==onlineEpoch || onlineAccessError(error)) return;
    onlineNotice(error.status===409
      ? 'Có người đã lưu thay đổi trước bạn. Tải bản nháp, sau đó lấy dữ liệu mới nhất và nhập lại phần thay đổi.'
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
    const packet=await onlineRpc('purchase_load');
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
    try { const packet=await onlineRpc('purchase_load'); if(epoch===onlineEpoch) onlineDownload(packet.data,'mua-hang-sao-luu-'+new Date().toISOString().slice(0,10)+'.json'); }
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
