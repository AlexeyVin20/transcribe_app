'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TranscriptionForm from '@/app/components/TranscriptionForm';
import TranscriptionResult from '@/app/components/TranscriptionResult';
import { motion } from "framer-motion";

export default function Home() {
  const [transcription, setTranscription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcriptionData, setTranscriptionData] = useState<{ text: string } | null>(null);

  const handleTranscriptionResult = (data: { text: string } | null) => {
    if (data && typeof data === 'object' && data.text) {
      setTranscription(data.text);
      setTranscriptionData(data);
    } else {
      setError('Получены некорректные данные транскрипции');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container max-w-6xl mx-auto px-4 py-12"
      >
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-3"
          >
            Транскрипция и обработка аудио/видео
          </motion.h1>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="bg-card rounded-xl shadow-lg border p-1"
        >
          <Tabs defaultValue="transcription" className="w-full">
            <TabsList className="grid w-full grid-cols-1 h-auto p-1 mb-4">
              <TabsTrigger value="transcription" className="text-lg py-3">
                Транскрипция
              </TabsTrigger>
            </TabsList>
            <TabsContent value="transcription" className="space-y-6 p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <TranscriptionForm
                    onTranscriptionComplete={handleTranscriptionResult}
                    setIsLoading={setIsLoading}
                    setError={setError}
                  />
                </div>
                <div className="md:border-l pl-0 md:pl-8 pt-8 md:pt-0">
                  <TranscriptionResult
                    transcription={transcription}
                    transcriptionData={transcriptionData}
                    isLoading={isLoading}
                    error={error}
                    onTranscriptionChange={(text) => setTranscription(text)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </div>
  );
}
