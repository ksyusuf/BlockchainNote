"use client";

import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { setAddress, setBalance } from '../lib/uiSlice';
import { RootState } from '../lib/store';

export default function Header() {
  const router = useRouter();
  const dispatch = useDispatch();
  const state = useSelector((state: RootState) => state);
  console.log('Redux Store State:', state); // Debug için store state'ini logla
  const { address, balance } = useSelector((state: RootState) => state.ui);
  console.log('Address:', address, 'Balance:', balance); // Debug için address ve balance'ı logla

  const handleDisconnect = () => {
    // Redux store'u temizle
    dispatch(setAddress(null));
    dispatch(setBalance(null));
    // Ana sayfaya yönlendir
    router.push('/');
  };

  return (
    <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-white">BlockchainNote</h1>
          </div>
          {address && (
            <div className="flex items-center gap-4">
              <div className="bg-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <div className="flex flex-col">
                  <span className="text-white font-medium text-sm">
                    {address.substring(0, 8)}...{address.substring(address.length - 8)}
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
                Bağlantıyı Kes
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 