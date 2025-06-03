'use client';

import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setIsTxPending } from '../lib/uiSlice';
import { NotesContractClient } from '../lib/contrat';

interface NewNoteProps {
  publicKey: string | null;
  onNoteCreated: () => void;
  showForm: boolean;
  onClose: () => void;
}

export default function NewNote({ publicKey, onNoteCreated, showForm, onClose }: NewNoteProps) {
  const dispatch = useDispatch();
  const [newNote, setNewNote] = useState({ title: "", content: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateNote = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) {
      setError('Başlık ve içerik gerekli!');
      return;
    }

    if (!publicKey) {
      setError('Cüzdan bağlı değil!');
      return;
    }

    setIsCreating(true);
    dispatch(setIsTxPending(true));
    try {
      const notesContract = new NotesContractClient();
      const noteId = await notesContract.createNote(
        publicKey, 
        newNote.title, 
        newNote.content
      );
      console.log("Not oluşturuldu, ID:", noteId);

      setNewNote({ title: "", content: "" });
      onClose();
      onNoteCreated();
    } catch (error) {
      console.error("Not oluşturma hatası:", error);
      alert("Not oluşturulurken hata oluştu!");
    } finally {
      setIsCreating(false);
      dispatch(setIsTxPending(false));
    }
  };

  if (!showForm) return null;

  return (
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
            onClick={onClose}
            className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all duration-300"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );
} 