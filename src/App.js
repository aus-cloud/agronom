import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { 
  CheckSquare, Map, Package, Camera, MapPin, 
  Send, ChevronRight, Droplets, Bug, Loader2, User, Target, Lock, Mail, X, Clock
} from 'lucide-react';

const THEME = {
  accent: '#10b981',
  accentGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  text: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.5)',
  danger: '#ef4444',
  warning: '#f59e0b',
  glass: {
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(25px)',
    WebkitBackdropFilter: 'blur(25px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '28px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  }
};

export default function MobileAgroApp() {
  const [session, setSession] = useState(null);
  const [agroProfile, setAgroProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [loading, setLoading] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [myFields, setMyFields] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, percent: 0 });

  const [showReportModal, setShowReportModal] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isFieldLocked, setIsFieldLocked] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null); // Фақат IDни сақлаш учун
  const [reportData, setReportData] = useState({ 
    field_id: '', type: 'inspection', note: '', image: null, lat: null, lon: null 
  });

  const notifyMe = (title) => {
    if (Notification.permission === "granted") {
      new Notification("AGROPRO: Янги вазифа", {
        body: title,
        icon: "/logo192.png"
      });
    }
  };

  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }

    const style = document.createElement('style');
    style.innerHTML = `
      html, body {
        overscroll-behavior: none !important;
        position: fixed;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background-color: #05110a;
      }
      #root {
        height: 100%;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }
      input, select, textarea { font-size: 16px !important; }
    `;
    document.head.appendChild(style);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchAgroProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchAgroProfile(session.user.id);
      else setAgroProfile(null);
    });

    return () => {
        subscription.unsubscribe();
        document.head.removeChild(style);
    }
  }, []);

  useEffect(() => {
    let channel;
    if (agroProfile?.id) {
      channel = supabase
        .channel('new_tasks_channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'tasks',
            filter: `agronomist_id=eq.${agroProfile.id}`
          },
          (payload) => {
            notifyMe(payload.new.title);
            fetchAppData(agroProfile.id);
          }
        )
        .subscribe();
    }
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [agroProfile]);

  async function fetchAgroProfile(authId) {
    const { data } = await supabase.from('agronomists').select('*').eq('auth_id', authId).single();
    if (data) {
      setAgroProfile(data);
      fetchAppData(data.id);
    }
  }

  async function fetchAppData(agroId) {
    const { data: allTasks } = await supabase.from('tasks').select('*, fields(name)').eq('agronomist_id', agroId);
    
    // Энди вазифаларни филтрламаймиз, ҳаммаси рўйхатда қолади
    setMyTasks(allTasks || []);
    
    const doneTasks = allTasks?.filter(t => t.status === 'completed') || [];
    const total = allTasks?.length || 0;
    const completed = doneTasks.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    setStats({ total, completed, percent });

    const { data: fData } = await supabase.from('fields').select('*').eq('agronomist_id', agroId);
    setMyFields(fData || []);
    const { data: iData } = await supabase.from('inventory').select('*');
    setInventory(iData || []);
  }

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) return alert("Маълумотни тўлдиринг");
    setAuthLoading(true);
    const fullEmail = email.includes('@') ? email : `${email}@agro.uz`;
    const { error } = await supabase.auth.signInWithPassword({ email: fullEmail, password });
    if (error) alert("Хато: " + error.message);
    setAuthLoading(false);
  };

  const getGeoLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setReportData(prev => ({ ...prev, lat: pos.coords.latitude, lon: pos.coords.longitude }));
        setIsLocating(false);
        alert("📍 GPS аниқланди");
      },
      (err) => { setIsLocating(false); alert("GPS хатоси: " + err.message); },
      { enableHighAccuracy: true }
    );
  };

  const handleFieldSelect = (fieldId) => {
    const field = myFields.find(f => f.id === parseInt(fieldId));
    setReportData({ ...reportData, field_id: fieldId });
    setIsFieldLocked(field && !field.location_center);
  };

  const saveFieldLocation = async () => {
    if (!reportData.lat) return alert("Аввал GPS тугмасини босинг!");
    const { error } = await supabase.from('fields').update({ 
      location_center: { lat: reportData.lat, lon: reportData.lon } 
    }).eq('id', reportData.field_id);
    if (!error) { 
      alert("✅ Дала боғланди!"); 
      setIsFieldLocked(false); 
      fetchAppData(agroProfile.id); 
    }
  };

  const submitReport = async () => {
    if (!reportData.field_id || !reportData.note) return alert("Маълумотни тўлдиринг!");
    setAuthLoading(true);
    const { error } = await supabase.from('field_operations').insert([{
      field_id: reportData.field_id,
      operation_type: reportData.type,
      description: reportData.note,
      operation_date: new Date().toISOString()
    }]);
    if (!error) {
      // Статусни янгилаш
      if (selectedTaskId) {
        await supabase.from('tasks').update({ status: 'completed' }).eq('id', selectedTaskId);
      }
      alert("🚀 Ҳисобот юборилди!");
      setShowReportModal(false);
      setSelectedTaskId(null);
      setReportData({ field_id: '', type: 'inspection', note: '', image: null, lat: null, lon: null });
      fetchAppData(agroProfile.id);
    } else { alert("Хато: " + error.message); }
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!session && !loading) {
    return (
      <div style={loginOverlay}>
        <div style={{...THEME.glass, padding: '40px 30px', width: '90%', maxWidth: '400px', textAlign: 'center'}}>
          <h1 style={{fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px'}}>AGRO<span style={{color: THEME.accent}}>PRO</span></h1>
          <form style={{marginTop: '30px'}} onSubmit={handleSignIn}>
            <div style={inputWrapper}>
                <Mail size={18} style={inputIcon} />
                <input type="text" placeholder="Логин" style={loginInput} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div style={inputWrapper}>
                <Lock size={18} style={inputIcon} />
                <input type="password" placeholder="Пароль" style={loginInput} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button style={loginBtn} disabled={authLoading}>
                {authLoading ? <Loader2 className="animate-spin" /> : "КИРИШ"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={mainAppContainer}>
      <div style={styles.statusBar} />

      <div style={{ paddingBottom: '120px' }}>
        <main style={{ padding: '0 20px' }}>
          {activeTab === 'tasks' && (
            <div style={{paddingTop: '10px'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                <div>
                  <h2 style={{fontSize:'1.8rem', fontWeight:'800', margin:0}}>Салом, {agroProfile?.full_name?.split(' ')[0]}!</h2>
                  <p style={{color: THEME.accent, fontWeight:'600'}}>Бугунги режа</p>
                </div>
                <button onClick={() => setActiveTab('profile')} style={styles.miniProfileBtn}><User size={20}/></button>
              </div>

              <div style={progressContainer}>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.75rem', marginBottom:'8px'}}>
                  <span>Бажарилди: {stats.percent}%</span>
                  <span>{myTasks.filter(t => t.status === 'new').length} та янги</span>
                </div>
                <div style={progressBarBg}>
                  <div style={{...progressBarFill, width: `${stats.percent}%`}}></div>
                </div>
              </div>

              {myTasks.length === 0 ? (
                <div style={{textAlign:'center', padding:'40px', opacity:0.5}}>Янги вазифалар йўқ</div>
              ) : myTasks.map(t => (
                <div key={t.id} onClick={() => { if(t.status !== 'completed') { setSelectedTaskId(t.id); handleFieldSelect(t.field_id); setShowReportModal(true); } }} style={{ ...THEME.glass, marginBottom:'15px', padding:'18px', display:'flex', alignItems:'center', justifyContent:'space-between', opacity: t.status === 'completed' ? 0.4 : 1 }}>
                  <div style={{display:'flex', alignItems:'center', flex: 1}}>
                    <div style={styles.taskIcon}><Target size={20} color={THEME.accent}/></div>
                    <div style={{flex: 1}}>
                        <div style={{fontWeight:'600', fontSize:'1.05rem', marginBottom:'4px'}}>{t.title}</div>
                        <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                            <div style={badgeStyle}><Clock size={12}/> {new Date(t.created_at).toLocaleDateString()}</div>
                            <div style={{...badgeStyle, background:'rgba(16, 185, 129, 0.2)', color: THEME.accent}}>{t.status}</div>
                        </div>
                        <div style={{fontSize:'0.8rem', color: THEME.textSecondary, marginTop:'6px'}}>📍 {t.fields?.name}</div>
                    </div>
                  </div>
                  <div style={styles.chevronCircle}><ChevronRight size={20} color={THEME.accent}/></div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'fields' && (
            <div style={{paddingTop: '10px'}}>
              <h2 style={styles.sectionTitle}>Далалар</h2>
              {myFields.map(f => (
                <div key={f.id} onClick={() => { setSelectedTaskId(null); handleFieldSelect(f.id); setShowReportModal(true); }} style={{...THEME.glass, marginBottom:'15px', padding:'24px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div><div style={{fontSize:'1.2rem', fontWeight:'700'}}>{f.name}</div><div style={{fontSize:'0.9rem', color: THEME.textSecondary}}>{f.crop_type} • {f.area_hectares} га {f.location_center ? '📍' : '⚠️'}</div></div>
                  <div style={styles.chevronCircle}><ChevronRight size={20}/></div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'inventory' && <InventoryView inventory={inventory} />}
          {activeTab === 'profile' && <ProfileView profile={agroProfile} onLogout={handleSignOut} />}
        </main>

        <nav style={styles.navContainer}>
          <div style={styles.navGlass}>
            <NavBtn active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={22}/>} />
            <NavBtn active={activeTab === 'fields'} onClick={() => setActiveTab('fields')} icon={<Map size={22}/>} />
            <button onClick={() => { setSelectedTaskId(null); setShowReportModal(true); }} style={styles.centerFab}><Camera size={28} color="#fff" /></button>
            <NavBtn active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={22}/>} />
            <NavBtn active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={22}/>} />
          </div>
        </nav>

        {showReportModal && (
          <div style={styles.modalOverlay}>
            <div style={{...THEME.glass, width:'92%', maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', background:'rgba(10,15,10,0.95)'}}>
              <div style={styles.modalHeader}>
                <h3 style={{margin:0}}>Янги ҳисобот</h3>
                <button onClick={() => setShowReportModal(false)} style={styles.closeBtn}><X size={20} /></button>
              </div>
              <div style={{padding:'20px', overflowY:'auto'}}>
                <label style={styles.label}>🌳 Далани танланг</label>
                <select style={styles.inputGlass} value={reportData.field_id} onChange={(e) => handleFieldSelect(e.target.value)}>
                  <option value="">Танланг...</option>
                  {myFields.map(f => <option key={f.id} value={f.id} style={{color:'#000'}}>{f.name} {f.location_center ? '📍' : '⚠️'}</option>)}
                </select>
                <div style={{ marginTop:'20px' }}>
                  <label style={styles.label}>🛠️ Иш тури</label>
                  <div style={typeGrid}>
                    <TypeBtn active={reportData.type==='inspection'} icon={<Map size={18}/>} label="Кўрик" onClick={()=>setReportData({...reportData, type:'inspection'})}/>
                    <TypeBtn active={reportData.type==='watering'} icon={<Droplets size={18}/>} label="Суғориш" onClick={()=>setReportData({...reportData, type:'watering'})}/>
                    <TypeBtn active={reportData.type==='pest'} icon={<Bug size={18}/>} label="Зараркунанда" onClick={()=>setReportData({...reportData, type:'pest'})}/>
                  </div>
                  <label style={styles.label} style={{marginTop:'20px', display:'block'}}>📸 Изоҳ ва Расм</label>
                  <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
                    <label style={photoUploadCard}>
                      <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => setReportData({...reportData, image: e.target.files[0]})} />
                      <Camera size={24} color={reportData.image ? THEME.accent : THEME.textSecondary}/>
                    </label>
                    <textarea style={{...styles.inputGlass, flex:2, height:'100px', margin:0}} placeholder="Изоҳ қолдиринг..." value={reportData.note} onChange={e => setReportData({...reportData, note: e.target.value})} />
                  </div>
                  <button onClick={submitReport} style={loginBtn}>ЮБОРИШ</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// СТИЛЛАР ВА КОМПОНЕНТЛАР ОЛДИНГИДЕК ҚОЛДИ
const NavBtn = ({ active, icon, onClick }) => (
  <button onClick={onClick} style={{ background:'none', border:'none', padding:'12px', color: active ? THEME.accent : 'rgba(255,255,255,0.4)', transition: 'all 0.3s ease', transform: active ? 'scale(1.2)' : 'scale(1)', cursor:'pointer' }}>{icon}</button>
);
const TypeBtn = ({ active, icon, label, onClick }) => (
  <div onClick={onClick} style={{ padding:'12px 5px', borderRadius:'12px', textAlign:'center', flex:1, background: active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${active ? THEME.accent : 'rgba(255,255,255,0.1)'}`, color: active ? THEME.accent : THEME.textSecondary, cursor:'pointer' }}>{icon}<div style={{fontSize:'0.65rem', marginTop:'4px'}}>{label}</div></div>
);
const InventoryView = ({ inventory }) => (
  <div style={{paddingTop: '10px'}}><h2 style={styles.sectionTitle}>Склад</h2><div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>{inventory.map(i => (<div key={i.id} style={{...THEME.glass, padding:'20px'}}><div style={{fontSize:'0.85rem', color: THEME.textSecondary, marginBottom:'8px'}}>{i.item_name}</div><div style={{fontSize:'1.4rem', fontWeight:'800', color:THEME.accent}}>{i.quantity} {i.unit}</div></div>))}</div></div>
);
const ProfileView = ({ profile, onLogout }) => (
  <div style={{ textAlign:'center', paddingTop:'30px' }}><div style={styles.avatar}><User size={40} color={THEME.accent}/></div><h2 style={{margin:'0 0 5px 0', fontSize:'1.6rem'}}>{profile?.full_name}</h2><p style={{color:THEME.textSecondary, marginBottom:'40px'}}>Агроном</p><button onClick={() => onLogout()} style={{...THEME.glass, width:'100%', padding:'18px', color:THEME.danger, fontWeight:'700', border:`1px solid ${THEME.danger}44`}}>ЧИҚИШ</button></div>
);
const mainAppContainer = { height: '100vh', width: '100vw', backgroundColor: '#05110a', backgroundImage: `radial-gradient(circle at top right, #064e3b 0%, #05110a 100%)`, color: THEME.text, overflowY: 'auto', WebkitOverflowScrolling: 'touch' };
const styles = {
  statusBar: { height: 'env(safe-area-inset-top, 24px)', backgroundColor: '#05110a', width: '100%', position: 'sticky', top: 0, zIndex: 3000 },
  navContainer: { position:'fixed', bottom:'30px', left:0, right:0, display:'flex', justifyContent:'center', padding:'0 20px', zIndex:1000 },
  navGlass: { ...THEME.glass, width:'100%', maxWidth:'450px', height:'75px', display:'flex', justifyContent:'space-around', alignItems:'center', padding:'0 10px', borderRadius:'35px' },
  centerFab: { width:'60px', height:'60px', borderRadius:'50%', background: THEME.accentGradient, border:'5px solid #05110a', boxShadow: `0 0 20px ${THEME.accent}66`, display:'flex', alignItems:'center', justifyContent:'center', marginTop:'-40px' },
  sectionTitle: { fontSize:'1.8rem', fontWeight:'900', marginBottom:'25px' },
  taskIcon: { width:'42px', height:'42px', borderRadius:'12px', background:'rgba(16,185,129,0.15)', display:'flex', alignItems:'center', justifyContent:'center', marginRight:'12px' },
  chevronCircle: { width:'36px', height:'36px', borderRadius:'50%', background:'rgba(16,185,129,0.1)', display:'flex', alignItems:'center', justifyContent:'center' },
  miniProfileBtn: { background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', padding:'10px', borderRadius:'14px' },
  avatar: { width:'90px', height:'90px', borderRadius:'50%', background:'rgba(16,185,129,0.1)', border:`1px solid ${THEME.accent}44`, margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center' },
  modalOverlay: { position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', backdropFilter:'blur(10px)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center' },
  modalHeader: { padding:'20px', borderBottom:'1px solid rgba(255,255,255,0.1)', display:'flex', justifyContent:'space-between', alignItems:'center' },
  closeBtn: { background:'rgba(255,255,255,0.1)', border:'none', color:'#fff', width:'36px', height:'36px', borderRadius:'50%' },
  inputGlass: { width:'100%', padding:'16px', borderRadius:'14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', outline:'none' },
  label: { display:'block', color: THEME.textSecondary, fontSize:'0.85rem', marginBottom:'10px' }
};
const badgeStyle = { display:'flex', alignItems:'center', gap:'4px', padding:'4px 8px', borderRadius:'8px', background:'rgba(255,255,255,0.1)', fontSize:'0.7rem', fontWeight:'600' };
const progressContainer = { marginBottom:'30px', background:'rgba(255,255,255,0.03)', padding:'15px', borderRadius:'20px', border:'1px solid rgba(255,255,255,0.05)' };
const progressBarBg = { height:'8px', width:'100%', background:'rgba(255,255,255,0.1)', borderRadius:'10px', overflow:'hidden' };
const progressBarFill = { height:'100%', background: THEME.accentGradient, borderRadius:'10px', transition: 'width 0.5s ease' };
const loginOverlay = { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#05110a' };
const inputWrapper = { position: 'relative', marginBottom: '15px' };
const inputIcon = { position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' };
const loginInput = { width: '100%', padding: '18px 18px 18px 50px', borderRadius: '18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline:'none' };
const loginBtn = { width: '100%', padding: '18px', borderRadius: '18px', background: THEME.accentGradient, color: '#000', fontWeight: '800', border: 'none', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center' };
const typeGrid = { display:'flex', gap:'8px' };
const photoUploadCard = { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.05)', borderRadius:'12px', border:`1px dashed rgba(255,255,255,0.2)`, cursor:'pointer' };