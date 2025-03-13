interface Word {
    word: string;
    start: number;
    end: number;
    confidence: number;
    punctuated_word: string;
  }
  
  interface SearchResult {
    word: string;
    startTime: number;
    endTime: number;
    context: string;
  }
  
  export function searchTranscriptForTimestamps(
    words: Word[] | undefined,
    searchTerm: string
  ): SearchResult[] {
    if (!words || !searchTerm || searchTerm.trim() === '') {
      return [];
    }
  
    const results: SearchResult[] = [];
    const searchTermLower = searchTerm.toLowerCase();
    
    // Поиск слов
    for (let i = 0; i < words.length; i++) {
      const currentWord = words[i].word.toLowerCase();
      
      // Простой поиск по одному слову
      if (currentWord === searchTermLower) {
        // Получаем контекст (до 5 слов до и после)
        const contextStart = Math.max(0, i - 5);
        const contextEnd = Math.min(words.length - 1, i + 5);
        const contextWords = words.slice(contextStart, contextEnd + 1)
          .map(w => w.punctuated_word || w.word);
        
        results.push({
          word: words[i].punctuated_word || words[i].word,
          startTime: words[i].start,
          endTime: words[i].end,
          context: contextWords.join(' ')
        });
        continue;
      }
      
      // Поиск по нескольким словам
      if (searchTermLower.includes(' ')) {
        const searchWords = searchTermLower.split(' ');
        
        // Проверяем, начинается ли фраза с текущего слова
        if (currentWord === searchWords[0] && i + searchWords.length <= words.length) {
          let match = true;
          for (let j = 1; j < searchWords.length; j++) {
            if (words[i + j].word.toLowerCase() !== searchWords[j]) {
              match = false;
              break;
            }
          }
          
          if (match) {
            // Фраза найдена, берем время начала первого слова и конца последнего
            const startTime = words[i].start;
            const endTime = words[i + searchWords.length - 1].end;
            
            // Получаем контекст
            const contextStart = Math.max(0, i - 5);
            const contextEnd = Math.min(words.length - 1, i + searchWords.length + 4);
            const contextWords = words.slice(contextStart, contextEnd + 1)
              .map(w => w.punctuated_word || w.word);
            
            results.push({
              word: searchTermLower,
              startTime,
              endTime,
              context: contextWords.join(' ')
            });
          }
        }
      }
    }
    
    return results;
  }
  
  // Форматирование времени в формат MM:SS
  export function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  