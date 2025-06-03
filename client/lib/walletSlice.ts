import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WalletState {
  address: string | null;
  balance: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

const initialState: WalletState = {
  address: null,
  balance: null,
  isConnected: false,
  isConnecting: false,
  error: null
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setWalletAddress: (state, action: PayloadAction<string | null>) => {
      state.address = action.payload;
      state.isConnected = !!action.payload;
    },
    setWalletBalance: (state, action: PayloadAction<string | null>) => {
      state.balance = action.payload;
    },
    setWalletConnection: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
      if (!action.payload) {
        state.address = null;
        state.balance = null;
      }
    },
    setWalletConnecting: (state, action: PayloadAction<boolean>) => {
      state.isConnecting = action.payload;
    },
    setWalletError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    resetWallet: (state) => {
      state.address = null;
      state.balance = null;
      state.isConnected = false;
      state.isConnecting = false;
      state.error = null;
    }
  }
});

export const {
  setWalletAddress,
  setWalletBalance,
  setWalletConnection,
  setWalletConnecting,
  setWalletError,
  resetWallet
} = walletSlice.actions;

export default walletSlice.reducer; 