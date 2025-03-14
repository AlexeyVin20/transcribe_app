'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "sonner";

interface GeminiTextProcessorProps {
  transcriptionText: string;
  onProcessedTextChange: (text: string, summary: string) => void; // Обновляем сигнатуру
}

export default function GeminiTextProcessor({
  transcriptionText,
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

      if (!data.text || typeof data.text !== 'string' || !data.summary || typeof data.summary !== 'string') {
        throw new Error('Недопустимый формат данных из API');
      }

      const processedText = data.text;
      const summary = data.summary;
      onProcessedTextChange(processedText, summary); // Передаем оба значения
      toast.success("Текст успешно обработан");
    } catch (error) {
      console.error('Ошибка при обработке текста:', error);
      toast.error(error instanceof Error ? error.message : 'Произошла ошибка при обработке текста');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <Button
          onClick={processText}
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : null}
          Обработать текст с помощью ИИ
        </Button>
      </CardContent>
    </Card>
  );
}