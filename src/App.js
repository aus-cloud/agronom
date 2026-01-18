import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { 
  CheckSquare, Map, Package, Camera, MapPin, 
  Send, ChevronRight, Droplets, Bug, Loader2, User, Target, Lock, Mail, X, Clock, CheckCircle2
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
  const [reportData, setReportData] = useState({ 
    field_id: '', type: 'inspection', note: '', image: null, lat: null, lon: null 
  });

  // Свайп учун вақтинчалик координаталар
  let touchStartX = 0;

  const notifyMe = (title) => {
    if (Notification.permission === "granted") {
      new Notification("AGROPRO: Янги вазифа", { body: title });
    }
  };

  useEffect(() => {
    if ("Notification" in window) Notification.requestPermission();
    const style = document.createElement('style');
    style.innerHTML = `
      html, body { overscroll-behavior: none !important; position: fixed; width: 100%; height: 100%; overflow: hidden; background-color: #05110a; }
      #root { height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch; }
      .task-card { transition: transform 0.3s ease, opacity 0.3s ease; touch-action: pan-y; }
      .task-completed { opacity: 0.4 !important; filter: grayscale(1); transform: scale(0.95); }
    `;
    document.head.appendChild(style);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchAgroProfile(session.user.id);
      setLoading(false);
    });

    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    let channel;
    if (agroProfile?.id) {
      channel = supabase.channel('tasks_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `agronomist_id=eq.${agroProfile.id}` }, 
        () => fetchAppData(agroProfile.id)).subscribe();
    }
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [agroProfile]);

  async function fetchAgroProfile(authId) {
    const { data } = await supabase.from('agronomists').select('*').eq('auth_id', authId).single();
    if (data) { setAgroProfile(data); fetchAppData(data.id); }
  }

  async function fetchAppData(agroId) {
    const { data: allTasks } = await supabase.from('tasks').select('*, fields(name)').eq('agronomist_id', agroId).order('created_at', { ascending: false });
    
    // Барча вазифаларни оламиз, лекин саралаймиз: 'new' тепада, 'completed' пастда
    const sortedTasks = allTasks ? [
      ...allTasks.filter(t => t.status === 'new'),
      ...allTasks.filter(t => t.status === 'completed')
    ] : [];

    setMyTasks(sortedTasks);
    
    const total = allTasks?.length || 0;
    const completed = allTasks?.filter(t => t.status === 'completed').length || 0;
    setStats({ total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 });

    const { data: fData } = await supabase.from('fields').select('*').eq('agronomist_id', agroId);
    setMyFields(fData || []);
    const { data: iData } = await supabase.from('inventory').select('*');
    setInventory(iData || []);
  }

  // ВАЗИФАНИ БАЖАРИЛДИ ДЕБ БЕЛГИЛАШ (СВАЙП УЧУН)
  const completeTask = async (taskId) => {
    const { error } = await supabase.from('tasks').update({ status: 'completed' }).eq('id', taskId);
    if (!error) fetchAppData(agroProfile.id);
  };

  const handleTouchStart = (e) => { touchStartX = e.touches[0].clientX; };
  const handleTouchEnd = (e, taskId, currentStatus) => {
    const touchEndX = e.changedTouches[0].clientX;
    if (currentStatus !== 'completed' && touchEndX - touchStartX > 100) {
      completeTask(taskId); // 100px дан кўп ўнгга сурилса
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const fullEmail = email.includes('@') ? email : `${email}@agro.uz`;
    const { error } = await supabase.auth.signInWithPassword({ email: fullEmail, password });
    if (error) alert(error.message);
    setAuthLoading(false);
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); };

  if (!session && !loading) {
    return (
      <div style={loginOverlay}>
        <div style={{...THEME.glass, padding: '40px 30px', width: '90%', maxWidth: '400px', textAlign: 'center'}}>
          <h1 style={{fontSize: '2.5rem', fontWeight: '900'}}>AGRO<span style={{color: THEME.accent}}>PRO</span></h1>
          <form style={{marginTop: '30px'}} onSubmit={handleSignIn}>
            <input type="text" placeholder="Логин" style={loginInput} value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Пароль" style={loginInput} value={password} onChange={(e) => setPassword(e.target.value)} />
            <button style={loginBtn} disabled={authLoading}>{authLoading ? <Loader2 className="animate-spin" /> : "КИРИШ"}</button>
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
                  <span>Прогресс: {stats.percent}%</span>
                  <span>{stats.completed}/{stats.total} бажарилди</span>
                </div>
                <div style={progressBarBg}><div style={{...progressBarFill, width: `${stats.percent}%`}}></div></div>
              </div>

              {myTasks.map(t => (
                <div 
                  key={t.id} 
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, t.id, t.status)}
                  className={`task-card ${t.status === 'completed' ? 'task-completed' : ''}`}
                  style={{ ...THEME.glass, marginBottom:'15px', padding:'18px', display:'flex', alignItems:'center', justifyContent:'space-between', borderLeft: t.status === 'completed' ? `5px solid ${THEME.accent}` : '1px solid rgba(255,255,255,0.1)' }}
                >
                  <div style={{display:'flex', alignItems:'center', flex: 1}}>
                    <div style={{...styles.taskIcon, background: t.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)'}}>
                        {t.status === 'completed' ? <CheckCircle2 size={20} color={THEME.accent}/> : <Target size={20} color={THEME.textSecondary}/>}
                    </div>
                    <div style={{flex: 1}}>
                        <div style={{fontWeight:'600', fontSize:'1.05rem', textDecoration: t.status === 'completed' ? 'line-through' : 'none'}}>{t.title}</div>
                        <div style={{fontSize:'0.8rem', color: THEME.textSecondary}}>📍 {t.fields?.name}</div>
                    </div>
                  </div>
                  {t.status === 'new' && <div style={{fontSize:'0.6rem', color:THEME.accent, opacity:0.6}}>Ўнгга суринг ➔</div>}
                </div>
              ))}
            </div>
          )}
          
          {activeTab === 'fields' && (
             <div style={{paddingTop: '10px'}}>
              <h2 style={styles.sectionTitle}>Далалар</h2>
              {myFields.map(f => (
                <div key={f.id} style={{...THEME.glass, marginBottom:'15px', padding:'24px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div><div style={{fontSize:'1.2rem', fontWeight:'700'}}>{f.name}</div><div style={{fontSize:'0.9rem', color: THEME.textSecondary}}>{f.crop_type} • {f.area_hectares} га</div></div>
                  <ChevronRight size={20}/>
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
            <button onClick={() => setShowReportModal(true)} style={styles.centerFab}><Camera size={28} color="#fff" /></button>
            <NavBtn active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={22}/>} />
            <NavBtn active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={22}/>} />
          </div>
        </nav>
      </div>
    </div>
  );
}

const NavBtn = ({ active, icon, onClick }) => (
  <button onClick={onClick} style={{ background:'none', border:'none', padding:'12px', color: active ? THEME.accent : 'rgba(255,255,255,0.4)', transition: 'all 0.3s ease', transform: active ? 'scale(1.2)' : 'scale(1)' }}>{icon}</button>
);

const InventoryView = ({ inventory }) => (
  <div style={{paddingTop: '10px'}}><h2 style={styles.sectionTitle}>Склад</h2><div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>{inventory.map(i => (<div key={i.id} style={{...THEME.glass, padding:'20px'}}><div style={{fontSize:'0.85rem', color: THEME.textSecondary}}>{i.item_name}</div><div style={{fontSize:'1.4rem', fontWeight:'800', color:THEME.accent}}>{i.quantity} {i.unit}</div></div>))}</div></div>
);

const ProfileView = ({ profile, onLogout }) => (
  <div style={{ textAlign:'center', paddingTop:'30px' }}><div style={styles.avatar}><User size={40} color={THEME.accent}/></div><h2 style={{margin:'0'}}>{profile?.full_name}</h2><p style={{color:THEME.textSecondary, marginBottom:'40px'}}>Агроном</p><button onClick={onLogout} style={{...THEME.glass, width:'100%', padding:'18px', color:THEME.danger}}>ЧИҚИШ</button></div>
);

const mainAppContainer = { height: '100vh', width: '100vw', backgroundColor: '#05110a', backgroundImage: `radial-gradient(circle at top right, #064e3b 0%, #05110a 100%)`, color: THEME.text, overflowY: 'auto' };
const styles = {
  statusBar: { height: 'env(safe-area-inset-top, 24px)', backgroundColor: '#05110a', width: '100%', position: 'sticky', top: 0, zIndex: 3000 },
  navContainer: { position:'fixed', bottom:'30px', left:0, right:0, display:'flex', justifyContent:'center', padding:'0 20px', zIndex:1000 },
  navGlass: { ...THEME.glass, width:'100%', maxWidth:'450px', height:'75px', display:'flex', justifyContent:'space-around', alignItems:'center', borderRadius:'35px' },
  centerFab: { width:'60px', height:'60px', borderRadius:'50%', background: THEME.accentGradient, border:'5px solid #05110a', display:'flex', alignItems:'center', justifyContent:'center', marginTop:'-40px' },
  sectionTitle: { fontSize:'1.8rem', fontWeight:'900', marginBottom:'25px' },
  taskIcon: { width:'42px', height:'42px', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', marginRight:'12px' },
  avatar: { width:'90px', height:'90px', borderRadius:'50%', background:'rgba(16,185,129,0.1)', border:`1px solid ${THEME.accent}44`, margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center' },
  miniProfileBtn: { background:'rgba(255,255,255,0.1)', border:'none', color:'#fff', padding:'10px', borderRadius:'14px' }
};

const progressContainer = { marginBottom:'30px', background:'rgba(255,255,255,0.03)', padding:'15px', borderRadius:'20px', border:'1px solid rgba(255,255,255,0.05)' };
const progressBarBg = { height:'8px', width:'100%', background:'rgba(255,255,255,0.1)', borderRadius:'10px', overflow:'hidden' };
const progressBarFill = { height:'100%', background: THEME.accentGradient, transition: 'width 0.5s ease' };
const loginOverlay = { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#05110a' };
const loginInput = { width: '100%', padding: '18px', marginBottom: '15px', borderRadius: '18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline:'none' };
const loginBtn = { width: '100%', padding: '18px', borderRadius: '18px', background: THEME.accentGradient, color: '#000', fontWeight: '800', border: 'none' };