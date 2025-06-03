import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  isTxPending: boolean;
  isNotesLoading: boolean;
}

const initialState: UIState = {
  isTxPending: false,
  isNotesLoading: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setIsTxPending(state, action: PayloadAction<boolean>) {
      state.isTxPending = action.payload;
    },
    setIsNotesLoading(state, action: PayloadAction<boolean>) {
      state.isNotesLoading = action.payload;
    },
  },
});

export const { setIsTxPending, setIsNotesLoading } = uiSlice.actions;
export default uiSlice.reducer;
