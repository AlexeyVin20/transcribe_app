'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/ui/file-upload";
import { GlowEffect } from "@/components/ui/glow-effect";
import TranscriptionResult from '@/app/components/TranscriptionResult';
import { motion } from "framer-motion";
import DisplayCards from "@/components/ui/display-cards";
import { StarBorder } from "@/components/ui/star-border";
import { Spinner } from "@/components/ui/Spinner";
import { Slider } from "@/components/ui/slider";

export default function Home() {
  const [transcription, setTranscription] = useState('');
  const [transcriptionData, setTranscriptionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [hasTranscription, setHasTranscription] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'nova-3' | 'nova-2'>('nova-3');
  const [awaitingTranscription, setAwaitingTranscription] = useState(false);

  // Для слайдера времени на главной
  const MAX_DURATION = 100; // 1:40 в секундах
  const [sliderTime, setSliderTime] = useState(0);

  // Получаем duration из ответа API, если есть
  const maxDuration = (transcriptionData as any)?.metadata?.duration ?? 100;

  // Форматирование времени в MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTranscriptionComplete = (data: any) => {
    setTranscription(data.text || '');
    setTranscriptionData(data);
    setHasTranscription(true);
  };

  const handleFileChange = (file: File | null) => {
    setAudioFile(file);
    if (!file) {
      setHasTranscription(false);
      setTranscription('');
      setTranscriptionData(null);
      setAwaitingTranscription(false);
    } else {
      setAwaitingTranscription(true);
    }
  };

  const handleTranscriptionChange = (newText: string) => {
    console.log("Обновление транскрипции в родительском компоненте:", newText);
    setTranscription(newText);
  };

  function handleTranscription(file: File) {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', selectedModel);
    formData.append('timestamps', 'true');
    fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    })
      .then(async (response) => {
        const responseText = await response.text();
        let data;
        try {
          if (responseText.trim() === '') {
            throw new Error('Получен пустой ответ от сервера');
          }
          data = JSON.parse(responseText);
        } catch (parseError) {
          setError('Ошибка парсинга ответа сервера');
          setIsLoading(false);
          return;
        }
        if (!response.ok) {
          setError(data.error || 'Ошибка при транскрипции');
          setIsLoading(false);
          return;
        }
        handleTranscriptionComplete(data);
        setIsLoading(false);
      })
      .catch((error) => {
        setError(error.message || 'Произошла ошибка при транскрипции');
        setIsLoading(false);
      });
  }

  const handleStartTranscription = () => {
    if (audioFile) {
      handleTranscription(audioFile);
      setAwaitingTranscription(false);
    }
  };

  const handleDelete = () => {
    setAudioFile(null);
    setHasTranscription(false);
    setTranscription('');
    setTranscriptionData(null);
    setAwaitingTranscription(false);
    setError(null);
  };

  // Следим за достижением конца слайдера
  useEffect(() => {
    if (sliderTime >= maxDuration) {
      setSliderTime(maxDuration); // Останавливаем на максимуме
      // Если нужно сбрасывать в 0, используйте: setSliderTime(0);
    }
  }, [sliderTime, maxDuration]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container max-w-6xl mx-auto px-4 py-8"
      >
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-3xl md:text-4xl font-bold tracking-tight mb-2"
          >
            Транскрипция и обработка аудио/видео
          </motion.h1>
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="bg-card rounded-xl shadow-lg border"
        >
          <Tabs defaultValue="transcription" className="w-full">
            <TabsList className="grid w-full grid-cols-1 h-auto p-1">
              <TabsTrigger value="transcription" className="text-lg py-2">
                Транскрипция
              </TabsTrigger>
            </TabsList>
            <TabsContent value="transcription" className="p-4">
              {!hasTranscription ? (
                <div className="grid md:grid-cols-2 gap-6 p-2">
                  <div className="rounded-xl overflow-hidden relative">
                    <div className="relative">
                      <FileUpload
                        onChange={(files) => {
                          if (files && files[0]) {
                            handleFileChange(files[0]);
                          }
                        }}
                      />
                      <GlowEffect
                        className="z-10 pointer-events-none"
                        colors={["#6366f1", "#06b6d4", "#a21caf", "#f59e42"]}
                        mode="pulse"
                        blur="strong"
                        duration={3}
                        scale={1.08}
                      />
                    </div>
                    {/* Карточки выбора модели и кнопка появляются только после загрузки файла и до транскрипции */}
                    {audioFile && awaitingTranscription && (
                      <>
                        <div className="mt-6 flex justify-center">
                          <DisplayCards
                            cards={[
                              {
                                title: 'Nova 3',
                                description: 'Последняя и точная модель',
                                className: `cursor-pointer ${selectedModel === 'nova-3' ? 'border-blue-500 border-4' : ''}`,
                                onClick: () => setSelectedModel('nova-3'),
                              },
                              {
                                title: 'Nova 2',
                                description: 'Самая стабильная модель',
                                className: `cursor-pointer ${selectedModel === 'nova-2' ? 'border-blue-500 border-4' : ''}`,
                                onClick: () => setSelectedModel('nova-2'),
                              },
                            ]}
                          />
                        </div>
                        <div className="mt-4 flex justify-center relative">
                          {isLoading && (
                            <GlowEffect
                              colors={['hsl(var(--primary))']}
                              mode="pulse"
                              blur="medium"
                              duration={2}
                              className="absolute inset-0 z-0"
                            />
                          )}
                          <StarBorder
                            className="px-6 py-2 font-semibold shadow"
                            onClick={handleStartTranscription}
                            disabled={isLoading}
                            background="bg-black"
                            textColor="text-white"
                            borderColor="border-blue-500"
                          >
                            {isLoading ? (
                              <>
                                <Spinner className="w-4 h-4 mr-2" size="sm" />
                                Транскрипция...
                              </>
                            ) : (
                              'Начать транскрипцию'
                            )}
                          </StarBorder>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-center rounded-xl border border-dashed p-8 text-muted-foreground">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center w-full">
                        <Spinner size="lg" className="mb-3 text-primary" />
                        <span className="text-base font-medium text-primary">Файл обрабатывается...<br/>Пожалуйста, подождите</span>
                        {audioFile && (audioFile.name.toLowerCase().endsWith('.mxf') || audioFile.name.toLowerCase().endsWith('.mts')) && (
                          <div className="mt-3 text-sm text-amber-500 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-md">
                            <p className="font-medium">Идёт конвертация {audioFile.name.toLowerCase().endsWith('.mxf') ? 'MXF' : 'MTS'} файла в MP3</p>
                            <p>Это может занять дополнительное время</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-center">Ожидание файла для транскрипции</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col space-y-4">
                  {/* Информация о файле */}
                  {audioFile && (
                    <div className="w-full rounded-xl overflow-hidden bg-white dark:bg-neutral-900 shadow p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold">{audioFile.name}</span>
                        <span className="text-sm text-muted-foreground">{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                        <span className="text-sm text-muted-foreground">{audioFile.type}</span>
                        <span className="text-sm text-muted-foreground">Изменён: {new Date(audioFile.lastModified).toLocaleDateString()}</span>
                      </div>
                      <button
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold shadow hover:bg-red-700 transition"
                        onClick={handleDelete}
                      >
                        Удалить
                      </button>
                    </div>
                  )}
                  <div className="w-full mt-2">
                    <TranscriptionResult
                      transcription={transcription}
                      transcriptionData={transcriptionData}
                      isLoading={isLoading}
                      error={error}
                      originalAudioFile={audioFile}
                      onTranscriptionChange={handleTranscriptionChange}
                    />
                    {/* Временные метки под слайдером */}
                    <div className="flex justify-between mt-1 px-2 select-none">
                      {Array.from({ length: 6 }).map((_, i, arr) => {
                        const t = Math.round((i * maxDuration) / (arr.length - 1));
                        return (
                          <span key={i} className="text-[10px] font-mono text-muted-foreground" style={{ minWidth: 24, textAlign: 'center' }}>
                            {formatTime(t)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </div>
  );
}
