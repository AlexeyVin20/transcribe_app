"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/Spinner"
import GeminiTextProcessor from "./GeminiTextProcessor"
import { FileDown, FileText, Copy, Check, AlertCircle, Play, Pause } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion } from "framer-motion"
import { Slider } from "@/app/components/ui/slider"

// Add keyframes for the pulse animation
const pulseAnimation = `
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(var(--primary), 0.4); }
    70% { box-shadow: 0 0 0 6px rgba(var(--primary), 0); }
    100% { box-shadow: 0 0 0 0 rgba(var(--primary), 0); }
  }
`

interface TranscriptionWord {
  word: string
  start: number
  end: number
  confidence: number
  speaker: number
  speaker_confidence: number
  punctuated_word: string
}

// Интерфейс для структуры параграфов
interface TranscriptionParagraph {
  sentences: any[]  // Массив предложений
  speaker: number
  num_words: number
  start: number
  end: number
}

interface TranscriptionResultProps {
  transcription: string
  transcriptionData: any
  isLoading: boolean
  error: string | null
  originalAudioFile?: File | null
  onTranscriptionChange?: (text: string) => void
}

export default function TranscriptionResult({
  transcription,
  transcriptionData,
  isLoading,
  error,
  originalAudioFile,
  onTranscriptionChange,
}: TranscriptionResultProps) {
  const [editableTranscription, setEditableTranscription] = useState(transcription)
  const [summary, setSummary] = useState("")
  const [copied, setCopied] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [activeWordIndex, setActiveWordIndex] = useState(-1)
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [isSliderDragging, setIsSliderDragging] = useState(false)
  const [formattedTranscription, setFormattedTranscription] = useState<string>("")

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const wordsRef = useRef<TranscriptionWord[]>([])
  const paragraphsRef = useRef<TranscriptionParagraph[]>([])
  const activeWordRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    setEditableTranscription(transcription)

    // Извлекаем слова из данных транскрипции если они есть
    if (transcriptionData?.results?.channels?.[0]?.alternatives?.[0]?.words && 
        Array.isArray(transcriptionData.results.channels[0].alternatives[0].words)) {
      wordsRef.current = transcriptionData.results.channels[0].alternatives[0].words
    } else if (transcriptionData?.words && Array.isArray(transcriptionData.words)) {
      wordsRef.current = transcriptionData.words
    }

    // Извлекаем структуру параграфов если она есть
    if (transcriptionData?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs && 
        Array.isArray(transcriptionData.results.channels[0].alternatives[0].paragraphs)) {
      paragraphsRef.current = transcriptionData.results.channels[0].alternatives[0].paragraphs
    } else if (transcriptionData?.paragraphs && Array.isArray(transcriptionData.paragraphs)) {
      paragraphsRef.current = transcriptionData.paragraphs
    }

    // Устанавливаем длительность из метаданных если доступна
    if (transcriptionData?.metadata?.duration) {
      setDuration(transcriptionData.metadata.duration)
    }
    
    // Форматируем транскрипцию с учетом параграфов
    formatTranscriptionWithParagraphs();

    // Очищаем URL, если он был создан ранее
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [transcription, transcriptionData])

  // Обрабатываем файл для воспроизведения
  useEffect(() => {
    if (originalAudioFile) {
      const url = URL.createObjectURL(originalAudioFile)
      setAudioUrl(url)

      return () => {
        URL.revokeObjectURL(url)
      }
    }
  }, [originalAudioFile])

  // Обработка таймингов при воспроизведении
  useEffect(() => {
    const handleTimeUpdate = () => {
      if (audioRef.current && !isSliderDragging) {
        const currentAudioTime = audioRef.current.currentTime
        setCurrentTime(currentAudioTime)

        // Находим текущее активное слово на основе времени
        const activeWord = wordsRef.current.findIndex(
          (word) => currentAudioTime >= word.start && currentAudioTime <= word.end,
        )

        if (activeWord !== -1 && activeWord !== activeWordIndex) {
          setActiveWordIndex(activeWord)
          scrollToActiveWord(activeWord)
        }
      }
    }

    const handleLoadedMetadata = () => {
      if (audioRef.current) {
        // Если длительность не была установлена из метаданных, устанавливаем из аудио
        if (duration === 0) {
          setDuration(audioRef.current.duration)
        }
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setActiveWordIndex(-1)
    }

    const audio = audioRef.current
    if (audio) {
      audio.addEventListener("timeupdate", handleTimeUpdate)
      audio.addEventListener("loadedmetadata", handleLoadedMetadata)
      audio.addEventListener("ended", handleEnded)

      return () => {
        audio.removeEventListener("timeupdate", handleTimeUpdate)
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
        audio.removeEventListener("ended", handleEnded)
      }
    }
  }, [activeWordIndex, duration, isSliderDragging])

  // Функция для форматирования транскрипции с параграфами
  const formatTranscriptionWithParagraphs = () => {
    if (!wordsRef.current || wordsRef.current.length === 0) {
      setFormattedTranscription(transcription);
      return;
    }
    
    // Создаем новую форматированную версию текста
    let formatted = "";
    let currentParagraphIndex = -1;
    let currentSpeaker = -1;
    
    wordsRef.current.forEach((word, index) => {
      // Проверяем, начало ли это нового параграфа
      const isParagraphStart = isStartOfParagraph(index);
      
      // Получаем индекс параграфа для текущего слова
      const paragraphIndex = getWordParagraphIndex(index);
      
      // Проверяем смену говорящего
      const isSpeakerChange = 
        index > 0 && 
        word.speaker !== wordsRef.current[index - 1].speaker &&
        word.speaker >= 0 && 
        wordsRef.current[index - 1].speaker >= 0;
      
      // Если это новый параграф, добавляем пустую строку
      if (isParagraphStart && index > 0) {
        formatted += "\n\n";
      }
      
      // Если изменился говорящий, добавляем метку говорящего
      if (isSpeakerChange || (isParagraphStart && word.speaker >= 0 && word.speaker !== currentSpeaker)) {
        formatted += `[Говорящий ${word.speaker + 1}]: `;
        currentSpeaker = word.speaker;
      }
      
      // Добавляем слово
      formatted += word.punctuated_word;
      
      // Если за словом не следует знак препинания, добавляем пробел
      const nextWord = index < wordsRef.current.length - 1 ? wordsRef.current[index + 1].punctuated_word : "";
      const needsSpace = ![",", ".", "!", "?", ":", ";", ")", "]"].includes(nextWord.charAt(0));
      
      if (needsSpace) {
        formatted += " ";
      }
      
      currentParagraphIndex = paragraphIndex;
    });
    
    setFormattedTranscription(formatted);
    // Если текст транскрипции был пустым или не содержал слов, обновляем его
    if (!editableTranscription || editableTranscription.trim() === transcription.trim()) {
      setEditableTranscription(formatted);
      if (onTranscriptionChange) {
        onTranscriptionChange(formatted);
      }
    }
  };

  // Разбиваем форматированный текст на параграфы с метаданными
  const getParagraphsWithMetadata = () => {
    if (!paragraphsRef.current || paragraphsRef.current.length === 0) {
      // Если нет метаданных о параграфах, просто разбиваем по переносам строки
      return editableTranscription.split('\n\n').map((text) => ({
        text,
        start: 0,
        end: 0,
        speaker: -1,
        hasSpeakerInfo: text.startsWith('[Говорящий')
      }));
    }
    
    // Создаем подробные параграфы с метаданными
    return paragraphsRef.current.map((paragraph, index) => {
      // Находим слова, относящиеся к этому параграфу
      const paragraphWords = wordsRef.current.filter(
        word => word.start >= paragraph.start && word.end <= paragraph.end
      );
      
      // Группируем слова по говорящим
      const speakerGroups: {[key: number]: TranscriptionWord[]} = {};
      paragraphWords.forEach(word => {
        if (!speakerGroups[word.speaker]) {
          speakerGroups[word.speaker] = [];
        }
        speakerGroups[word.speaker].push(word);
      });
      
      // Формируем текст для каждого говорящего
      let paragraphText = '';
      Object.entries(speakerGroups).forEach(([speaker, words]) => {
        const speakerNumber = parseInt(speaker) + 1;
        if (Object.keys(speakerGroups).length > 1) {
          paragraphText += `[Говорящий ${speakerNumber}]: `;
        }
        
        // Собираем текст от говорящего
        let speakerText = "";
        words.forEach((word, wIndex) => {
          speakerText += word.punctuated_word;
          
          // Добавляем пробел между словами, если нужно
          const nextWord = wIndex < words.length - 1 ? words[wIndex + 1].punctuated_word : "";
          const needsSpace = ![",", ".", "!", "?", ":", ";", ")", "]"].includes(nextWord.charAt(0));
          
          if (needsSpace && wIndex < words.length - 1) {
            speakerText += " ";
          }
        });
        
        paragraphText += speakerText;
        if (Object.keys(speakerGroups).length > 1) {
          paragraphText += '\n';
        }
      });
      
      // Определяем основного говорящего в параграфе
      let primarySpeaker = -1;
      let maxWordCount = 0;
      
      Object.entries(speakerGroups).forEach(([speaker, words]) => {
        const speakerNumber = parseInt(speaker);
        if (words.length > maxWordCount) {
          maxWordCount = words.length;
          primarySpeaker = speakerNumber;
        }
      });
      
      return {
        text: paragraphText,
        start: paragraph.start,
        end: paragraph.end,
        speaker: primarySpeaker,
        hasSpeakerInfo: Object.keys(speakerGroups).length > 1
      };
    });
  };

  const handleTranscriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setEditableTranscription(newText)
    if (onTranscriptionChange) {
      onTranscriptionChange(newText)
    }
  }

  const handleProcessedTextChange = (text: string, summary: string) => {
    setEditableTranscription(text)
    setSummary(summary)
    if (onTranscriptionChange) {
      onTranscriptionChange(text)
    }
  }

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(editableTranscription)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = async (format: "docx" | "odt") => {
    try {
      // Формируем расширенную версию для экспорта с метаданными параграфов
      let exportText = "";
      
      if (paragraphsRef.current && paragraphsRef.current.length > 0) {
        // Если есть структура параграфов, используем ее для форматирования
        paragraphsRef.current.forEach((paragraph, pIndex) => {
          // Добавляем метаданные параграфа
          exportText += `[Параграф ${pIndex + 1}] [${formatTime(paragraph.start)} - ${formatTime(paragraph.end)}]\n`;
          
          // Находим слова, относящиеся к этому параграфу
          const paragraphWords = wordsRef.current.filter(
            word => word.start >= paragraph.start && word.end <= paragraph.end
          );
          
          // Группируем слова по говорящим
          const speakerGroups: {[key: number]: TranscriptionWord[]} = {};
          paragraphWords.forEach(word => {
            if (!speakerGroups[word.speaker]) {
              speakerGroups[word.speaker] = [];
            }
            speakerGroups[word.speaker].push(word);
          });
          
          // Добавляем текст для каждого говорящего
          Object.entries(speakerGroups).forEach(([speaker, words]) => {
            const speakerNumber = parseInt(speaker) + 1;
            exportText += `[Говорящий ${speakerNumber}]: `;
            
            // Собираем текст от говорящего
            let speakerText = "";
            words.forEach((word, wIndex) => {
              speakerText += word.punctuated_word;
              
              // Добавляем пробел между словами, если нужно
              const nextWord = wIndex < words.length - 1 ? words[wIndex + 1].punctuated_word : "";
              const needsSpace = ![",", ".", "!", "?", ":", ";", ")", "]"].includes(nextWord.charAt(0));
              
              if (needsSpace && wIndex < words.length - 1) {
                speakerText += " ";
              }
            });
            
            exportText += speakerText + "\n";
          });
          
          // Добавляем разделитель между параграфами
          exportText += "\n";
        });
      } else {
        // Если нет структуры параграфов, используем форматированную транскрипцию
        exportText = formattedTranscription || editableTranscription;
      }
      
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: exportText,
          format,
        }),
      })

      if (!response.ok) {
        throw new Error("Ошибка при скачивании файла")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = `transcription.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Ошибка при скачивании:", error)
    }
  }

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current && Array.isArray(value) && value.length > 0) {
      const newTime = value[0]
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
      
      // Находим слово, соответствующее новой позиции
      const newActiveWord = wordsRef.current.findIndex(
        (word) => newTime >= word.start && newTime <= word.end,
      )
      
      if (newActiveWord !== -1) {
        setActiveWordIndex(newActiveWord)
        scrollToActiveWord(newActiveWord)
      }
    }
  }

  const jumpToWord = (wordIndex: number) => {
    if (audioRef.current && wordsRef.current[wordIndex]) {
      const wordTime = wordsRef.current[wordIndex].start
      audioRef.current.currentTime = wordTime
      setCurrentTime(wordTime)
      setActiveWordIndex(wordIndex)

      if (!isPlaying) {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  // Функция форматирования времени в MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Обработка автоматической прокрутки в интерактивном режиме
  const scrollToActiveWord = (index: number) => {
    if (!autoScroll) return

    setTimeout(() => {
      const activeElement = document.getElementById(`word-${index}`)
      if (activeElement) {
        // Get the scrollable container
        const container = activeElement.closest(".interactive-text-container")
        if (container) {
          const containerRect = container.getBoundingClientRect()
          const elementRect = activeElement.getBoundingClientRect()

          // Calculate the center position
          const containerCenter = containerRect.top + containerRect.height / 2
          const elementCenter = elementRect.top + elementRect.height / 2

          // Check if element is not in the visible center area (with some margin)
          const margin = containerRect.height / 4 // 25% margin from center
          if (Math.abs(elementCenter - containerCenter) > margin) {
            // Scroll with a slight offset to show upcoming words
            const scrollOptions: ScrollIntoViewOptions = {
              behavior: "smooth",
              block: "center",
            }

            // If we're playing, try to position the active word slightly above center
            // to show upcoming words
            if (isPlaying) {
              scrollOptions.block = "center"
              container.scrollTo({
                top: container.scrollTop + (elementRect.top - containerRect.top) - containerRect.height / 3,
                behavior: "smooth",
              })
            } else {
              activeElement.scrollIntoView(scrollOptions)
            }
          }
        }
      }
    }, 50)
  }

  // Обновленный слайдер с обработкой начала и конца перетаскивания
  const handleSliderDragStart = () => {
    setIsSliderDragging(true)
  }

  const handleSliderDragEnd = () => {
    setIsSliderDragging(false)
  }

  // Проверяем, принадлежит ли слово определенному параграфу
  const getWordParagraphIndex = (wordIndex: number): number => {
    if (!paragraphsRef.current || paragraphsRef.current.length === 0 || !wordsRef.current[wordIndex]) return -1;
    
    const wordTime = wordsRef.current[wordIndex].start;
    
    for (let i = 0; i < paragraphsRef.current.length; i++) {
      const paragraph = paragraphsRef.current[i];
      if (wordTime >= paragraph.start && wordTime <= paragraph.end) {
        return i;
      }
    }
    
    return -1;
  }

  // Проверяем, является ли слово началом параграфа
  const isStartOfParagraph = (wordIndex: number): boolean => {
    // Если нет данных о параграфах, используем другую логику
    if (!paragraphsRef.current || paragraphsRef.current.length === 0) {
      // Для первого слова всегда true
      if (wordIndex === 0) return true;
      
      // Для последующих слов, проверяем, есть ли большой разрыв во времени
      // или если предыдущее слово заканчивается точкой, а текущее начинается с заглавной буквы
      const prevWord = wordsRef.current[wordIndex - 1];
      const currWord = wordsRef.current[wordIndex];
      
      // Проверка на разрыв во времени между словами (более 1 секунды может означать новый параграф)
      const hasTimeGap = (currWord.start - prevWord.end) > 1.0;
      
      // Проверка на конец предложения и начало с заглавной буквы
      const isPrevSentenceEnd = 
        prevWord.punctuated_word.endsWith('.') || 
        prevWord.punctuated_word.endsWith('!') || 
        prevWord.punctuated_word.endsWith('?');
      
      // Начинается ли текущее слово с заглавной буквы и не является ли оно местоимением "Я"
      const startsWithCapital = 
        currWord.punctuated_word.charAt(0) === currWord.punctuated_word.charAt(0).toUpperCase() && 
        currWord.punctuated_word.length > 1;
      
      return (isPrevSentenceEnd && startsWithCapital) || hasTimeGap;
    }
    
    // Если есть данные о параграфах, используем их
    const wordTime = wordsRef.current[wordIndex].start;
    
    // Проверяем, совпадает ли время начала слова с временем начала какого-либо параграфа
    // Используем небольшое отклонение для учета неточностей
    return paragraphsRef.current.some(paragraph => Math.abs(paragraph.start - wordTime) < 0.1);
  }

  if (isLoading) {
    return (
      <Card className="border border-border/50 shadow-md">
        <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center min-h-[300px]">
          <Spinner size="lg" />
          <p className="mt-4 text-center text-muted-foreground">Транскрибируем файл, пожалуйста подождите...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 shadow-md">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Произошла ошибка
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!transcription && !isLoading && !error) {
    return (
      <Card className="border border-dashed shadow-md">
        <CardContent className="pt-6 flex flex-col items-center justify-center text-center min-h-[300px] text-muted-foreground">
          <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium">Здесь появится результат транскрипции</p>
          <p className="text-sm max-w-md">
            Загрузите аудио или видео файл с помощью формы слева для начала транскрипции
          </p>
        </CardContent>
      </Card>
    )
  }

  const hasWords = wordsRef.current && wordsRef.current.length > 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <style jsx>{`
        ${pulseAnimation}
        .active-word-pulse {
          animation: pulse 1.5s infinite;
        }
        .current-timestamp {
          font-size: 0.75rem;
          color: var(--foreground);
          background-color: var(--secondary);
          padding: 2px 6px;
          border-radius: 4px;
          position: absolute;
          top: -22px;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          z-index: 10;
          opacity: 0;
          transition: opacity 0.15s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          font-weight: 500;
        }
        .word-item:hover .current-timestamp {
          opacity: 1;
        }
        .interactive-text-container {
          max-height: 600px !important; /* Увеличиваем высоту контейнера */
          padding: 1.5rem !important;
        }
        .interactive-text {
          font-size: 1.1rem; /* Увеличиваем размер шрифта для лучшей читаемости */
          line-height: 1.8;
        }
        /* Исправление цвета текста при наведении */
        .word-item {
          cursor: pointer;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          transition: all 0.2s ease;
          position: relative;
          display: inline-block;
        }
        .word-item:hover {
          background-color: var(--secondary);
        }
        .active-word {
          background-color: var(--primary);
          color: var(--primary-foreground);
          font-weight: 500;
          transform: scale(1.05);
          padding: 0.25rem 0.375rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          animation: pulse 1.5s infinite;
        }
        .active-word:hover {
          color: var(--foreground) !important;
          background-color: var(--primary-light) !important;
        }
        .paragraph-break {
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          display: block;
        }
        .speaker-change {
          font-weight: 600;
          color: var(--primary);
          margin-right: 0.5rem;
        }
        .paragraph-time {
          font-size: 0.7rem;
          color: var(--muted-foreground);
          margin-left: 0.5rem;
          font-weight: 400;
        }
        .speaker-label {
          font-weight: 500;
          color: var(--primary);
        }
        .paragraph-container {
          margin-bottom: 1.5rem;
          position: relative;
        }
        .paragraph-container:hover .paragraph-time {
          opacity: 1;
        }
        .paragraph-time {
          opacity: 0.6;
          transition: opacity 0.2s ease;
        }
      `}</style>
      {audioUrl && <audio ref={audioRef} src={audioUrl} style={{ display: "none" }} />}

      <Card className="mb-6 shadow-md hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle>Результат транскрипции</CardTitle>
          {editableTranscription && (
            <CardDescription>
              {editableTranscription.split(" ").length} слов, {editableTranscription.length} символов
              {duration > 0 && `, длительность: ${formatTime(duration)}`}
            </CardDescription>
          )}
        </CardHeader>

        {audioUrl && hasWords && (
          <CardContent className="pb-0">
            <div className="flex flex-col space-y-2 bg-secondary/20 p-3 rounded-md">
              <div className="flex items-center space-x-2">
                <Button size="icon" variant="outline" onClick={togglePlayPause} className="h-8 w-8">
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <div className="w-full flex-1">
                  <Slider
                    value={[currentTime]}
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={handleSliderChange}
                    onValueCommit={handleSliderDragEnd}
                    onPointerDown={handleSliderDragStart}
                    className="cursor-pointer"
                  />
                </div>
                <span className="text-xs whitespace-nowrap">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="h-3 w-3 rounded"
                  />
                  Автопрокрутка текста
                </label>
                {activeWordIndex >= 0 && wordsRef.current[activeWordIndex] && (
                  <span className="text-xs text-primary-foreground bg-primary px-2 py-0.5 rounded">
                    Текущее слово: {wordsRef.current[activeWordIndex].punctuated_word}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        )}

        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
            <GeminiTextProcessor
              transcriptionText={editableTranscription}
              onProcessedTextChange={handleProcessedTextChange}
            />
          </div>

          {summary && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-secondary/30 rounded-lg p-4 mb-4"
            >
              <h4 className="font-medium mb-1">Краткое содержание:</h4>
              <p className="text-sm text-muted-foreground">{summary}</p>
            </motion.div>
          )}

          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="mb-3">
              <TabsTrigger value="edit">Редактировать</TabsTrigger>
              <TabsTrigger value="preview">Предпросмотр</TabsTrigger>
              {hasWords && <TabsTrigger value="interactive">Интерактивно</TabsTrigger>}
            </TabsList>
            <TabsContent value="edit">
              <Textarea
                value={editableTranscription}
                onChange={handleTranscriptionChange}
                className="min-h-[300px] resize-y font-medium"
                placeholder="Здесь будет отображен текст транскрипции..."
              />
            </TabsContent>
            <TabsContent value="preview">
              <div className="border rounded-md p-4 min-h-[300px] prose prose-zinc max-w-none">
                {getParagraphsWithMetadata().map((paragraph, index) => (
                  <div key={index} className="paragraph-container">
                    {paragraph.start > 0 && (
                      <span className="paragraph-time" title="Временной диапазон параграфа">
                        {formatTime(paragraph.start)} - {formatTime(paragraph.end)}
                      </span>
                    )}
                    <p>
                      {paragraph.text.split('\n').map((line, lineIndex) => (
                        <React.Fragment key={lineIndex}>
                          {line}
                          {lineIndex < paragraph.text.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </p>
                  </div>
                ))}
              </div>
            </TabsContent>
            {hasWords && (
              <TabsContent value="interactive" className="w-full">
                <div className="border rounded-md p-4 min-h-[400px] overflow-y-auto prose prose-zinc max-w-none interactive-text-container">
                  <div className="interactive-text leading-relaxed">
                    {wordsRef.current.map((word, index) => {
                      // Добавим обработку знаков пунктуации для разбивки на предложения
                      const isPeriod =
                        word.punctuated_word.includes(".") ||
                        word.punctuated_word.includes("!") ||
                        word.punctuated_word.includes("?")
                      
                      const isActive = activeWordIndex === index;
                      
                      // Проверяем начало параграфа
                      const isParagraphStart = isStartOfParagraph(index);
                      
                      // Проверяем смену говорящего
                      const isSpeakerChange = 
                        index > 0 && 
                        word.speaker !== wordsRef.current[index - 1].speaker &&
                        word.speaker >= 0 && 
                        wordsRef.current[index - 1].speaker >= 0;
                      
                      // Если у нас нет данных о параграфах, используем точки для разделения
                      const shouldBreak = isParagraphStart || (isPeriod && !paragraphsRef.current.length);

                      return (
                        <React.Fragment key={index}>
                          {isParagraphStart && index > 0 && <span className="paragraph-break"></span>}
                          {isSpeakerChange && <span className="speaker-change">Говорящий {word.speaker + 1}:</span>}
                          <span
                            id={`word-${index}`}
                            ref={isActive ? activeWordRef : null}
                            className={`word-item ${isActive ? 'active-word' : ''}`}
                            onClick={() => jumpToWord(index)}
                            title={`${formatTime(word.start)} - ${formatTime(word.end)}`}
                          >
                            {word.punctuated_word}
                            <span className="current-timestamp">
                              {formatTime(word.start)}
                            </span>
                          </span>{" "}
                          {shouldBreak && isPeriod && <br />}
                        </React.Fragment>
                      )
                    })}
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={handleCopyToClipboard} className="flex items-center gap-1">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Скопировано" : "Копировать"}
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center gap-3 pt-0">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => handleDownload("docx")}
              className="flex-1 sm:flex-none hover:bg-primary/5 transition-colors duration-300"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Скачать в DOCX
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDownload("odt")}
              className="flex-1 sm:flex-none hover:bg-primary/5 transition-colors duration-300"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Скачать в ODT
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
