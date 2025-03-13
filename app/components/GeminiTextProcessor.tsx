'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/Spinner"; 
import { toast } from "sonner";
import { searchTranscriptForTimestamps, formatTime } from '../utils/timestampSearch';

interface GeminiTextProcessorProps {
  transcriptionText: string;
  transcriptionData: any;
  onProcessedTextChange: (text: string) => void;
}

export default function GeminiTextProcessor({
  transcriptionText,
  transcriptionData,
  onProcessedTextChange
}: GeminiTextProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const processText = async () => {
    if (!transcriptionText) {
      toast.error("Нет текста для обработки");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Обрабатываем текст с помощью Gemini
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: transcriptionText,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при обработке текста');
      }
      
      const data = await response.json();
      console.log("Полученные данные от API:", data);
      
      if (!data.text || typeof data.text !== 'string') {
        throw new Error('Недопустимый формат данных из API');
      }
      
      // Получаем обработанный текст
      const processedText = data.text;
      
      // Можно добавить общий таймкод для всего текста
      let finalText = processedText;
      
      // Если есть слова с таймкодами, можно добавить общий диапазон
      if (transcriptionData?.words && transcriptionData.words.length > 0) {
        const firstWord = transcriptionData.words[0];
        const lastWord = transcriptionData.words[transcriptionData.words.length - 1];
        
        if (firstWord && lastWord) {
          const startTime = formatTime(firstWord.startTime);
          const endTime = formatTime(lastWord.endTime);
          finalText = `[${startTime} - ${endTime}] ${processedText}`;
        }
      }
      
      // Обновляем текст транскрипции
      onProcessedTextChange(finalText);
      toast.success("Текст успешно обработан");
    } catch (error) {
      console.error('Ошибка при обработке текста:', error);
      toast.error(error instanceof Error ? error.message : 'Произошла ошибка при обработке текста');
    } finally {
      setIsProcessing(false);
    }
  };
  
}