'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { FileAudio, Upload, AlertCircle, X, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Spinner } from "@/components/ui/Spinner";

interface TranscriptionFormProps {
  onTranscriptionComplete: (data: any) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  onFileChange?: (file: File | null) => void;
}

export default function TranscriptionForm({
  onTranscriptionComplete,
  setIsLoading,
  setError,
  onFileChange
}: TranscriptionFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      if (onFileChange) {
        onFileChange(e.target.files[0]);
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      if (onFileChange) {
        onFileChange(e.dataTransfer.files[0]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Пожалуйста, выберите файл для транскрипции");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'nova-3');
    formData.append('timestamps', 'true');

    setIsLoading(true);
    setError(null);
    setIsProcessing(true);

    try {
      // Установка таймаута для длительных запросов
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 минут таймаут

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Получаем текст ответа вместо прямого вызова response.json()
      const responseText = await response.text();
      
      // Защищенный парсинг JSON
      let data;
      try {
        // Проверяем, что ответ не пустой
        if (responseText.trim() === '') {
          throw new Error('Получен пустой ответ от сервера');
        }
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Ошибка парсинга JSON:', parseError);
        console.log('Полученный ответ:', responseText);
        throw new Error('Получен некорректный формат ответа от сервера');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при транскрипции');
      }

      console.log('Получены данные транскрипции:', data);
      toast.success("Транскрипция успешно завершена");
      onTranscriptionComplete(data);
    } catch (error) {
      console.error('Ошибка транскрипции:', error);
      // Проверяем случай обрыва соединения
      if (error instanceof DOMException && error.name === 'AbortError') {
        setError('Превышено время ожидания. Возможно, файл слишком большой или сервер перегружен.');
        toast.error('Превышено время ожидания. Попробуйте файл меньшего размера.');
      } else {
        setError(error instanceof Error ? error.message : 'Произошла ошибка при транскрипции');
        toast.error(error instanceof Error ? error.message : 'Произошла ошибка при транскрипции');
      }
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  // Компактный режим отображения при наличии файла
  if (file) {
    return (
      <Card className="w-full border">
        <CardContent className="py-3">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between">
              <div className="flex items-center mr-2 overflow-hidden">
                <FileAudio className="w-5 h-5 mr-2 text-primary flex-shrink-0" />
                <div className="text-sm overflow-hidden">
                  <p className="font-medium text-foreground truncate" title={file.name}>{file.name}</p>
                  <p className="text-muted-foreground text-xs">{(file.size / 1024 / 1024).toFixed(2)} МБ</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Spinner className="w-3.5 h-3.5 mr-1" size="sm" />
                      Обработка...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      Транскрибировать
                    </>
                  )}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    setFile(null);
                    if (onFileChange) {
                      onFileChange(null);
                    }
                  }}
                  className="h-8 w-8"
                  title="Удалить файл"
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Полный режим отображения при отсутствии файла
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Загрузка аудио или видео</CardTitle>
        <CardDescription>
          Загрузите аудио или видео файл для автоматической транскрипции
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center hover:bg-secondary/20 transition-colors cursor-pointer ${
              dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input
              id="file-upload"
              name="file"
              type="file"
              className="hidden"
              accept=".mp3,.wav,.mp4,.flac,.ogg,.webm,audio/*,video/*"
              onChange={handleFileChange}
            />
            <div className="flex flex-col items-center justify-center">
              <FileAudio className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-lg font-medium">
                Выберите файл или перетащите его сюда
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Поддерживаются аудио и видео форматы (MP3, MP4, WAV, FLAC, и другие)
              </p>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={!file || isProcessing}
          >
            {isProcessing ? (
              <>
                <Spinner className="w-4 h-4 mr-2" size="sm" />
                Обработка...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Транскрибировать
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
