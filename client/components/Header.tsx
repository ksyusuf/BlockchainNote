"use client";

import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { resetWallet } from '../lib/walletSlice';
import { RootState } from '../lib/store';
import { useState } from 'react';

export default function Header() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { address, balance, isConnected } = useSelector((state: RootState) => state.wallet);
  const [showCopyPopup, setShowCopyPopup] = useState(false);

  const handleDisconnect = () => {
    // Redux store'u temizle
    dispatch(resetWallet());
    // Ana sayfaya yönlendir
    router.push('/');
  };

  const handleCopyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        setShowCopyPopup(true);
        setTimeout(() => setShowCopyPopup(false), 1000); // 2 saniye sonra popup'ı kapat
      } catch (err) {
        console.error('Kopyalama hatası:', err);
      }
    }
  };

  return (
    <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-white">BlockchainNote</h1>
          </div>
          {isConnected && address && (
            <div className="flex items-center gap-4">
              <div className="bg-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <div className="flex flex-col">
                  <span 
                    className="text-white font-medium text-sm cursor-pointer hover:text-gray-300 transition-colors"
                    onClick={handleCopyAddress}
                  >
                    <div className="flex items-center gap-1">
                      {address ? `${address.substring(0, 4)}...${address.substring(address.length - 4)}` : 'Bağlan'}
                      <svg className="w-4 h-4 text-gray-400 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m-4 0h-4" />
                      </svg>
                    </div>
                  </span>
                  <span className="text-gray-400 text-xs">
                    {balance} XLM
                  </span>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2"
                title="Cüzdan Bağlantısını Kes"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Kopyalama Popup'ı */}
      {showCopyPopup && (
        <div className="fixed top-4 right-4 bg-green-500/90 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm animate-fade-in-out">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Adres kopyalandı!</span>
          </div>
        </div>
      )}
    </header>
  );
} 