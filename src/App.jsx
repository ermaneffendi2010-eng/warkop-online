import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Coffee, Save, History, Settings, DollarSign, ShoppingCart, X, Minus, AlertCircle, Sparkles, CheckCircle, Cloud, Search, User, Calendar, Filter } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, getDocs, writeBatch } from 'firebase/firestore';

// ============================================================================
// --- PERHATIAN PENTING UNTUK IBU (SAAT DI LAPTOP) ---
//
// Kode baris ke-16 di bawah ini (const firebaseConfig...) HANYA UNTUK PREVIEW DISINI.
// Saat Ibu menyalin kode ini ke VS Code (Laptop):
// 1. HAPUS baris kode: const firebaseConfig = JSON.parse(__firebase_config);
// 2. GANTI dengan Kunci Rahasia Ibu dari Notepad.
//
// Jadinya nanti di laptop harus seperti ini:
// const firebaseConfig = {
//   apiKey: "AIzaSy...",
//   authDomain: "...",
//   ...
// };
// ============================================================================

const firebaseConfig = {
  apiKey: "AIzaSyD_1Pv8MZZS-S_semsaa7sn8U8zg5xhs6k",
  authDomain: "warkop-mily-96-news.firebaseapp.com",
  projectId: "warkop-mily-96-news",
  storageBucket: "warkop-mily-96-news.firebasestorage.app",
  messagingSenderId: "638234491375",
  appId: "1:638234491375:web:cb89a8d50bbf5a8f8e1e1a",
  measurementId: "G-LL27VNFXY5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'warkop-mily-96';

// --- FORMAT RUPIAH ---
const formatRupiah = (number) => {
  if (isNaN(number) || number === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(number);
};

const defaultMenuData = [
  { name: 'Kopi Hitam', price: 5000, category: 'Minuman' },
  { name: 'Kopi Susu', price: 7000, category: 'Minuman' },
  { name: 'Teh Manis', price: 4000, category: 'Minuman' },
  { name: 'Nasi Gurih', price: 10000, category: 'Makanan' },
  { name: 'Lontong Sayur', price: 10000, category: 'Makanan' },
  { name: 'Mie Rebus', price: 12000, category: 'Makanan' },
  { name: 'Indomie Goreng Telur', price: 12000, category: 'Makanan' },
  { name: 'Kentang Goreng', price: 10000, category: 'Snack' },
  { name: 'Roti Bakar', price: 10000, category: 'Snack' },
  { name: 'Gorengan (3pcs)', price: 5000, category: 'Snack' },
  { name: 'Jus Jeruk', price: 10000, category: 'Jus' },
  { name: 'Jus Alpukat', price: 10000, category: 'Jus' },
  { name: 'Jus Mangga', price: 10000, category: 'Jus' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('kasir');
  const [cart, setCart] = useState([]);
  const [menu, setMenu] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Input States
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Minuman');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  
  // UI States
  const [notification, setNotification] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  
  // Date Filter
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  const isFormValid = newItemName.trim() !== '' && newItemPrice !== '';

  // 1. AUTHENTICATION
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. DATA SYNC
  useEffect(() => {
    if (!user) return;

    // Menu Listener
    const unsubMenu = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'menu'), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setMenu(items);
      setLoading(false);
    });

    // Transaction Listener
    const unsubTrans = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setTransactions(items);
    });

    return () => { unsubMenu(); unsubTrans(); };
  }, [user]);

  // Actions
  const showNotification = (msg, type = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLoadDefaultMenu = async () => {
    if (!user) return;
    const batch = writeBatch(db);
    const ref = collection(db, 'artifacts', appId, 'public', 'data', 'menu');
    defaultMenuData.forEach(item => batch.set(doc(ref), item));
    await batch.commit();
    showNotification('Menu standar dimuat!');
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const total = cart.reduce((a, b) => a + (b.price * b.qty), 0);
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), {
      date: new Date().toISOString(),
      items: cart,
      total,
      userId: user.uid,
      customerName: customerName || 'Tanpa Nama'
    });
    setCart([]);
    setCustomerName('');
    showNotification('Transaksi tersimpan!');
  };

  const handleAddMenu = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'menu'), {
      name: newItemName,
      price: parseInt(newItemPrice) || 0,
      category: newItemCategory
    });
    setNewItemName(''); setNewItemPrice('');
    showNotification('Menu tersimpan!');
  };

  const executeDeleteMenu = async () => {
    if (deleteConfirmation) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'menu', deleteConfirmation.id));
      setDeleteConfirmation(null);
      showNotification('Menu dihapus.');
    }
  };

  const handleClearTransactions = async () => {
    if (confirm('Hapus semua data?')) {
      transactions.forEach(t => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', t.id)));
      showNotification('Data dihapus.', 'error');
    }
  };

  // Logic
  const addToCart = (item) => {
    const exist = cart.find(i => i.id === item.id);
    if (exist) setCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
    else setCart([...cart, { ...item, qty: 1 }]);
  };
  
  const updateQty = (id, d) => setCart(cart.map(i => (i.id === id ? { ...i, qty: i.qty + d } : i)));
  const removeFromCart = (id) => setCart(cart.filter(i => i.id !== id));
  
  const menuByCategory = useMemo(() => {
    const groups = { 'Minuman': [], 'Makanan': [], 'Jus': [], 'Snack': [] };
    menu.filter(i => (i.name||'').toLowerCase().includes(searchQuery.toLowerCase())).forEach(i => {
      const c = i.category || 'Lainnya';
      if (!groups[c]) groups[c] = [];
      groups[c].push(i);
    });
    return groups;
  }, [menu, searchQuery]);

  const filteredTrans = useMemo(() => {
    if (!selectedDate) return transactions;
    return transactions.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      const y = d.getFullYear();
      const m = String(d.getMonth()+1).padStart(2,'0');
      const day = String(d.getDate()).padStart(2,'0');
      return `${y}-${m}-${day}` === selectedDate;
    });
  }, [transactions, selectedDate]);

  const totalCart = cart.reduce((a, b) => a + (b.price * b.qty), 0);
  const todayIncome = transactions.filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((a, b) => a + (b.total || 0), 0);

  // Fungsi Helper untuk Filter
  const handleSetDate = (date) => {
    setSelectedDate(date);
    if (!date) {
        showNotification("Menampilkan SEMUA Riwayat", "success");
    } else {
        const d = new Date(date);
        showNotification(`Menampilkan data tgl: ${d.toLocaleDateString('id-ID')}`, "success");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-violet-600 animate-pulse font-bold">Menghubungkan ke Server...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 relative pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-800 via-purple-700 to-indigo-800 text-white p-4 shadow-lg sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-fuchsia-200" />
          <div><h1 className="text-xl font-bold">Warkop Mily 96</h1><div className="text-[10px] text-emerald-300 flex gap-1 items-center"><div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/>Online</div></div>
        </div>
        <div className="text-right"><span className="text-[10px] text-violet-200 block">Omzet Hari Ini</span><span className="font-bold">{formatRupiah(todayIncome)}</span></div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg text-white font-bold text-sm flex gap-2 items-center border border-white/20 backdrop-blur-md ${notification.type==='success'?'bg-gradient-to-r from-violet-600 to-fuchsia-600':'bg-rose-500'}`}>
          {notification.type==='success' ? <CheckCircle size={16} className="text-violet-100"/> : <AlertCircle size={16}/>}
          {notification.message}
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4">
        {activeTab === 'kasir' && (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative mb-4">
                <input type="text" placeholder="Cari menu..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="w-full pl-9 p-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none"/>
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
              </div>
              
              {/* Empty State Modern (Slate + Dashed) */}
              {menu.length===0 && (
                <div className="text-center p-8 bg-slate-50 rounded-xl border-dashed border-2 border-slate-300">
                  <div className="flex justify-center mb-2"><Cloud className="w-8 h-8 text-slate-300"/></div>
                  <p className="text-slate-500 mb-3 text-sm">Belum ada data menu tersimpan</p>
                  <button onClick={handleLoadDefaultMenu} className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-violet-700">Muat Menu Standar</button>
                </div>
              )}

              {['Minuman','Makanan','Jus','Snack'].map(cat => {
                const items = menuByCategory[cat] || [];
                if(items.length===0) return null;
                return (
                  <div key={cat} className="mb-4">
                    <h3 className="text-xs font-bold text-violet-500 uppercase mb-2 tracking-wider">{cat}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {items.map(i => (
                        <button key={i.id} onClick={()=>addToCart(i)} className="bg-white p-3 rounded-xl border border-slate-100 hover:border-violet-300 text-left shadow-sm active:scale-95 transition">
                          <div className="font-bold text-sm text-slate-700">{i.name}</div>
                          <div className="text-xs text-violet-500 font-medium">{formatRupiah(i.price)}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Cart */}
            <div className="bg-white p-4 rounded-xl shadow-lg border border-violet-100 h-fit sticky top-20">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="font-bold flex gap-2 items-center text-violet-900"><ShoppingCart size={18}/> Pesanan</h2>
                {cart.length>0 && <button onClick={()=>setCart([])} className="text-xs text-rose-500 bg-rose-50 px-2 py-1 rounded">Batal</button>}
              </div>
              {cart.length===0 ? <div className="text-center text-slate-400 text-sm py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">Keranjang Kosong</div> : (
                <>
                  <div className="mb-3">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Pelanggan</label>
                    <div className="relative">
                      <User size={14} className="absolute left-2.5 top-2.5 text-slate-400"/>
                      <input type="text" placeholder="Meja..." value={customerName} onChange={e=>setCustomerName(e.target.value)} className="w-full pl-8 p-2 text-sm border rounded-lg bg-slate-50 focus:ring-1 focus:ring-violet-500 outline-none"/>
                    </div>
                  </div>
                  <div className="flex justify-between font-bold text-lg mb-3 text-slate-800 border-t pt-2"><span>Total</span><span className="text-violet-700">{formatRupiah(totalCart)}</span></div>
                  <button onClick={handleCheckout} className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-bold shadow-md active:scale-95 transition mb-4 flex justify-center items-center gap-2">
                    <CheckCircle size={16}/> BAYAR SEKARANG
                  </button>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {cart.map(i => (
                      <div key={i.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div className="flex-1"><div className="text-sm font-bold text-slate-700">{i.name}</div><div className="text-xs text-violet-500">{formatRupiah(i.price)}</div></div>
                        <div className="flex items-center gap-1 bg-white p-1 rounded border border-slate-200">
                          <button onClick={()=>updateQty(i.id,-1)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><Minus size={10}/></button>
                          <span className="text-xs font-bold w-4 text-center">{i.qty}</span>
                          <button onClick={()=>updateQty(i.id,1)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><Plus size={10}/></button>
                        </div>
                        <button onClick={()=>removeFromCart(i.id)} className="text-rose-400 hover:text-rose-600 ml-1"><X size={16}/></button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'laporan' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-xl border-l-4 border-violet-500 shadow-sm">
                <div className="text-xs text-slate-500 uppercase font-bold">Omzet (Hari Ini)</div>
                <div className="text-xl font-bold text-violet-600">{formatRupiah(todayIncome)}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border-l-4 border-emerald-500 shadow-sm">
                <div className="text-xs text-slate-500 uppercase font-bold">Total (Semua)</div>
                <div className="text-xl font-bold text-emerald-600">{formatRupiah(getAllTimeIncome)}</div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-3">
                <h2 className="font-bold flex gap-2 items-center text-slate-700"><History size={18}/> Riwayat</h2>
                <div className="flex gap-2 w-full md:w-auto">
                  <input type="date" value={selectedDate} onChange={e=>handleSetDate(e.target.value)} className="text-xs border rounded-lg p-2 flex-1 focus:ring-2 focus:ring-violet-500 outline-none"/>
                  <button onClick={()=>handleSetDate('')} className={`text-xs px-3 py-2 rounded-lg font-medium transition ${!selectedDate ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Semua</button>
                </div>
              </div>
              
              {/* Feedback Visual: Sedang menampilkan apa? */}
              <div className="text-xs text-slate-500 mb-2 font-medium flex items-center gap-1">
                 <Filter size={12} />
                 {selectedDate 
                    ? `Menampilkan: ${new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}` 
                    : 'Menampilkan: Seluruh Riwayat Transaksi'}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase"><tr><th className="p-3 rounded-tl-lg">Waktu</th><th className="p-3">Pelanggan</th><th className="p-3">Item</th><th className="p-3 text-right rounded-tr-lg">Total</th></tr></thead>
                  <tbody>
                    {filteredTrans.length===0 ? <tr><td colSpan="4" className="p-6 text-center text-slate-400">Tidak ada data</td></tr> : filteredTrans.map(t => (
                      <tr key={t.id} className="border-b hover:bg-slate-50 transition">
                        <td className="p-3 text-slate-500">{new Date(t.date).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'})}</td>
                        <td className="p-3 font-bold text-violet-600">{t.customerName || '-'}</td>
                        <td className="p-3 text-slate-600">{t.items.map(i=>`${i.name}(${i.qty})`).join(', ')}</td>
                        <td className="p-3 text-right font-bold text-slate-700">{formatRupiah(t.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end pt-2 border-t"><button onClick={handleClearTransactions} className="text-xs text-rose-500 hover:text-rose-700 flex gap-1 items-center font-medium"><Trash2 size={14}/> Reset Data</button></div>
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm">
              <h2 className="font-bold mb-4 flex gap-2 items-center text-violet-900"><Plus size={18}/> Tambah Menu</h2>
              <form onSubmit={handleAddMenu} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Nama</label>
                  <input required type="text" value={newItemName} onChange={e=>setNewItemName(e.target.value)} className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Harga</label>
                    <input required type="number" value={newItemPrice} onChange={e=>setNewItemPrice(e.target.value)} className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Kategori</label>
                    <select value={newItemCategory} onChange={e=>setNewItemCategory(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-500 outline-none">
                      <option>Minuman</option><option>Makanan</option><option>Jus</option><option>Snack</option>
                    </select>
                  </div>
                </div>
                <button type="submit" disabled={!isFormValid} className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-lg font-bold text-sm shadow active:scale-95 transition">SIMPAN MENU</button>
              </form>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm max-h-[400px] overflow-y-auto">
              <h2 className="font-bold mb-3 text-slate-700">Daftar Menu</h2>
              <div className="space-y-2">
                {menu.map(i => (
                  <div key={i.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50 transition group">
                    <div><div className="font-bold text-sm text-slate-700 group-hover:text-violet-700">{i.name}</div><div className="text-xs text-violet-500 font-medium">{formatRupiah(i.price)}</div></div>
                    <button onClick={()=>setDeleteConfirmation(i)} className="text-slate-300 hover:text-rose-500 transition"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white p-6 rounded-2xl w-full max-w-xs text-center shadow-2xl">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3"><Trash2 className="text-rose-500"/></div>
            <h3 className="font-bold text-lg mb-1 text-slate-800">Hapus Menu?</h3>
            <p className="text-sm text-slate-500 mb-4">Anda yakin ingin menghapus <b>{deleteConfirmation.name}</b>?</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={()=>setDeleteConfirmation(null)} className="py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-600 transition">Batal</button>
              <button onClick={executeDeleteMenu} className="py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold shadow-md transition">Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <div className="fixed bottom-0 w-full bg-white/90 backdrop-blur-md border-t flex justify-around p-3 pb-safe z-40 shadow-lg">
        <button onClick={()=>setActiveTab('kasir')} className={`flex flex-col items-center gap-1 transition ${activeTab==='kasir'?'text-violet-600':'text-slate-400 hover:text-slate-600'}`}><DollarSign size={24}/><span className="text-[10px] font-bold">KASIR</span></button>
        <button onClick={()=>setActiveTab('laporan')} className={`flex flex-col items-center gap-1 transition ${activeTab==='laporan'?'text-violet-600':'text-slate-400 hover:text-slate-600'}`}><History size={24}/><span className="text-[10px] font-bold">LAPORAN</span></button>
        <button onClick={()=>setActiveTab('menu')} className={`flex flex-col items-center gap-1 transition ${activeTab==='menu'?'text-violet-600':'text-slate-400 hover:text-slate-600'}`}><Settings size={24}/><span className="text-[10px] font-bold">MENU</span></button>
      </div>
    </div>
  );
}