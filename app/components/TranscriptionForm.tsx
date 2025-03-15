'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { FileAudio, Upload, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface TranscriptionFormProps {
  onTranscriptionComplete: (data: any) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export default function TranscriptionForm({
  onTranscriptionComplete,
  setIsLoading,
  setError
}: TranscriptionFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
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
    formData.append('model', 'nova-2');
    formData.append('timestamps', 'false');

    setIsLoading(true);
    setError(null);

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
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Загрузка аудио или видео</CardTitle>
        <CardDescription>
          Загрузите аудио или видео файл для автоматической транскрипции
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer ${
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
              <FileAudio className="w-12 h-12 text-gray-400 mb-2" />
              <p className="text-lg font-medium">
                Выберите файл или перетащите его сюда
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Поддерживаются аудио и видео форматы (MP3, MP4, WAV, FLAC, и другие)
              </p>
            </div>
          </div>

          {file && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-3 bg-primary/5 rounded-lg"
            >
              <div className="flex items-center">
                <FileAudio className="w-5 h-5 mr-2 text-primary" />
                <div className="text-sm">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} МБ</p>
                </div>
              </div>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => setFile(null)}
              >
                Удалить
              </Button>
            </motion.div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={!file}
          >
            <Upload className="w-4 h-4 mr-2" />
            Транскрибировать
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
