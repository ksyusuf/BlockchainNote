"use client";

import { useState, useEffect } from 'react';
import { isConnected, requestAccess, getPublicKey } from '@stellar/freighter-api';
import { NotesContractClient } from '../lib/contrat';

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
  const [publicKey, setPublicKey] = useState<string | null>(TEST_PUBLIC_KEY);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState({ title: "", content: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Cüzdan bağlantısını kontrol et
  useEffect(() => {
    let freighterChecked = false;
    const checkFreighter = async () => {
      if (freighterChecked) return;
      freighterChecked = true;
      try {
        if (typeof window === 'undefined') return;
        console.log("Freighter bağlantısı kontrol ediliyor...");
        const connected = await isConnected();
        console.log("Freighter bağlantı durumu:", connected);
        if (connected) {
          const hasPermission = await requestAccess();
          if (hasPermission) {
            const walletKey = await getPublicKey();
            console.log("Freighter public key:", walletKey);
            if (walletKey) {
              setPublicKey(walletKey);
              try {
                const notesContract = new NotesContractClient();
                const noteFeeBigInt = BigInt(process.env.NEXT_PUBLIC_MIN_BALANCE || "1000000");
                await notesContract.initialize(
                  walletKey,
                  process.env.NEXT_PUBLIC_DEV_WALLET || "",
                  noteFeeBigInt
                );
                console.log("Kontrat başarıyla başlatıldı");
              } catch (error) {
                console.log("Kontrat başlatma hatası (muhtemelen zaten başlatılmış):", error);
              }
            }
          }
        }
      } catch (error) {
        console.error("Cüzdan bağlantı hatası:", error);
        alert("Cüzdan bağlantısı sırasında bir hata oluştu!");
      }
    };
    if (document.readyState === 'complete') {
      checkFreighter();
    } else {
      const onLoad = () => checkFreighter();
      window.addEventListener('load', onLoad);
      return () => window.removeEventListener('load', onLoad);
    }
  }, []);

  // Test ağında otomatik olarak bağlanıyoruz
  useEffect(() => {
    if (publicKey) {
      loadNotes(publicKey);
    }
  }, [publicKey]);

  // Cüzdan bağlama butonu
  const handleConnectWallet = async () => {
    try {
      const connected = await isConnected();
      if (!connected) {
        alert("Lütfen Freighter cüzdanını yükleyin!");
        return;
      }

      const hasPermission = await requestAccess();
      if (hasPermission) {
        const walletKey = await getPublicKey();
        setPublicKey(walletKey);
        await loadNotes(walletKey);
      }
    } catch (error) {
      console.error("Cüzdan bağlantı hatası:", error);
      alert("Cüzdan bağlantısı sırasında bir hata oluştu!");
    }
  };

  // Notları yükle (mock data - gerçek uygulamada blockchain'den gelecek)
  const loadNotes = async (address: string) => {
    try {
      console.log('loadNotes çağrısı, gelen adres:', address);
      if (!address || typeof address !== 'string' || !address.startsWith('G')) {
        console.error('loadNotes: HATALI ADRES! G... ile başlayan geçerli bir Stellar public key bekleniyor:', address);
        alert('Cüzdan adresiniz geçersiz!');
        return;
      }
      const notesContract = new NotesContractClient();
      const notes = await notesContract.getUserNotes(address);
      console.log('Notlar başarıyla yüklendi:', notes);
      // API'den gelen Note[] tipini client'ın Note tipine dönüştür
      const clientNotes = notes.map((note: ContractNote) => ({
        id: note.id.toString(),
        title: note.title,
        content: "IPFS'ten içerik yüklenecek...", // IPFS entegrasyonu eklenecek
        ipfsHash: note.ipfs_hash,
        timestamp: note.timestamp
      }));
      setNotes(clientNotes);
    } catch (error) {
      console.error('Notları yükleme hatası:', error);
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
    try {
      const notesContract = new NotesContractClient();

      // 1. IPFS'e yükle (şimdilik mock)
      const ipfsHash = "Qm" + Math.random().toString(36).substring(2, 15);
      
      // 2. Blockchain'e kaydet
      const noteId = await notesContract.createNote(publicKey, newNote.title, ipfsHash);
      console.log("Not oluşturuldu, ID:", noteId);

      // 3. Tüm notları yeniden yükle
      await loadNotes(publicKey);

      setNewNote({ title: "", content: "" });
      setShowCreateForm(false);
      
      alert("Not başarıyla blockchain'e kaydedildi!");
    } catch (error) {
      console.error("Not oluşturma hatası:", error);
      alert("Not oluşturulurken hata oluştu!");
    } finally {
      setIsCreating(false);
    }
  };

  // Tarih formatla
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

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
              onClick={handleConnectWallet}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Freighter Cüzdanını Bağla
            </button>
          </div>
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
          {notes.length === 0 ? (
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
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>IPFS: {note.ipfsHash.substring(0, 20)}...</span>
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