import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  isTxPending: boolean;
  isNotesLoading: boolean;
  createNoteTransactionId: string | null;
}

const initialState: UiState = {
  isTxPending: false,
  isNotesLoading: false,
  createNoteTransactionId: null
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setIsTxPending: (state, action: PayloadAction<boolean>) => {
      state.isTxPending = action.payload;
    },
    setIsNotesLoading: (state, action: PayloadAction<boolean>) => {
      state.isNotesLoading = action.payload;
    },
    setCreateNoteTransactionId: (state, action: PayloadAction<string | null>) => {
      state.createNoteTransactionId = action.payload;
    }
  }
});

export const { setIsTxPending, setIsNotesLoading, setCreateNoteTransactionId } = uiSlice.actions;
export default uiSlice.reducer;
