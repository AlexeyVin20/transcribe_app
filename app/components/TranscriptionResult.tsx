'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/Spinner";
import GeminiTextProcessor from './GeminiTextProcessor';
import { FileDown, FileText, Copy, Check, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

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
  const [summary, setSummary] = useState('');
  const [copied, setCopied] = useState(false);
  
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

  const handleProcessedTextChange = (text: string, summary: string) => {
    setEditableTranscription(text);
    setSummary(summary);
    if (onTranscriptionChange) {
      onTranscriptionChange(text);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(editableTranscription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (format: 'docx' | 'odt') => {
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: editableTranscription,
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
      <Card className="border border-border/50 shadow-md">
        <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center min-h-[300px]">
          <Spinner size="lg" />
          <p className="mt-4 text-center text-muted-foreground">
            Транскрибируем файл, пожалуйста подождите...
          </p>
        </CardContent>
      </Card>
    );
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
    );
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
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="mb-6 shadow-md hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle>Результат транскрипции</CardTitle>
          {editableTranscription && (
            <CardDescription>
              {editableTranscription.split(" ").length} слов, {editableTranscription.length} символов
            </CardDescription>
          )}
        </CardHeader>
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
                {editableTranscription.split('\n').map((paragraph, index) => (
                  <p key={index} className={paragraph.trim() === '' ? 'h-4' : ''}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopyToClipboard}
              className="flex items-center gap-1"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Скопировано' : 'Копировать'}
            </Button>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col sm:flex-row items-center gap-3 pt-0">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline"
              onClick={() => handleDownload('docx')}
              className="flex-1 sm:flex-none hover:bg-primary/5 transition-colors duration-300"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Скачать в DOCX
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleDownload('odt')}
              className="flex-1 sm:flex-none hover:bg-primary/5 transition-colors duration-300"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Скачать в ODT
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
