"use client";

import { useState, useEffect } from 'react';
import { isConnected, requestAccess, getPublicKey } from '@stellar/freighter-api';
import { NotesContractClient } from '../lib/contrat';
import { useSelector, useDispatch, useStore } from 'react-redux';
import { AppDispatch } from '../lib/store';
import { setIsTxPending, setIsNotesLoading } from '../lib/uiSlice';

// Freighter window tipini tanımla
declare global {
  interface Window {
    freighter?: any;
  }
}

// Kontrat notunun tipi
interface ContractNote {
  id: number;
  owner: string;
  title: string;
  ipfs_hash: string;
  timestamp: number;
  is_active: boolean;
}

// Client tarafındaki not tipi
interface Note {
  id: string;
  title: string;
  content: string;
  ipfsHash: string;
  timestamp: number;
}

// Yerel test ağı için sabit bir test hesabı kullanıyoruz
const TEST_PUBLIC_KEY = null; // Bu değeri soroban CLI'dan alacağız

export default function NotesApp() {
  const dispatch = useDispatch<AppDispatch>();
  // Fix: useSelector typing issue workaround
  // Instead of passing RootState, use the default selector and cast state
  const isTxPending = useSelector((state: any) => state.ui.isTxPending);
  const isNotesLoading = useSelector((state: any) => state.ui.isNotesLoading);

  const [publicKey, setPublicKey] = useState<string | null>(TEST_PUBLIC_KEY);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState({ title: "", content: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false); // Bağlanırken buton disable ve spinner
  const [errorMsg, setErrorMsg] = useState<string | null>(null); // Hata pop-up'ı için
  const [isCheckingWallet, setIsCheckingWallet] = useState(true); // Cüzdan bağlantısı kontrol ediliyor state'i
  const [notesError, setNotesError] = useState<string | null>(null); // Notlar yüklenirken hata
  const [notesRejected, setNotesRejected] = useState(false); // Not getirme reddedildi mi?

  // Sadece bağlantı durumunu kontrol et, otomatik bağlantı/izin isteme
  useEffect(() => {
    const checkFreighterConnection = async () => {
      if (typeof window === 'undefined') return;
      try {
        const connected = await isConnected();
        if (connected) {
          const walletKey = await getPublicKey();
          if (walletKey) {
            setPublicKey(walletKey);
          }
        }
      } catch (error) {
        console.error("Cüzdan bağlantı kontrol hatası:", error);
        setErrorMsg("Cüzdan bağlantı kontrolü sırasında bir hata oluştu!");
      } finally {
        setIsCheckingWallet(false); // Kontrol tamamlandı
      }
    };
    checkFreighterConnection();
  }, []);

  // Cüzdan bağlama butonu
  const handleConnectWallet = async () => {
    setIsConnecting(true);
    dispatch(setIsTxPending(true)); // İşlem onayı bekleniyor spinner'ı başlasın
    try {
      const connected = await isConnected();
      if (!connected) {
        setErrorMsg("Lütfen Freighter cüzdanını yükleyin!");
        setIsConnecting(false);
        dispatch(setIsTxPending(false));
        return;
      }
      let hasPermission = false;
      let walletKey = null;
      try {
        const accessResult = await requestAccess();
        hasPermission =
          String(accessResult) === "true" ||
          (typeof accessResult === "string" && /^G[A-Z2-7]{55}$/.test(accessResult));
        if (hasPermission) {
          walletKey = typeof accessResult === "string" && accessResult.startsWith("G") ? accessResult : await getPublicKey();
        }
      } catch (err: any) {
        // Hata mesajını string olarak al
        const msg = (typeof err === "string" ? err : err?.message || "").toLowerCase();
        if (msg.includes("the user rejected this request")) {
          setErrorMsg("Cüzdan bağlantısını iptal ettiniz.");
        } else if (
          msg.includes("user closed") ||
          msg.includes("cancel") ||
          msg.includes("denied") ||
          msg.includes("rejected") ||
          msg.includes("window closed")
        ) {
          setErrorMsg("Cüzdan bağlantısı iptal edildi.");
        } else if (msg.includes("unable to send message to extension")) {
          setErrorMsg("Freighter uzantısına erişilemiyor. Lütfen uzantının yüklü ve aktif olduğundan emin olun.");
        } else {
          setErrorMsg("Cüzdan bağlantısı sırasında bir hata oluştu!");
        }
        setIsConnecting(false);
        dispatch(setIsTxPending(false));
        return;
      }
      if (hasPermission && walletKey) {
        setPublicKey(walletKey);
        dispatch(setIsTxPending(false)); // Onay bitti, spinner kapat
        dispatch(setIsNotesLoading(true)); // Notlar yükleniyor spinner'ı başlat
        await loadNotes(walletKey);
        dispatch(setIsNotesLoading(false)); // Notlar yükleniyor spinner'ı kapat
      } else {
        setErrorMsg("Cüzdan bağlantısı iptal edildi veya onay verilmedi.");
        dispatch(setIsTxPending(false));
      }
    } catch (error) {
      setErrorMsg("Cüzdan bağlantısı sırasında bir hata oluştu!");
      dispatch(setIsTxPending(false));
    } finally {
      setIsConnecting(false);
    }
  };

  // publicKey değiştiğinde notları yükle (ilk açılışta otomatik bağlantı için)
  useEffect(() => {
    // Sadece sayfa ilk açılışında, otomatik bağlı cüzdan varsa notları yükle
    if (publicKey && !isNotesLoading && !isTxPending && !isConnecting && !errorMsg) {
      dispatch(setIsNotesLoading(true));
      loadNotes(publicKey).then(() => dispatch(setIsNotesLoading(false))); // Notlar yükleniyor spinner'ı kapat
    }
  }, [publicKey]);

  // Notları yükle (mock data - gerçek uygulamada blockchain'den gelecek)
  const loadNotes = async (address: string) => {
    dispatch(setIsNotesLoading(false));
    dispatch(setIsTxPending(true));
    setNotesError(null);
    setNotesRejected(false);
    let didUserReject = false;
    let didLoadNotes = false;
    console.log('[loadNotes] ÇAĞRILDI, adres:', address);
    try {
      if (!address || typeof address !== 'string' || !address.startsWith('G')) {
        console.error('[loadNotes] HATALI ADRES:', address);
        alert('Cüzdan adresiniz geçersiz!');
        dispatch(setIsNotesLoading(false));
        return;
      }
      const notesContract = new NotesContractClient();
      // Transaction başlatıldı, kullanıcıya spinner göster
      dispatch(setIsNotesLoading(true)); // Onay verildiğinde loading başlasın
      let result;
      try {
        console.log('[loadNotes] getUserNotes çağrılıyor...');
        result = await notesContract.getUserNotes(address);
        // İşlem onayı spinner'ı kapat
        dispatch(setIsTxPending(false));
        // Notlar yükleniyor spinner'ı aç
        dispatch(setIsNotesLoading(true));
        console.log('[loadNotes] getUserNotes döndü:', result);
        didLoadNotes = true;
      } catch (err: any) {
        dispatch(setIsTxPending(false));
        dispatch(setIsNotesLoading(false));
        let errMsg = '';
        if (typeof err === 'string') {
          errMsg = err;
        } else if (err && typeof err.message === 'string') {
          errMsg = err.message;
        }
        if (errMsg.toLowerCase().includes('the user rejected this request')) {
          setNotesRejected(true);
          setNotesError(null);
          setNotes([]);
          didUserReject = true;
          console.warn('[loadNotes] Kullanıcı not getirme isteğini REDDETTİ.');
          return;
        } else {
          setNotesError('Notlar yüklenirken bir hata oluştu.');
          setNotes([]);
          console.error('[loadNotes] getUserNotes bilinmeyen hata:', errMsg);
        }
        return;
      }
      if (didUserReject) {
        return;
      }
      // Yeni sözlük yapısına göre kontrol
      if (!result || typeof result !== 'object') {
        setNotesError('Notlar yüklenirken bir hata oluştu.');
        setNotes([]);
        return;
      }
      if (result.error) {
        const msg = (result.message || '').toLowerCase();
        if (msg.includes('the user rejected this request')) {
          setNotesRejected(true);
          setNotesError(null);
          setNotes([]);
          console.warn('[loadNotes] Kullanıcı not getirme isteğini REDDETTİ. (error)');
          return;
        } else {
          setNotesError(result.message || 'Notlar yüklenirken bir hata oluştu.');
          setNotes([]);
          return;
        }
      }
      if (!didLoadNotes || !Array.isArray(result.notes)) {
        setNotes([]);
        return;
      }
      console.log('[loadNotes] Notlar başarıyla yüklendi:', result.notes);
      const clientNotes = result.notes.map((note: ContractNote) => ({
        id: note.id.toString(),
        title: note.title,
        content: note.ipfs_hash,
        ipfsHash: note.ipfs_hash,
        timestamp: Number(note.timestamp) * 1000
      })).sort((a, b) => b.timestamp - a.timestamp);
      setNotes(clientNotes);
    } catch (error: any) {
      dispatch(setIsTxPending(false));
      dispatch(setIsNotesLoading(false));
      console.error('[loadNotes] CATCH BLOĞU HATA:', error);
      let errMsg = '';
      if (typeof error === 'string') {
        errMsg = error;
      } else if (error && typeof error.message === 'string') {
        errMsg = error.message;
      }
      if (errMsg.toLowerCase().includes('the user rejected this request')) {
        setNotesRejected(true);
        setNotesError(null);
        setNotes([]);
        console.warn('[loadNotes] Kullanıcı not getirme isteğini REDDETTİ. (catch)');
        return;
      } else {
        setNotesError('Notlar yüklenirken bir hata oluştu.');
        setNotes([]);
        console.error('[loadNotes] catch bilinmeyen hata:', errMsg);
      }
    } finally {
      dispatch(setIsNotesLoading(false));
      console.log('[loadNotes] BİTTİ, loading kapatıldı.');
    }
  };

  // Yeni not oluştur
  const handleCreateNote = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) {
      alert("Başlık ve içerik gerekli!");
      return;
    }

    if (!publicKey) {
      alert("Cüzdan bağlı değil!");
      return;
    }

    setIsCreating(true);
    dispatch(setIsTxPending(true)); // İşlem başlarken spinner başlath
    try {
      const notesContract = new NotesContractClient();
      const noteId = await notesContract.createNote(
        publicKey, 
        newNote.title, 
        newNote.content
      );
      console.log("Not oluşturuldu, ID:", noteId);

      setNewNote({ title: "", content: "" });
      setShowCreateForm(false);
      
      alert("Not başarıyla blockchain'e kaydedildi!");
      // Notlar yüklenirken loading spinner gösterilsin
      await loadNotes(publicKey);
    } catch (error) {
      console.error("Not oluşturma hatası:", error);
      alert("Not oluşturulurken hata oluştu!");
    } finally {
      setIsCreating(false);
      dispatch(setIsTxPending(false)); // İşlem bittiğinde spinner kapat
    }
  };

  // Tarih formatla
  const formatDate = (timestamp: number) => {
    // Timestamp zaten milisaniye cinsinden
    const date = new Date(timestamp);
    return date.toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (isCheckingWallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 max-w-md w-full text-center flex flex-col items-center justify-center">
          <svg className="w-10 h-10 text-white animate-spin mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <h2 className="text-xl font-semibold text-white mb-2">Cüzdan bağlantısı kontrol ediliyor...</h2>
          <p className="text-gray-300">Lütfen bekleyin.</p>
        </div>
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mx-auto mb-6 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Stellar Notes</h1>
            <p className="text-gray-300 mb-8">Blockchain tabanlı güvenli not tutma uygulaması</p>
            <button
              onClick = {handleConnectWallet}
              disabled={isConnecting}
              className={`w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg ${isConnecting ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {isConnecting ? (
                <>
                  <svg className="w-5 h-5 inline mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Bağlanıyor...
                </>
              ) : (
                "Freighter Cüzdanını Bağla"
              )}
            </button>
          </div>
          {/* Hata pop-up */}
          {errorMsg && (
            <div className="mt-6 bg-red-500/90 text-white rounded-xl px-4 py-3 shadow-lg animate-fade-in">
              <div className="flex items-center justify-between">
                <span>{errorMsg}</span>
                <button onClick={() => setErrorMsg(null)} className="ml-4 text-white/80 hover:text-white font-bold">&times;</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Stellar Notes</h1>
              <p className="text-gray-300 text-sm">
                Bağlı: {publicKey.substring(0, 8)}...{publicKey.substring(publicKey.length - 8)}
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Yeni Not
            </button>
          </div>
        </div>

        {/* Not Oluşturma Formu */}
        {showCreateForm && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Yeni Not Oluştur</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Not başlığı..."
                value={newNote.title}
                onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <textarea
                placeholder="Not içeriği..."
                value={newNote.content}
                onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
                className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleCreateNote}
                  disabled={isCreating}
                  className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:transform-none disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <>
                      <svg className="w-5 h-5 inline mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Kaydediliyor...
                    </>
                  ) : (
                    "Kaydet"
                  )}
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all duration-300"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notlar Listesi */}
        <div className="space-y-4">
          {isTxPending ? (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 shadow-2xl border border-white/20 text-center flex flex-col items-center justify-center">
              <svg className="w-10 h-10 text-white animate-spin mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <h3 className="text-xl font-semibold text-white mb-2">İşlem onayı bekleniyor...</h3>
              <p className="text-gray-300">Lütfen cüzdanınızda işlemi onaylayın.</p>
            </div>
          ) : isNotesLoading ? (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 shadow-2xl border border-white/20 text-center flex flex-col items-center justify-center">
              <svg className="w-10 h-10 text-white animate-spin mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <h3 className="text-xl font-semibold text-white mb-2">Notlar yükleniyor...</h3>
              <p className="text-gray-300">Blockchain'den notlarınız getiriliyor.</p>
            </div>
          ) : notesRejected ? (
            <div className="bg-yellow-500/80 text-white rounded-2xl p-8 shadow-2xl border border-white/20 text-center flex flex-col items-center justify-center">
              <svg className="w-10 h-10 text-white mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <h3 className="text-xl font-semibold mb-2">Not getirme reddedildi</h3>
              <p className="text-white/80 mb-4">Notlarınızı görüntülemek için cüzdanınızda onay vermelisiniz.</p>
              <button
                onClick={() => {
                  setNotesRejected(false);
                  dispatch(setIsNotesLoading(true));
                  loadNotes(publicKey!).then(() => dispatch(setIsNotesLoading(false)));
                }}
                className="mt-2 bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-6 rounded-xl transition-all duration-300 shadow-lg"
              >
                Yenile
              </button>
            </div>
          ) : notesError ? (
            <div className="bg-red-500/80 text-white rounded-2xl p-8 shadow-2xl border border-white/20 text-center flex flex-col items-center justify-center">
              <svg className="w-10 h-10 text-white mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <h3 className="text-xl font-semibold mb-2">{notesError}</h3>
            </div>
          ) : notes.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 shadow-2xl border border-white/20 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Henüz not yok</h3>
              <p className="text-gray-300">İlk notunuzu oluşturmak için "Yeni Not" butonuna tıklayın.</p>
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">{note.title}</h3>
                  <span className="text-xs text-gray-300 bg-white/20 px-2 py-1 rounded-full">
                    {formatDate(note.timestamp)}
                  </span>
                </div>
                <p className="text-gray-200 mb-4 leading-relaxed">{note.content}</p>
                <div className="flex items-center justify-end text-xs text-gray-400">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    Blockchain'de kaydedildi
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}