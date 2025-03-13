'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

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
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
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
    // Используем только nova-2 по умолчанию
    formData.append('model', 'nova-2');
    // Всегда запрашиваем таймкоды для работы с Gemini
    formData.append('timestamps', 'true');
    
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
      
      toast.success("Транскрипция завершена");
      
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Загрузка аудио или видео</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <label htmlFor="file" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Выберите аудио или видео файл
              </label>
              <input 
                id="file" 
                type="file" 
                accept="audio/*,video/*" 
                onChange={handleFileChange} 
                className="flex h-10 px-3 py-2 border border-input bg-background text-sm rounded-md file:border-0 file:bg-transparent file:text-sm file:font-medium"
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Выбран файл: {file.name}
                </p>
              )}
            </div>
          </div>
          <Button type="submit" className="w-full">
            Транскрибировать
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
