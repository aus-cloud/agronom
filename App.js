import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { 
CheckSquare, Map, Package, Camera, MapPin, 
Send, ChevronRight, Droplets, Bug, Loader2, User, Target, Lock, Mail, X, Clock, Navigation,
Search, Filter, Phone, Sprout, ClipboardList, Ruler
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
const [selectedTaskId, setSelectedTaskId] = useState(null);

const [navMenu, setNavMenu] = useState({ show: false, lat: null, lon: null });

const [reportData, setReportData] = useState({ 
field_id: '', type: 'inspection', note: '', image: null, lat: null, lon: null, accuracy: null 
});

const [searchQuery, setSearchQuery] = useState('');
const [filterCrop, setFilterCrop] = useState('');
const [showFieldPassport, setShowFieldPassport] = useState(null);

// --- ЯНГИ: ТАРИХ УЧУН СТАТЕ ---
const [fieldHistory, setFieldHistory] = useState([]);
const [historyLoading, setHistoryLoading] = useState(false);

const selectedField = myFields.find(f => String(f.id) === String(reportData.field_id));
const hasCoordinates = !!(selectedField?.location_center?.lat);
const fieldMissingGPS = reportData.field_id && selectedField && !hasCoordinates;
const isSubmitDisabled = fieldMissingGPS && !reportData.lat;

useEffect(() => {
if ('serviceWorker' in navigator) {
navigator.serviceWorker.register('/sw.js').catch(err => console.error('SW Error', err));
}
const style = document.createElement('style');
style.innerHTML = `
* {
scrollbar-width: none !important;
-ms-overflow-style: none !important;
}
*::-webkit-scrollbar {
display: none !important;
width: 0 !important;
height: 0 !important;
}

html, body { 
overscroll-behavior: none !important; 
position: fixed; 
width: 100%; 
height: 100%; 
overflow: hidden; 
background-color: #05110a; 
margin: 0;
padding: 0;
}

#root { 
height: 100%; 
width: 100%;
overflow-y: auto; 
overflow-x: hidden;
-webkit-overflow-scrolling: touch;
}

input, select, textarea { 
font-size: 16px !important; 
box-sizing: border-box; 
}

.search-container { 
width: 100%; 
box-sizing: border-box; 
}

@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.bottom-sheet { animation: slideUp 0.4s cubic-bezier(0, 0, 0.2, 1); }
.field-card:active { transform: scale(0.97); }
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
return () => { subscription.unsubscribe(); document.head.removeChild(style); }
}, []);

async function fetchAgroProfile(authId) {
const { data } = await supabase.from('agronomists').select('*').eq('auth_id', authId).single();
if (data) { setAgroProfile(data); fetchAppData(data.id); }
}

async function fetchAppData(agroId) {
const { data: allTasks } = await supabase
.from('tasks')
.select('*, fields(*)')
.eq('agronomist_id', agroId);

setMyTasks(allTasks || []);

const doneTasks = allTasks?.filter(t => t.status === 'completed') || [];
setStats({ 
total: allTasks?.length || 0, 
completed: doneTasks.length, 
percent: allTasks?.length > 0 ? Math.round((doneTasks.length / allTasks.length) * 100) : 0 
});

const { data: fData, error: fError } = await supabase
.from('fields')
.select('*, farmers(*)')
.eq('agronomist_id', agroId);

console.log("Юкланган далалар маълумоти (fData):", fData);
if (fError) console.error("Сўровда хатолик:", fError);

setMyFields(fData || []);

const { data: iData } = await supabase.from('inventory').select('*');
setInventory(iData || []);
}

// --- ЯНГИ: ТАРИХНИ ЮКЛАШ ФУНКЦИЯСИ ---
async function fetchFieldHistory(fieldId) {
setHistoryLoading(true);
const { data, error } = await supabase
.from('field_operations')
.select('*')
.eq('field_id', fieldId)
.order('operation_date', { ascending: false });

if (!error) setFieldHistory(data || []);
setHistoryLoading(false);
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

const handleFieldSelect = (fieldId) => {
setReportData(prev => ({ ...prev, field_id: fieldId, lat: null, lon: null, accuracy: null }));
};

const getGeoLocation = () => {
setIsLocating(true);
navigator.geolocation.getCurrentPosition(
(pos) => {
setReportData(prev => ({ 
...prev, 
lat: pos.coords.latitude.toFixed(6), 
lon: pos.coords.longitude.toFixed(6),
accuracy: Math.round(pos.coords.accuracy) 
}));
setIsLocating(false);
},
(err) => { setIsLocating(false); alert("GPS хатоси: " + err.message); },
{ enableHighAccuracy: true, timeout: 10000 }
);
};

const saveFieldLocation = async () => {
if (!reportData.lat || !reportData.lon) return alert("Аввал GPS тугмасини босинг!");
const newCoords = { lat: parseFloat(reportData.lat), lon: parseFloat(reportData.lon) };
const { error } = await supabase.from('fields').update({ location_center: newCoords }).eq('id', reportData.field_id);
if (!error) { 
setMyFields(prev => prev.map(f => String(f.id) === String(reportData.field_id) ? { ...f, location_center: newCoords } : f));
setReportData(prev => ({ ...prev, lat: null, lon: null }));
alert("✅ Дала муваффақиятли боғланди!"); 
} else { alert("Хато: " + error.message); }
};

const submitReport = async () => {
if (!reportData.field_id || !reportData.note) return alert("Маълумотни тўлдиринг!");
if (isSubmitDisabled) return alert("Хатолик: Аввал GPS аниқлаб, далага боғланг!");
setAuthLoading(true);
const { error } = await supabase.from('field_operations').insert([{
field_id: reportData.field_id, operation_type: reportData.type, description: reportData.note, operation_date: new Date().toISOString()
}]);
if (!error) {
if (selectedTaskId) await supabase.from('tasks').update({ status: 'completed' }).eq('id', selectedTaskId);
alert("🚀 Ҳисобот юборилди!");
setShowReportModal(false);
setSelectedTaskId(null);
setReportData({ field_id: '', type: 'inspection', note: '', image: null, lat: null, lon: null, accuracy: null });
fetchAppData(agroProfile.id);
} else { alert("Хато: " + error.message); }
setAuthLoading(false);
};

const handleSignOut = async () => { await supabase.auth.signOut(); };

const openNavigation = (type) => {
const { lat, lon } = navMenu;
let url = '';
if (type === 'google') url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
if (type === 'yandex') url = `yandexnavi://build_route_on_map?lat_to=${lat}&lon_to=${lon}`;
if (type === 'apple') url = `maps://maps.apple.com/?daddr=${lat},${lon}`;
window.open(url, '_blank');
setNavMenu({ show: false, lat: null, lon: null });
};

const filteredFields = myFields.filter(f => {
const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
(f.farmers?.full_name && f.farmers.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
const matchesCrop = filterCrop === '' || f.crop_type === filterCrop;
return matchesSearch && matchesCrop;
});

const uniqueCrops = [...new Set(myFields.map(f => f.crop_type))];

if (!session && !loading) {
return (
<div style={loginOverlay}>
<div style={{...THEME.glass, padding: '40px 30px', width: '90%', maxWidth: '400px', textAlign: 'center'}}>
<h1 style={{fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px'}}>AGRO<span style={{color: THEME.accent}}>PRO</span></h1>
<form style={{marginTop: '30px'}} onSubmit={handleSignIn}>
<div style={inputWrapper}><Mail size={18} style={inputIcon} /><input type="text" placeholder="Логин" style={loginInput} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
<div style={inputWrapper}><Lock size={18} style={inputIcon} /><input type="password" placeholder="Пароль" style={loginInput} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
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
<div><h2 style={{fontSize:'1.8rem', fontWeight:'800', margin:0}}>Салом, {agroProfile?.full_name?.split(' ')[0]}!</h2><p style={{color: THEME.accent, fontWeight:'600'}}>Бугунги режа</p></div>
<button onClick={() => setActiveTab('profile')} style={styles.miniProfileBtn}><User size={20}/></button>
</div>
<div style={progressContainer}>
<div style={{display:'flex', justifyContent:'space-between', fontSize:'0.75rem', marginBottom:'8px'}}><span>Бажарилди: {stats.percent}%</span><span>{myTasks.filter(t => t.status === 'new').length} та янги</span></div>
<div style={progressBarBg}><div style={{...progressBarFill, width: `${stats.percent}%`}}></div></div>
</div>
{myTasks.length === 0 ? (<div style={{textAlign:'center', padding:'40px', opacity:0.5}}>Янги вазифалар йўқ</div>) : myTasks.map(t => {
const tLat = t.fields?.location_center?.lat;
const tLon = t.fields?.location_center?.lon;
return (
<div key={t.id} onClick={() => { if(t.status !== 'completed') { setSelectedTaskId(t.id); handleFieldSelect(t.field_id); setShowReportModal(true); } }} style={{ ...THEME.glass, marginBottom:'15px', padding:'18px', display:'flex', alignItems:'center', justifyContent:'space-between', opacity: t.status === 'completed' ? 0.4 : 1 }}>
<div style={{display:'flex', alignItems:'center', flex: 1, overflow:'hidden'}}>
<div style={styles.taskIcon}><Target size={20} color={THEME.accent}/></div>
<div style={{flex: 1, overflow:'hidden'}}>
<div style={{fontWeight:'600', fontSize:'1.05rem', marginBottom:'4px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{t.title}</div>
<div style={{display:'flex', gap:'8px', alignItems:'center', marginBottom:'6px'}}>
<div style={badgeStyle}><Clock size={12}/> {new Date(t.created_at).toLocaleDateString()}</div>
<div style={{...badgeStyle, background:'rgba(16, 185, 129, 0.2)', color: THEME.accent}}>{t.status}</div>
</div>
<div style={{display:'flex', alignItems:'center', gap:'8px'}}>
{tLat && tLon ? (
<button onClick={(e) => { e.stopPropagation(); setNavMenu({ show: true, lat: tLat, lon: tLon }); }} style={navButtonStyle}><Navigation size={12} fill={THEME.accent}/> Навигация</button>
) : (
<span style={{fontSize:'0.7rem', color: THEME.danger, background:'rgba(239, 68, 68, 0.1)', padding:'2px 6px', borderRadius:'4px'}}>Гео йўқ</span>
)}
<div style={{fontSize:'0.8rem', color: THEME.textSecondary, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>📍 {t.fields?.name}</div>
</div>
</div>
</div>
<div style={styles.chevronCircle}><ChevronRight size={20} color={THEME.accent}/></div>
</div>
)
})}
</div>
)}

{activeTab === 'fields' && (
<div style={{paddingTop: '10px'}}>
<h2 style={styles.sectionTitle}>Далалар</h2>

<div style={{marginBottom:'25px', display:'flex', flexDirection:'column', gap:'12px'}}>
<div style={{...inputWrapper, marginBottom:0}}>
<Search size={18} style={inputIcon} />
<input 
type="text" 
placeholder="Дала ёки фермер исми..." 
style={{
...loginInput, 
borderRadius: '16px', 
background: 'rgba(255,255,255,0.1)',
width: '100%',
boxSizing: 'border-box',
paddingRight: '15px'
}} 
value={searchQuery} 
onChange={e => setSearchQuery(e.target.value)} 
/>
</div>
<div style={{display:'flex', gap:'8px', overflowX:'auto', paddingBottom:'5px', scrollbarWidth:'none'}}>
<button onClick={() => setFilterCrop('')} style={{...filterBtn, background: filterCrop === '' ? THEME.accent : 'rgba(255,255,255,0.1)', color: filterCrop === '' ? '#000' : '#fff'}}>Барчаси</button>
{uniqueCrops.map(c => (
<button key={c} onClick={() => setFilterCrop(c)} style={{...filterBtn, background: filterCrop === c ? THEME.accent : 'rgba(255,255,255,0.1)', color: filterCrop === c ? '#000' : '#fff'}}>{c}</button>
))}
</div>
</div>

<div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
{filteredFields.map(f => (
<div key={f.id} className="field-card" onClick={() => { setShowFieldPassport(f); fetchFieldHistory(f.id); }} style={{...THEME.glass, padding:'20px', display:'flex', justifyContent:'space-between', alignItems:'center', transition:'0.2s'}}>
<div style={{display:'flex', gap:'15px', alignItems:'center'}}>
<div style={{width:'48px', height:'48px', borderRadius:'14px', background:'rgba(16, 185, 129, 0.15)', display:'flex', alignItems:'center', justifyContent:'center'}}>
<Sprout size={24} color={THEME.accent} />
</div>
<div>
<div style={{fontSize:'1.1rem', fontWeight:'700'}}>{f.name}</div>
<div style={{fontSize:'0.85rem', color: THEME.textSecondary}}>{f.crop_type} • {f.area_hectares} га</div>
</div>
</div>
<ChevronRight size={20} color={THEME.textSecondary} />
</div>
))}
</div>
</div>
)}

{activeTab === 'inventory' && <InventoryView inventory={inventory} />}
{activeTab === 'profile' && (
<div style={{ textAlign:'center', paddingTop:'30px' }}>
<div style={styles.avatar}><User size={40} color={THEME.accent}/></div>
<h2 style={{margin:'0 0 5px 0', fontSize:'1.6rem'}}>{agroProfile?.full_name}</h2>
<button onClick={handleSignOut} style={{...THEME.glass, width:'100%', padding:'18px', color:THEME.danger, fontWeight:'700', border:`1px solid ${THEME.danger}44` }}>ЧИҚИШ</button>
</div>
)}
</main>

<nav style={styles.navContainer}>
<div style={styles.navGlass}>
<NavBtn active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={22}/>} />
<NavBtn active={activeTab === 'fields'} onClick={() => setActiveTab('fields')} icon={<Map size={22}/>} />
<button onClick={() => { setSelectedTaskId(null); setReportData(prev => ({...prev, field_id: '', lat: null, lon: null})); setShowReportModal(true); }} style={styles.centerFab}><Camera size={28} color="#fff" /></button>
<NavBtn active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={22}/>} />
<NavBtn active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={22}/>} />
</div>
</nav>

{/* --- ДАЛА ПАСПОРТИ (BOTTOM SHEET) --- */}
{showFieldPassport && (
<div style={styles.modalOverlay} onClick={() => setShowFieldPassport(null)}>
<div className="bottom-sheet" style={bottomSheetContainer} onClick={e => e.stopPropagation()}>
<div style={dragHandle} />

<div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px'}}>
<h3 style={{margin:0, fontSize:'1.5rem', fontWeight:'800'}}>Дала паспорти</h3>
<button onClick={() => setShowFieldPassport(null)} style={styles.closeBtn}><X size={20}/></button>
</div>

<div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'20px'}}>
<PassportMiniCard icon={<Ruler size={18}/>} label="Майдони" value={`${showFieldPassport.area_hectares} га`} />
<PassportMiniCard icon={<Sprout size={18}/>} label="Экин" value={showFieldPassport.crop_type} />
</div>

<div style={{display:'flex', flexDirection:'column', gap:'10px', marginBottom:'25px'}}>
<PassportRow icon={<MapPin size={18}/>} label="Дала номи" value={showFieldPassport.name} />
<PassportRow icon={<User size={18}/>} label="Масъул фермер" value={showFieldPassport.farmers?.full_name || "Киритилмаган"} />
<PassportRow icon={<Phone size={18}/>} label="Телефон" value={showFieldPassport.farmers?.phone || "Йўқ"} isPhone={!!showFieldPassport.farmers?.phone} />
<PassportRow icon={<ClipboardList size={18}/>} label="Уруғ нави" value={showFieldPassport.seed_variety || "Маълумот йўқ"} />
</div>

{/* --- ЯНГИ: ТИМЕЛИНЕ БЎЛИМИ --- */}
<div style={{marginTop: '25px', marginBottom: '25px'}}>
    <h4 style={{fontSize: '1.1rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800'}}>
        <Clock size={18} color={THEME.accent}/> Амалиётлар тарихи
    </h4>
    {historyLoading ? (
        <div style={{textAlign: 'center', padding: '20px'}}><Loader2 className="animate-spin" color={THEME.accent}/></div>
    ) : fieldHistory.length === 0 ? (
        <div style={{color: THEME.textSecondary, fontSize: '0.85rem', textAlign: 'center', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '15px'}}>Тарих топилмади</div>
    ) : (
        <div style={{display: 'flex', flexDirection: 'column', gap: '0', paddingLeft: '10px', borderLeft: `2px solid ${THEME.accent}33`}}>
            {fieldHistory.map((op) => (
                <div key={op.id} style={{position: 'relative', paddingLeft: '20px', paddingBottom: '20px'}}>
                    <div style={{position: 'absolute', left: '-7px', top: '0', width: '12px', height: '12px', borderRadius: '50%', background: THEME.accent, boxShadow: `0 0 8px ${THEME.accent}`}} />
                    <div style={{fontSize: '0.75rem', color: THEME.accent, fontWeight: '700', marginBottom: '4px'}}>{new Date(op.operation_date).toLocaleDateString()}</div>
                    <div style={{background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)'}}>
                        <div style={{fontWeight: '700', fontSize: '0.9rem', marginBottom: '4px', display:'flex', alignItems:'center', gap:'6px'}}>
                            {op.operation_type === 'inspection' ? <Search size={14}/> : op.operation_type === 'watering' ? <Droplets size={14}/> : <Bug size={14}/>}
                            {op.operation_type.toUpperCase()}
                        </div>
                        <div style={{fontSize: '0.85rem', color: THEME.textSecondary, lineHeight: '1.4'}}>{op.description}</div>
                    </div>
                </div>
            ))}
        </div>
    )}
</div>

<div style={{display:'flex', gap:'10px'}}>
{showFieldPassport.location_center?.lat && (
<button onClick={() => setNavMenu({show:true, lat: showFieldPassport.location_center.lat, lon: showFieldPassport.location_center.lon})} style={secondaryBtn}>
<Navigation size={18}/> ХАРИТА
</button>
)}
<button onClick={() => { 
const fId = showFieldPassport.id.toString();
setShowFieldPassport(null);
handleFieldSelect(fId);
setShowReportModal(true);
}} style={{...loginBtn, flex:2}}>ҲИСОБОТ ҚЎШИШ</button>
</div>
</div>
</div>
)}

{navMenu.show && (
<div style={styles.modalOverlay} onClick={() => setNavMenu({show:false, lat:null, lon:null})}>
<div style={{...THEME.glass, width:'90%', maxWidth:'350px', padding:'20px', background:'#0a0f0a'}} onClick={e => e.stopPropagation()}>
<h3 style={{textAlign:'center', marginBottom:'20px', fontSize:'1.1rem'}}>Навигаторни танланг</h3>
<div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
<button onClick={() => openNavigation('yandex')} style={navOptionBtn}>Yandex Navigator</button>
<button onClick={() => openNavigation('google')} style={navOptionBtn}>Google Maps</button>
<button onClick={() => openNavigation('apple')} style={navOptionBtn}>Apple Maps (iOS)</button>
<button onClick={() => setNavMenu({show:false, lat:null, lon:null})} style={{...navOptionBtn, background:'none', color:THEME.danger}}>Бекор қилиш</button>
</div>
</div>
</div>
)}

{showReportModal && (
<div style={styles.modalOverlay}>
<div style={{...THEME.glass, width:'92%', maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', background:'rgba(10,15,10,0.95)'}}>
<div style={styles.modalHeader}><h3 style={{margin:0}}>Янги ҳисобот</h3><button onClick={() => setShowReportModal(false)} style={styles.closeBtn}><X size={20} /></button></div>
<div style={paddingContainer}>
<label style={styles.label}>🌳 Далани танланг</label>
<select style={styles.inputGlass} value={reportData.field_id} onChange={(e) => handleFieldSelect(e.target.value)}>
<option value="">Танланг...</option>
{myFields.map(f => <option key={f.id} value={f.id} style={{color:'#000'}}>{f.name} {f.location_center?.lat ? '📍' : '⚠️'}</option>)}
</select>
{reportData.field_id && (
<div style={{marginTop: '15px'}}>
{fieldMissingGPS ? (
<div style={warningBox}>
<p style={{fontSize:'0.85rem', marginBottom:'10px', color: THEME.warning, fontWeight:'bold', textAlign:'center'}}>⚠️ ДАЛА КООРДИНАТАСИ ЙЎҚ! <br/> АВВАЛ МАНЗИЛНИ САҚЛАНГ.</p>
{!reportData.lat ? (
<button onClick={getGeoLocation} style={{...smallActionBtn, width:'100%', background: THEME.warning, color: '#000', fontWeight:'bold'}}>{isLocating ? <Loader2 className="animate-spin" size={16}/> : <MapPin size={16}/>} GPSНИ АНИҚЛАШ</button>
) : (
<div>
<div style={coordsDisplay}><div style={coordItem}>Lat: {reportData.lat} | Lon: {reportData.lon}</div></div>
<button onClick={saveFieldLocation} style={{...smallActionBtn, marginTop:'10px', background: THEME.accent, color: '#000', fontWeight: '800', width: '100%'}}>✅ МАНЗИЛНИ БАЗАГА САҚЛАШ</button>
</div>
)}
</div>
) : (
<div style={{ animation: 'fadeIn 0.5s ease-out' }}>
{hasCoordinates && (<div style={{...coordsDisplay, borderColor: THEME.accent, background:'rgba(16, 185, 129, 0.05)', textAlign:'center'}}><div style={{fontSize:'0.75rem', color: THEME.accent, fontWeight:'bold'}}>📍 Координата боғланган</div></div>)}
<div style={{ marginTop:'20px' }}>
<label style={styles.label}>🛠️ Иш тури</label>
<div style={typeGrid}>
<TypeBtn active={reportData.type==='inspection'} icon={<Map size={18}/>} label="Кўрик" onClick={()=>setReportData({...reportData, type:'inspection'})}/>
<TypeBtn active={reportData.type==='watering'} icon={<Droplets size={18}/>} label="Суғориш" onClick={()=>setReportData({...reportData, type:'watering'})}/>
<TypeBtn active={reportData.type==='pest'} icon={<Bug size={18}/>} label="Зараркунанда" onClick={()=>setReportData({...reportData, type:'pest'})}/>
</div>
<label style={{...styles.label, marginTop:'20px', display:'block'}}>📸 Изоҳ ва Расм</label>
<div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
<label style={photoUploadCard}><input type="file" accept="image/*" capture="environment" hidden onChange={(e) => setReportData({...reportData, image: e.target.files[0]})} /><Camera size={24} color={reportData.image ? THEME.accent : THEME.textSecondary}/></label>
<textarea style={{...styles.inputGlass, flex:2, height:'100px', margin:0}} placeholder="Изоҳ..." value={reportData.note} onChange={e => setReportData({...reportData, note: e.target.value})} />
</div>
<button onClick={submitReport} style={loginBtn}>ҲИСОБОТНИ ЮБОРИШ</button>
</div>
</div>
)}
</div>
)}
</div>
</div>
</div>
)}
</div>
</div>
);
}

const PassportRow = ({ icon, label, value, isPhone }) => (
<div style={{display:'flex', alignItems:'center', gap:'12px', background:'rgba(255,255,255,0.04)', padding:'12px', borderRadius:'14px', border:'1px solid rgba(255,255,255,0.06)'}}>
<div style={{color:THEME.accent}}>{icon}</div>
<div style={{flex:1}}>
<div style={{fontSize:'0.7rem', color:THEME.textSecondary, textTransform:'uppercase'}}>{label}</div>
{isPhone ? (
<a href={`tel:${value}`} style={{fontSize:'1rem', color:'#fff', textDecoration:'none', fontWeight:'600'}}>{value}</a>
) : (
<div style={{fontSize:'1rem', color:'#fff', fontWeight:'600'}}>{value}</div>
)}
</div>
</div>
);

const PassportMiniCard = ({ icon, label, value }) => (
<div style={{...THEME.glass, borderRadius:'20px', padding:'15px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
<div style={{color: THEME.accent}}>{icon}</div>
<div style={{fontSize:'0.7rem', color: THEME.textSecondary}}>{label}</div>
<div style={{fontSize:'0.9rem', fontWeight:'700'}}>{value}</div>
</div>
);

const NavBtn = ({ active, icon, onClick }) => (
<button onClick={onClick} style={{ background:'none', border:'none', padding:'12px', color: active ? THEME.accent : 'rgba(255,255,255,0.4)', transition: 'all 0.3s ease', transform: active ? 'scale(1.2)' : 'scale(1)', cursor:'pointer' }}>{icon}</button>
);
const TypeBtn = ({ active, icon, label, onClick }) => (
<div onClick={onClick} style={{ padding:'12px 5px', borderRadius:'12px', textAlign:'center', flex:1, background: active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${active ? THEME.accent : 'rgba(255,255,255,0.1)'}`, color: active ? THEME.accent : THEME.textSecondary, cursor:'pointer' }}>{icon}<div style={{fontSize:'0.65rem', marginTop:'4px'}}>{label}</div></div>
);
const InventoryView = ({ inventory }) => (
<div style={{paddingTop: '10px'}}><h2 style={styles.sectionTitle}>Омбор</h2><div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>{inventory.map(i => (<div key={i.id} style={{...THEME.glass, padding:'20px'}}><div style={{fontSize:'0.85rem', color: THEME.textSecondary, marginBottom:'8px'}}>{i.item_name}</div><div style={{fontSize:'1.4rem', fontWeight:'800', color:THEME.accent}}>{i.quantity} {i.unit}</div></div>))}</div></div>
);

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
modalOverlay: { position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', backdropFilter:'blur(12px)', zIndex:2000, display:'flex', alignItems:'flex-end', justifyContent:'center' },
modalHeader: { padding:'20px', borderBottom:'1px solid rgba(255,255,255,0.1)', display:'flex', justifyContent:'space-between', alignItems:'center' },
closeBtn: { background:'rgba(255,255,255,0.1)', border:'none', color:'#fff', width:'36px', height:'36px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' },
inputGlass: { width:'100%', padding:'16px', borderRadius:'14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', outline:'none' },
label: { display:'block', color: THEME.textSecondary, fontSize:'0.85rem', marginBottom:'10px' }
};

const bottomSheetContainer = {
...THEME.glass,
width: '100%',
maxWidth: '500px',
borderBottomLeftRadius: 0,
borderBottomRightRadius: 0,
background: 'rgba(10, 20, 15, 0.95)',
padding: '25px',
paddingTop: '12px',
maxHeight: '90vh',
overflowY: 'auto'
};

const dragHandle = { width:'40px', height:'4px', background:'rgba(255,255,255,0.2)', borderRadius:'2px', margin:'0 auto 15px' };
const secondaryBtn = { flex:1, padding:'16px', borderRadius:'18px', background:'rgba(255,255,255,0.1)', color:'#fff', border:'1px solid rgba(255,255,255,0.1)', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' };
const filterBtn = { padding:'8px 16px', borderRadius:'12px', border:'none', fontSize:'0.85rem', fontWeight:'600', whiteSpace:'nowrap', transition:'0.3s' };
const navButtonStyle = { background: 'rgba(16, 185, 129, 0.15)', border: `1px solid ${THEME.accent}55`, color: THEME.accent, padding: '4px 8px', borderRadius: '8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: '600' };
const navOptionBtn = { width:'100%', padding:'15px', borderRadius:'12px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', fontSize:'1rem', fontWeight:'600', cursor:'pointer' };
const paddingContainer = { padding:'20px', overflowY:'auto' };
const coordsDisplay = { background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '12px', marginBottom: '15px', border: '1px solid rgba(255,255,255,0.05)' };
const coordItem = { fontSize: '0.8rem', color: THEME.textSecondary, fontFamily: 'monospace' };
const mainAppContainer = { height: '100vh', width: '100vw', backgroundColor: '#05110a', backgroundImage: `radial-gradient(circle at top right, #064e3b 0%, #05110a 100%)`, color: THEME.text, overflowY: 'auto', WebkitOverflowScrolling: 'touch' };
const warningBox = { background: 'rgba(245, 158, 11, 0.15)', border: `1px solid ${THEME.warning}88`, padding: '20px', borderRadius: '20px', marginTop: '15px' };
const smallActionBtn = { flex: 1, padding: '15px', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', cursor:'pointer' };
const badgeStyle = { display:'flex', alignItems:'center', gap:'4px', padding:'4px 8px', borderRadius:'8px', background:'rgba(255,255,255,0.1)', fontSize:'0.7rem', fontWeight:'600' };
const progressContainer = { marginBottom:'30px', background:'rgba(255,255,255,0.03)', padding:'15px', borderRadius:'20px', border:'1px solid rgba(255,255,255,0.05)' };
const progressBarBg = { height:'8px', width:'100%', background:'rgba(255,255,255,0.1)', borderRadius:'10px', overflow:'hidden' };
const progressBarFill = { height:'100%', background: THEME.accentGradient, borderRadius:'10px', transition: 'width 0.5s ease' };
const loginOverlay = { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#05110a' };
const inputWrapper = { position: 'relative', marginBottom: '15px' };
const inputIcon = { position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', zIndex: 10 };
const loginInput = { width: '100%', padding: '18px 18px 18px 50px', borderRadius: '18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline:'none' };
const loginBtn = { width: '100%', padding: '18px', borderRadius: '18px', background: THEME.accentGradient, color: '#000', fontWeight: '800', border: 'none', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center' };
const typeGrid = { display:'flex', gap:'8px' };
const photoUploadCard = { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.05)', borderRadius:'12px', border:`1px dashed rgba(255,255,255,0.2)`, cursor:'pointer' };