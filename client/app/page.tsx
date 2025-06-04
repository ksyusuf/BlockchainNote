"use client";

import { useState, useEffect } from 'react';
import { NotesContractClient } from '../lib/contrat';
import { useSelector, useDispatch } from 'react-redux';
import { setIsTxPending, setIsNotesLoading } from '../lib/uiSlice';
import { connectWallet, checkWalletConnection } from '../lib/wallet';
import { useRouter } from 'next/navigation';
import NewNote from '../components/NewNote';
import { store } from '../lib/store';

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

export default function Home() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { address, isConnected, isConnecting, error: walletError } = useSelector((state: any) => state.wallet);
  const isTxPending = useSelector((state: any) => state.ui.isTxPending);
  const isNotesLoading = useSelector((state: any) => state.ui.isNotesLoading);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCheckingWallet, setIsCheckingWallet] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notesRejected, setNotesRejected] = useState(false);
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);

  useEffect(() => {
    const checkFreighterConnection = async () => {
      if (typeof window === 'undefined') return;
      try {
        const isConnected = await checkWalletConnection();
        if (isConnected) {
          const { address } = store.getState().wallet;
          setPublicKey(address);
        } else {
          setPublicKey(null);
        }
      } catch (error) {
        console.error("Cüzdan bağlantı kontrol hatası:", error);
        setErrorMsg("Cüzdan bağlantı kontrolü sırasında bir hata oluştu!");
        setPublicKey(null);
      } finally {
        setIsCheckingWallet(false);
      }
    };
    checkFreighterConnection();
  }, [dispatch]);

  const handleConnect = async () => {
    try {
      const { address } = await connectWallet();
      console.log('Bağlanan cüzdan:', address);
      setPublicKey(address);
    } catch (error) {
      console.error('Cüzdan bağlantı hatası:', error);
      setPublicKey(null);
    }
  };

  // publicKey değiştiğinde notları yükle
  useEffect(() => {
    if (publicKey && isConnected) {
      dispatch(setIsNotesLoading(true));
      loadNotes(publicKey).then(() => dispatch(setIsNotesLoading(false)));
    }
  }, [publicKey, isConnected, dispatch]);

  // Notları yükle
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
      dispatch(setIsNotesLoading(true));
      let result;
      try {
        result = await notesContract.getUserNotes(address);
        dispatch(setIsTxPending(false));
        dispatch(setIsNotesLoading(true));
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

  // Tarih formatla
  const formatDate = (timestamp: number) => {
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
      <div className="min-h-screen flex items-center justify-center p-4">
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

  if (!isConnected || !publicKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold text-white mb-8">
          Blockchain Notes'a Hoş Geldiniz
        </h1>
        <p className="text-lg text-gray-300 mb-8 text-center max-w-2xl">
          Stellar blockchain üzerinde notlarınızı güvenle saklayın. 
          Cüzdanınızı bağlayarak başlayın.
        </p>
        {walletError && (
          <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-xl mb-4">
            {walletError}
          </div>
        )}
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:from-gray-500 disabled:to-gray-600 disabled:transform-none disabled:cursor-not-allowed"
        >
          {isConnecting ? 'Bağlanıyor...' : 'Cüzdanı Bağla'}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Stellar Test Net</h1>
              <p className="text-gray-300 text-sm">
                Stellar Test Net üzerinde güvenli ve merkeziyetsiz not tutma uygulaması.
              </p>
            </div>
            <button
              onClick={() => setShowNewNoteForm(!showNewNoteForm)}
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
        {showNewNoteForm && (
          <div className="mb-6">
            <NewNote 
              publicKey={publicKey} 
              onNoteCreated={() => loadNotes(publicKey)} 
              showForm={true}
              onClose={() => setShowNewNoteForm(false)}
            />
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
            <div className="bg-red-500/80 text-white rounded-2xl p-8 shadow-2xl border border-white/20 text-center flex flex-col items-center justify-center">
              <svg className="w-10 h-10 text-white mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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