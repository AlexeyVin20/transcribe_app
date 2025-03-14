'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/Spinner";
import GeminiTextProcessor from './GeminiTextProcessor';

interface TranscriptionResultProps {
  transcription: string;
  transcriptionData: any;
  isLoading: boolean;
  error: string | null;
  onTranscriptionChange?: (text: string) => void;
}

export default function TranscriptionResult({
  transcription,
  transcriptionData,
  isLoading,
  error,
  onTranscriptionChange
}: TranscriptionResultProps) {
  const [editableTranscription, setEditableTranscription] = useState(transcription);
  const [summary, setSummary] = useState(''); // Добавляем состояние для саммари

  useEffect(() => {
    setEditableTranscription(transcription);
  }, [transcription]);

  const handleTranscriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setEditableTranscription(newText);
    if (onTranscriptionChange) {
      onTranscriptionChange(newText);
    }
  };

  const handleProcessedTextChange = (text: string, summary: string) => { // Обновляем сигнатуру
    setEditableTranscription(text);
    setSummary(summary); // Устанавливаем саммари
    if (onTranscriptionChange) {
      onTranscriptionChange(text);
    }
  };

  const handleDownload = async (format: 'docx' | 'odt') => {
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: editableTranscription, // Только текст транскрипции
          format,
        }),
      });
  
      if (!response.ok) {
        throw new Error('Ошибка при скачивании файла');
      }
  
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `transcription.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка при скачивании:', error);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex justify-center items-center p-6">
          <div className="flex flex-col items-center space-y-2">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">Транскрибируем файл, пожалуйста подождите...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-destructive">
        <CardContent className="p-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!transcription && !isLoading && !error) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Результат транскрипции</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 animate-fade-in">
  <GeminiTextProcessor
    transcriptionText={transcription}
    onProcessedTextChange={handleProcessedTextChange}
  />
  <div className="space-y-2">
    <Textarea
      value={editableTranscription}
      onChange={handleTranscriptionChange}
      rows={15}
      className="font-mono text-sm"
      placeholder="Здесь появится текст транскрипции..."
    />
    {summary && (
      <p className="text-red-500 text-sm">{summary}</p>
    )}
  </div>
</CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={() => handleDownload('docx')}
        >
          Скачать в DOCX
        </Button>
        <Button
          variant="outline"
          onClick={() => handleDownload('odt')}
        >
          Скачать в ODT
        </Button>
      </CardFooter>
    </Card>
  );
}