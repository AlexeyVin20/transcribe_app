"use client"

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, Loader2 } from "lucide-react"

interface TranscriptionWord {
  word: string
  start: number
  end: number
  confidence: number
  speaker: number
  speaker_confidence: number
  punctuated_word: string
}

interface TranscriptionParagraph {
  sentences: any[]
  speaker: number
  num_words: number
  start: number
  end: number
}

interface ParagraphData {
  id: string
  text: string
  start: number | null
  end: number | null
  speaker: number
  words?: TranscriptionWord[]
}

// Добавляем интерфейс для ref и экспортируемых методов
export interface TranscriptionEditorRef {
  getExportData: () => {
    text: string;
    paragraphs: ParagraphData[];
  };
  saveChanges: () => void;
  updateFromFormattedText: (text: string) => void;
}

interface TranscriptionEditorProps {
  transcriptionData: any
  onTranscriptionChange?: (text: string) => void
  formattedText: string
}

// Добавляем forwardRef для передачи ref от родителя
const TranscriptionEditor = forwardRef<TranscriptionEditorRef, TranscriptionEditorProps>(({
  transcriptionData,
  onTranscriptionChange,
  formattedText
}, ref) => {
  const [paragraphs, setParagraphs] = useState<ParagraphData[]>([])
  const [totalText, setTotalText] = useState(formattedText)
  const [hasBeenEdited, setHasBeenEdited] = useState(false)
  const [saveNotification, setSaveNotification] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Используем ref для хранения данных, полученных при инициализации
  const initialDataRef = useRef<{
    transcriptionData: any, 
    formattedText: string
  } | null>(null)

  // Экспортируем методы через ref
  useImperativeHandle(ref, () => ({
    // Метод для получения данных для экспорта
    getExportData: () => {
      // Подготавливаем текст с включенными метаданными
      const paragraphsWithMetadata = paragraphs.map(p => {
        let paragraphText = "";
        
        // Добавляем метаданные о времени, если доступны
        if (p.start !== null && p.end !== null) {
          paragraphText += `[${formatTime(p.start)} - ${formatTime(p.end)}] `;
        }
        
        // Добавляем метаданные о говорящем, если доступны
        if (p.speaker >= 0) {
          paragraphText += `[Говорящий ${p.speaker + 1}]: `;
        }
        
        // Добавляем сам текст
        paragraphText += p.text;
        
        return paragraphText;
      });
      
      // Объединяем все параграфы с метаданными
      const textWithMetadata = paragraphsWithMetadata.join('\n\n');
      console.log("Экспортируем текст с метаданными:", textWithMetadata.substring(0, 200) + "...");
      
      return {
        text: textWithMetadata,
        paragraphs: paragraphs
      };
    },
    // Метод для сохранения изменений
    saveChanges: () => {
      if (onTranscriptionChange) {
        // Получаем текст с метаданными
        const paragraphsWithMetadata = paragraphs.map(p => {
          let paragraphText = "";
          
          // Добавляем метаданные о времени, если доступны
          if (p.start !== null && p.end !== null) {
            paragraphText += `[${formatTime(p.start)} - ${formatTime(p.end)}] `;
          }
          
          // Добавляем метаданные о говорящем, если доступны
          if (p.speaker >= 0) {
            paragraphText += `[Говорящий ${p.speaker + 1}]: `;
          }
          
          // Добавляем сам текст
          paragraphText += p.text;
          
          return paragraphText;
        });
        
        // Объединяем все параграфы с метаданными
        const textWithMetadata = paragraphsWithMetadata.join('\n\n');
        console.log("Сохраняем текст с метаданными:", textWithMetadata.substring(0, 200) + "...");
        
        onTranscriptionChange(textWithMetadata);
        setSaveNotification(true);
        setTimeout(() => setSaveNotification(false), 2000);
      }
    },
    // Метод для обновления текста из форматированного текста с делением по \n\n
    updateFromFormattedText: (text: string) => {
      if (!text) return;
      
      console.log("Обновление текста в редакторе. Получено:", text.substring(0, 200) + "...");
      
      // Разбиваем текст на параграфы по \n\n
      const paragraphTexts = text.split('\n\n');
      
      // Создаем новые данные параграфов с поддержкой метаданных
      const newParagraphs: ParagraphData[] = paragraphTexts.map(paragraphText => {
        // Проверяем наличие метаданных о времени и говорящем с более гибкими регулярками
        const timeMatch = paragraphText.match(/^\s*\[(\d{2}:\d{2})(?:\s*-\s*|\s+)(\d{2}:\d{2})\]/);
        const speakerMatch = paragraphText.match(/\[Говорящий\s+(\d+)\]\s*:/);
        
        // Извлекаем время если есть
        let start: number | null = null;
        let end: number | null = null;
        if (timeMatch) {
          const startTime = timeMatch[1];
          const endTime = timeMatch[2];
          
          // Конвертируем время из формата MM:SS в секунды
          const convertTimeToSeconds = (timeString: string) => {
            const [minutes, seconds] = timeString.split(':').map(Number);
            return minutes * 60 + seconds;
          };
          
          start = convertTimeToSeconds(startTime);
          end = convertTimeToSeconds(endTime);
        }
        
        // Извлекаем номер говорящего если есть
        let speaker = -1;
        if (speakerMatch) {
          speaker = parseInt(speakerMatch[1]) - 1; // Конвертируем к нумерации с 0
        }
        
        // Очищаем текст от метаданных, если они были найдены
        let cleanText = paragraphText.trim();
        if (timeMatch) {
          cleanText = cleanText.replace(timeMatch[0], '').trim();
        }
        if (speakerMatch) {
          cleanText = cleanText.replace(speakerMatch[0], '').trim();
        }
        
        // Логируем извлеченные метаданные для отладки
        if (timeMatch || speakerMatch) {
          console.log(`Извлечены метаданные: время=${timeMatch ? `[${timeMatch[1]}-${timeMatch[2]}]` : 'нет'}, говорящий=${speakerMatch ? speakerMatch[1] : 'нет'}`);
          console.log(`Очищенный текст параграфа: ${cleanText.substring(0, 50)}...`);
        }
        
        return {
          id: generateId(),
          text: cleanText,
          start: start,
          end: end,
          speaker: speaker
        };
      });
      
      // Обновляем состояние
      setParagraphs(newParagraphs);
      setHasBeenEdited(true);
      
      // Уведомляем родителя об изменении, если нужно
      if (onTranscriptionChange) {
        onTranscriptionChange(text);
      }
    }
  }));

  // Функция для генерации уникального ID
  const generateId = () => {
    return Math.random().toString(36).substring(2, 15)
  }

  // Функция для форматирования времени в MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Инициализация данных - выполняется только один раз
  useEffect(() => {
    // Если уже инициализировано или нет данных, не выполняем
    if (isInitialized || !transcriptionData) return
    
    // Сохраняем начальные данные в ref для возможного сброса
    initialDataRef.current = {
      transcriptionData,
      formattedText
    }

    let paragraphsData: ParagraphData[] = []
    let wordsData: TranscriptionWord[] = []

    // Извлекаем слова из данных транскрипции если они есть
    if (transcriptionData?.results?.channels?.[0]?.alternatives?.[0]?.words && 
        Array.isArray(transcriptionData.results.channels[0].alternatives[0].words)) {
      wordsData = transcriptionData.results.channels[0].alternatives[0].words
    } else if (transcriptionData?.words && Array.isArray(transcriptionData.words)) {
      wordsData = transcriptionData.words
    }

    // Извлекаем структуру параграфов если она есть
    let paragraphsFromAPI: TranscriptionParagraph[] = []
    if (transcriptionData?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs && 
        Array.isArray(transcriptionData.results.channels[0].alternatives[0].paragraphs)) {
      paragraphsFromAPI = transcriptionData.results.channels[0].alternatives[0].paragraphs
    } else if (transcriptionData?.paragraphs && Array.isArray(transcriptionData.paragraphs)) {
      paragraphsFromAPI = transcriptionData.paragraphs
    }

    // Если есть данные о параграфах из API
    if (paragraphsFromAPI.length > 0 && wordsData.length > 0) {
      paragraphsData = paragraphsFromAPI.map((paragraph, idx) => {
        // Получаем слова для данного параграфа
        const paragraphWords = wordsData.filter(
          word => word.start >= paragraph.start && word.end <= paragraph.end
        )

        // Группируем слова по говорящим
        const speakerGroups: {[key: number]: TranscriptionWord[]} = {}
        paragraphWords.forEach(word => {
          if (!speakerGroups[word.speaker]) {
            speakerGroups[word.speaker] = []
          }
          speakerGroups[word.speaker].push(word)
        })

        // Формируем текст параграфа из слов
        let paragraphText = ""
        Object.entries(speakerGroups).forEach(([, words]) => {
          let speakerText = ""
          words.forEach((word, wIndex) => {
            speakerText += word.punctuated_word
            
            // Пробелы между словами
            const nextWord = wIndex < words.length - 1 ? words[wIndex + 1].punctuated_word : ""
            const needsSpace = ![",", ".", "!", "?", ":", ";", ")", "]"].includes(nextWord.charAt(0))
            
            if (needsSpace && wIndex < words.length - 1) {
              speakerText += " "
            }
          })
          paragraphText += speakerText
        })

        // Определяем основного говорящего
        let primarySpeaker = -1
        let maxWordCount = 0
        Object.entries(speakerGroups).forEach(([speaker, words]) => {
          const speakerNumber = parseInt(speaker)
          if (words.length > maxWordCount) {
            maxWordCount = words.length
            primarySpeaker = speakerNumber
          }
        })

        return {
          id: generateId(),
          text: paragraphText.trim(),
          start: paragraph.start,
          end: paragraph.end,
          speaker: primarySpeaker,
          words: paragraphWords
        }
      })
    } 
    // Если нет структуры параграфов, создаем простое разбиение
    else if (wordsData.length > 0) {
      // Логика разбиения на параграфы по большим паузам или концу предложений
      let currentParagraph: TranscriptionWord[] = []
      let paragraphs: TranscriptionWord[][] = []
      
      for (let i = 0; i < wordsData.length; i++) {
        currentParagraph.push(wordsData[i])
        
        // Новый параграф, если большая пауза или последнее слово
        const isEndOfSentence = wordsData[i].punctuated_word.match(/[.!?]$/)
        const hasLongPause = i < wordsData.length - 1 && (wordsData[i+1].start - wordsData[i].end) > 1.0
        
        if ((isEndOfSentence && hasLongPause) || i === wordsData.length - 1) {
          paragraphs.push([...currentParagraph])
          currentParagraph = []
        }
      }
      
      // Если остались слова, добавляем как параграф
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph)
      }
      
      paragraphsData = paragraphs.map((wordGroup) => {
        // Собираем текст из слов
        let paragraphText = wordGroup.map(w => w.punctuated_word).join(' ')
          .replace(/ ([,.!?:;])/g, '$1') // Убираем пробелы перед знаками препинания
        
        // Определяем основного говорящего
        const speakerCounts: {[key: number]: number} = {}
        wordGroup.forEach(word => {
          if (word.speaker !== undefined) {
            speakerCounts[word.speaker] = (speakerCounts[word.speaker] || 0) + 1
          }
        })
        
        let primarySpeaker = -1
        let maxCount = 0
        Object.entries(speakerCounts).forEach(([speaker, count]) => {
          if (count > maxCount) {
            maxCount = count
            primarySpeaker = parseInt(speaker)
          }
        })
        
        return {
          id: generateId(),
          text: paragraphText,
          start: wordGroup[0].start,
          end: wordGroup[wordGroup.length - 1].end,
          speaker: primarySpeaker,
          words: wordGroup
        }
      })
    }
    // Если вообще нет структурированных данных
    else if (formattedText) {
      paragraphsData = [{
        id: generateId(),
        text: formattedText,
        start: null,
        end: null,
        speaker: -1
      }]
    }

    setParagraphs(paragraphsData)
    setIsInitialized(true)
  }, []) // Пустой массив зависимостей - выполняется только при монтировании

  // Обновление общего текста при изменении параграфов
  // Теперь только отслеживаем текст, но не уведомляем родителя
  useEffect(() => {
    // Подготавливаем текст с включенными метаданными для общего представления
    const paragraphsWithMetadata = paragraphs.map(p => {
      let paragraphText = "";
      
      // Добавляем метаданные о времени, если доступны
      if (p.start !== null && p.end !== null) {
        paragraphText += `[${formatTime(p.start)} - ${formatTime(p.end)}] `;
      }
      
      // Добавляем метаданные о говорящем, если доступны
      if (p.speaker >= 0) {
        paragraphText += `[Говорящий ${p.speaker + 1}]: `;
      }
      
      // Добавляем сам текст
      paragraphText += p.text;
      
      return paragraphText;
    });
    
    // Объединяем все параграфы с метаданными
    const newText = paragraphsWithMetadata.join('\n\n');
    
    if (newText !== totalText) {
      setTotalText(newText);
    }
  }, [paragraphs]);

  // Функция для принудительного сохранения текста
  const saveChanges = () => {
    if (onTranscriptionChange) {
      onTranscriptionChange(totalText);
      setSaveNotification(true);
      setTimeout(() => setSaveNotification(false), 2000);
    }
  };

  // Функция для сброса к начальным данным
  const resetToOriginal = () => {
    if (!initialDataRef.current) return

    if (confirm("Вы действительно хотите сбросить все изменения к исходному тексту?")) {
      // Перезапускаем инициализацию с исходными данными
      setIsInitialized(false)
      
      setTimeout(() => {
        const { transcriptionData, formattedText } = initialDataRef.current!
        
        // Здесь копируем логику инициализации...
        let paragraphsData: ParagraphData[] = []
        let wordsData: TranscriptionWord[] = []

        // Извлекаем слова из данных транскрипции если они есть
        if (transcriptionData?.results?.channels?.[0]?.alternatives?.[0]?.words && 
            Array.isArray(transcriptionData.results.channels[0].alternatives[0].words)) {
          wordsData = transcriptionData.results.channels[0].alternatives[0].words
        } else if (transcriptionData?.words && Array.isArray(transcriptionData.words)) {
          wordsData = transcriptionData.words
        }

        // Извлекаем структуру параграфов если она есть
        let paragraphsFromAPI: TranscriptionParagraph[] = []
        if (transcriptionData?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs && 
            Array.isArray(transcriptionData.results.channels[0].alternatives[0].paragraphs)) {
          paragraphsFromAPI = transcriptionData.results.channels[0].alternatives[0].paragraphs
        } else if (transcriptionData?.paragraphs && Array.isArray(transcriptionData.paragraphs)) {
          paragraphsFromAPI = transcriptionData.paragraphs
        }

        // Если есть данные о параграфах из API
        if (paragraphsFromAPI.length > 0 && wordsData.length > 0) {
          paragraphsData = paragraphsFromAPI.map((paragraph, idx) => {
            // Получаем слова для данного параграфа
            const paragraphWords = wordsData.filter(
              word => word.start >= paragraph.start && word.end <= paragraph.end
            )

            // Группируем слова по говорящим
            const speakerGroups: {[key: number]: TranscriptionWord[]} = {}
            paragraphWords.forEach(word => {
              if (!speakerGroups[word.speaker]) {
                speakerGroups[word.speaker] = []
              }
              speakerGroups[word.speaker].push(word)
            })

            // Формируем текст параграфа из слов
            let paragraphText = ""
            Object.entries(speakerGroups).forEach(([, words]) => {
              let speakerText = ""
              words.forEach((word, wIndex) => {
                speakerText += word.punctuated_word
                
                // Пробелы между словами
                const nextWord = wIndex < words.length - 1 ? words[wIndex + 1].punctuated_word : ""
                const needsSpace = ![",", ".", "!", "?", ":", ";", ")", "]"].includes(nextWord.charAt(0))
                
                if (needsSpace && wIndex < words.length - 1) {
                  speakerText += " "
                }
              })
              paragraphText += speakerText
            })

            // Определяем основного говорящего
            let primarySpeaker = -1
            let maxWordCount = 0
            Object.entries(speakerGroups).forEach(([speaker, words]) => {
              const speakerNumber = parseInt(speaker)
              if (words.length > maxWordCount) {
                maxWordCount = words.length
                primarySpeaker = speakerNumber
              }
            })

            return {
              id: generateId(),
              text: paragraphText.trim(),
              start: paragraph.start,
              end: paragraph.end,
              speaker: primarySpeaker,
              words: paragraphWords
            }
          })
        } 
        // Если нет структуры параграфов или слов, возвращаем просто текст
        else {
          paragraphsData = [{
            id: generateId(),
            text: formattedText,
            start: null,
            end: null,
            speaker: -1
          }]
        }

        setParagraphs(paragraphsData)
        setIsInitialized(true)
        setHasBeenEdited(false)
        
        // Уведомляем родителя о сбросе
        if (onTranscriptionChange) {
          const newText = paragraphsData.map(p => {
            let paragraphText = "";
            
            // Добавляем метаданные о времени, если доступны
            if (p.start !== null && p.end !== null) {
              paragraphText += `[${formatTime(p.start)} - ${formatTime(p.end)}] `;
            }
            
            // Добавляем метаданные о говорящем, если доступны
            if (p.speaker >= 0) {
              paragraphText += `[Говорящий ${p.speaker + 1}]: `;
            }
            
            // Добавляем сам текст
            paragraphText += p.text;
            
            return paragraphText;
          }).join('\n\n');
          
          onTranscriptionChange(newText);
        }
      }, 100)
    }
  }

  // Обновление текста параграфа
  const updateParagraphText = (id: string, newText: string) => {
    setParagraphs(prev => 
      prev.map(p => p.id === id ? {...p, text: newText} : p)
    )
    setHasBeenEdited(true)
  }

  // Добавление нового параграфа
  const addParagraphAfter = (id: string) => {
    const index = paragraphs.findIndex(p => p.id === id)
    if (index === -1) return
    
    const newParagraph: ParagraphData = {
      id: generateId(),
      text: "",
      start: null,
      end: null,
      speaker: -1
    }
    
    setParagraphs([
      ...paragraphs.slice(0, index + 1),
      newParagraph,
      ...paragraphs.slice(index + 1)
    ])
    
    setHasBeenEdited(true)
  }

  // Удаление параграфа
  const deleteParagraph = (id: string) => {
    if (paragraphs.length <= 1) {
      setParagraphs(prev => 
        prev.map(p => p.id === id ? {...p, text: ""} : p)
      )
    } else {
      setParagraphs(prev => prev.filter(p => p.id !== id))
    }
    setHasBeenEdited(true)
  }

  if (!isInitialized) {
    return <div className="w-full text-center py-10">Загрузка данных...</div>
  }

  return (
    <div className="w-full">
      <div className="mb-3 text-sm text-muted-foreground flex items-center justify-between border-b pb-2">
        <div className="flex gap-3">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={resetToOriginal}
            className="text-amber-500"
          >
            Сбросить изменения
          </Button>
          <Button 
            size="sm" 
            variant="default" 
            onClick={saveChanges}
            disabled={!hasBeenEdited || saveNotification}
            className="relative min-w-[150px]"
          >
            {saveNotification ? (
              <span className="absolute inset-0 flex items-center justify-center bg-primary text-primary-foreground">
                <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Сохраняем...
              </span>
            ) : (
              "Сохранить изменения"
            )}
          </Button>
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground mb-2 text-right">
        <span>* При экспорте или копировании изменения сохраняются автоматически</span>
      </div>

      <div className="space-y-6">
        {paragraphs.map((paragraph) => (
          <Card key={paragraph.id} className="p-4 relative group">
            {/* Метаданные о времени и говорящих */}
            <div className="paragraph-metadata flex items-center mb-2">
              {paragraph.start !== null && paragraph.end !== null && (
                <div className="text-primary-foreground bg-primary/80 px-2 py-1 rounded text-xs font-medium mr-2">
                  [{formatTime(paragraph.start)} - {formatTime(paragraph.end)}]
                </div>
              )}
              {paragraph.speaker >= 0 && (
                <div className="text-primary font-medium">
                  [Говорящий {paragraph.speaker + 1}]:
                </div>
              )}
            </div>
            
            {/* Редактируемый текст параграфа */}
            <Textarea
              value={paragraph.text}
              onChange={(e) => updateParagraphText(paragraph.id, e.target.value)}
              className="w-full resize-y text-base font-medium p-3 focus:ring-2 focus:ring-primary min-h-[100px]"
              placeholder="Текст параграфа..."
            />
            
            {/* Кнопки управления параграфом */}
            <div className="flex gap-2 mt-2 justify-end">
              {paragraphs.length > 1 && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-destructive hover:text-destructive" 
                  onClick={() => {
                    if (confirm("Вы уверены, что хотите удалить этот параграф?")) {
                      deleteParagraph(paragraph.id)
                    }
                  }}
                >
                  Удалить
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      
      {/* Кнопка добавления нового параграфа в конец */}
      {paragraphs.length > 0 && (
        <div className="flex justify-center mt-4">
          <Button 
            variant="outline" 
            onClick={() => addParagraphAfter(paragraphs[paragraphs.length - 1].id)}
          >
            + Добавить новый параграф
          </Button>
        </div>
      )}
      
      <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
        <div>
          {hasBeenEdited && !saveNotification && (
            <span className="text-amber-500">* Есть несохраненные изменения</span>
          )}
        </div>
        <div>
          Всего символов: {totalText.length}, параграфов: {paragraphs.length}
        </div>
      </div>
    </div>
  )
})

export default TranscriptionEditor 