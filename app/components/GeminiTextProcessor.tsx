'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
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
      <Button 
        onClick={processText} 
        disabled={isProcessing || !transcriptionText} 
        variant="default"
        className="relative overflow-hidden group w-full"
      >
        {isProcessing ? (
          <Spinner className="mr-2" size="sm" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4 text-primary-foreground" />
        )}
        <span>Обработать текст с помощью ИИ</span>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/0 via-primary-foreground/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -translate-x-full group-hover:translate-x-full ease-in-out"></div>
      </Button>
    </motion.div>
  );
}
