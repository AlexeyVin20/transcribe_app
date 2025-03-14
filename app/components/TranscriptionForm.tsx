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
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при транскрипции');
      }

      const data = await response.json();
      console.log('Получены данные транскрипции:', data);
      toast.success("Транскрипция успешно завершена");
      onTranscriptionComplete(data);
    } catch (error) {
      console.error('Ошибка транскрипции:', error);
      setError(error instanceof Error ? error.message : 'Произошла ошибка при транскрипции');
      toast.error(error instanceof Error ? error.message : 'Произошла ошибка при транскрипции');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden shadow-md hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl flex items-center gap-2">
          <FileAudio className="h-6 w-6 text-primary" />
          Загрузка аудио или видео
        </CardTitle>
        <CardDescription>
          Загрузите аудио или видео файл для автоматической транскрипции
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div 
            className={`border-2 border-dashed rounded-lg p-8 transition-all duration-200 ease-in-out text-center ${
              dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center gap-4"
            >
              <div className="rounded-full bg-primary/10 p-4">
                <Upload className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-lg">Выберите файл или перетащите его сюда</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Поддерживаются аудио и видео форматы (MP3, MP4, WAV, FLAC, и другие)
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                Выбрать файл
              </Button>
              <input
                id="file-upload"
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </motion.div>
          </div>

          {file && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-secondary/50 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <FileAudio className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} МБ
                  </p>
                </div>
              </div>
              <Button 
                variant="destructive" 
                size="sm" 
                className="h-8" 
                onClick={() => setFile(null)}
              >
                Удалить
              </Button>
            </motion.div>
          )}

          <Button 
            type="submit" 
            className="w-full transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
            disabled={!file}
          >
            <FileAudio className="mr-2 h-4 w-4" />
            Транскрибировать
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
