'use client';

import { useState } from 'react';
import { StarBorder } from "@/components/ui/star-border";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface GeminiTextProcessorProps {
  transcriptionText: string;
  onProcessedTextChange: (text: string, summary: string) => void;
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
      // Подготавливаем текст с сохранением метаданных
      const paragraphs = transcriptionText.split('\n\n');
      console.log(`Получено ${paragraphs.length} параграфов для обработки`);
      
      // Проверяем первый параграф на наличие таймкодов для отладки
      if (paragraphs.length > 0) {
        const firstParagraph = paragraphs[0];
        console.log("Первый параграф:", firstParagraph.substring(0, 100));
        const hasTimeCode = /^\s*\[(\d{2}:\d{2})(?:\s*-\s*|\s+)(\d{2}:\d{2})\]/.test(firstParagraph);
        const hasSpeaker = /\[Говорящий\s+(\d+)\]\s*:/.test(firstParagraph);
        console.log(`Первый параграф содержит таймкод: ${hasTimeCode}, содержит говорящего: ${hasSpeaker}`);
      }
      
      const preparedParagraphs = paragraphs.map((paragraph, index) => {
        // Проверяем наличие метаданных о времени и говорящем
        const metadataPrefix = [];
        
        // Проверяем метаданные о времени (более гибкое регулярное выражение)
        const timeMatch = paragraph.match(/^\s*\[(\d{2}:\d{2})(?:\s*-\s*|\s+)(\d{2}:\d{2})\]/);
        if (timeMatch) {
          // Нормализуем формат таймкода
          metadataPrefix.push(`[${timeMatch[1]} - ${timeMatch[2]}]`);
          console.log(`Параграф #${index+1}: обнаружен таймкод ${timeMatch[1]} - ${timeMatch[2]}`);
        }
        
        // Проверяем метаданные о говорящем (более гибкая регулярка)
        const speakerMatch = paragraph.match(/\[Говорящий\s+(\d+)\]\s*:/);
        if (speakerMatch) {
          metadataPrefix.push(`[Говорящий ${speakerMatch[1]}]:`);
          console.log(`Параграф #${index+1}: обнаружен говорящий ${speakerMatch[1]}`);
        }
        
        // Возвращаем параграф с метаданными (если они были)
        if (metadataPrefix.length > 0) {
          // Очищаем текст от метаданных для обработки
          let cleanText = paragraph;
          
          // Для более надежного удаления метаданных
          if (timeMatch) {
            cleanText = cleanText.replace(timeMatch[0], '').trim();
          }
          
          if (speakerMatch) {
            cleanText = cleanText.replace(speakerMatch[0], '').trim();
          }
          
          const result = `${metadataPrefix.join(' ')} ${cleanText}`;
          if (index < 2) {
            console.log(`Параграф #${index+1} после обработки: ${result.substring(0, 100)}`);
          }
          return result;
        }
        
        return paragraph;
      });
      
      // Объединяем параграфы обратно в текст
      const textToProcess = preparedParagraphs.join('\n\n');
      
      // Логируем текст для отладки
      console.log("Исходный текст с метаданными:", transcriptionText.substring(0, 300) + "...");
      console.log("Текст для обработки ИИ:", textToProcess.substring(0, 300) + "...");

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToProcess,
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
      console.log("Обновление текста из Gemini:", processedText.substring(0, 300) + "...");
      onProcessedTextChange(processedText, summary);
      toast.success("Текст успешно обработан");
    } catch (error) {
      console.error('Ошибка при обработке текста:', error);
      toast.error(error instanceof Error ? error.message : 'Произошла ошибка при обработке текста');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
      className="w-full sm:w-auto"
    >
      <StarBorder
        onClick={processText}
        disabled={isProcessing || !transcriptionText}
        className="relative overflow-hidden group w-full"
        background="bg-black"
        textColor="text-white"
        borderColor="border-blue-700"
      >
        <div className="flex flex-row items-center justify-center">
          {isProcessing ? (
            <Spinner className="mr-2" size="md" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4 text-primary-foreground" />
          )}
          <span>Обработать с помощью ИИ</span>
        </div>
      </StarBorder>
    </motion.div>
  );
}
