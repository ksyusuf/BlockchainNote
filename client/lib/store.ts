import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './uiSlice';
import walletReducer from './walletSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    wallet: walletReducer
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
