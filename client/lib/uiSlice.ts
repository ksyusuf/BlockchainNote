import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  address: string | null;
  balance: string | null;
  isTxPending: boolean;
  isNotesLoading: boolean;
}

const initialState: UIState = {
  address: null,
  balance: null,
  isTxPending: false,
  isNotesLoading: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setAddress: (state, action: PayloadAction<string | null>) => {
      state.address = action.payload;
    },
    setBalance: (state, action: PayloadAction<string | null>) => {
      state.balance = action.payload;
    },
    setIsTxPending: (state, action: PayloadAction<boolean>) => {
      state.isTxPending = action.payload;
    },
    setIsNotesLoading: (state, action: PayloadAction<boolean>) => {
      state.isNotesLoading = action.payload;
    },
  },
});

export const { setAddress, setBalance, setIsTxPending, setIsNotesLoading } = uiSlice.actions;
export default uiSlice.reducer;
