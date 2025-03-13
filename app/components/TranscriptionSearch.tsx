'use client';

import { useState } from 'react';
import { searchTranscriptForTimestamps, formatTime } from '../utils/timestampSearch';

interface TranscriptionSearchProps {
  transcriptionData: any;
}

export default function TranscriptionSearch({ transcriptionData }: TranscriptionSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const handleSearch = () => {
    if (!transcriptionData?.words || !searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    
    const results = searchTranscriptForTimestamps(transcriptionData.words, searchTerm);
    setSearchResults(results);
    console.log('Результаты поиска:', results);
  };
  
  // Не показываем компонент поиска, если нет слов с таймкодами
  if (!transcriptionData?.words || !transcriptionData.words.length) {
    return null;
  }
  
  return (
    <div style={{ marginTop: '2rem' }}>
      <h2>Поиск по транскрипции</h2>
      <div style={{ display: 'flex', marginBottom: '1rem' }}>
        <input 
          type="text" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Введите текст для поиска"
          style={{ flex: 1, marginRight: '0.5rem', padding: '5px' }}
        />
        <button onClick={handleSearch}>Найти</button>
      </div>
      
      {searchResults.length > 0 ? (
        <div>
          <h3>Результаты поиска ({searchResults.length}):</h3>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {searchResults.map((result, index) => (
              <li key={index} style={{ marginBottom: '1rem', padding: '10px', border: '1px solid #eee' }}>
                <div><strong>Таймкод:</strong> {formatTime(result.startTime)}</div>
                <div><strong>Контекст:</strong> <span style={{ backgroundColor: '#FFFFD0' }}>{result.context}</span></div>
              </li>
            ))}
          </ul>
        </div>
      ) : searchTerm.trim() ? (
        <p>Ничего не найдено</p>
      ) : null}
    </div>
  );
}
