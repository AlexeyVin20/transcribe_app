'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TranscriptionForm from '@/app/components/TranscriptionForm';
import TranscriptionResult from '@/app/components/TranscriptionResult';
import { motion } from "framer-motion";

export default function Home() {
  const [transcription, setTranscription] = useState('');
  const [transcriptionData, setTranscriptionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [hasTranscription, setHasTranscription] = useState(false);

  const handleTranscriptionComplete = (data: any) => {
    setTranscription(data.text || '');
    setTranscriptionData(data);
    setHasTranscription(true);
  };

  const handleFileChange = (file: File | null) => {
    setAudioFile(file);
    if (!file) {
      setHasTranscription(false);
      setTranscription('');
      setTranscriptionData(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container max-w-6xl mx-auto px-4 py-8"
      >
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-3xl md:text-4xl font-bold tracking-tight mb-2"
          >
            Транскрипция и обработка аудио/видео
          </motion.h1>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="bg-card rounded-xl shadow-lg border"
        >
          <Tabs defaultValue="transcription" className="w-full">
            <TabsList className="grid w-full grid-cols-1 h-auto p-1">
              <TabsTrigger value="transcription" className="text-lg py-2">
                Транскрипция
              </TabsTrigger>
            </TabsList>
            <TabsContent value="transcription" className="p-4">
              {!hasTranscription ? (
                <div className="grid md:grid-cols-2 gap-6 p-2">
                  <div className="rounded-xl overflow-hidden">
                    <TranscriptionForm
                      onTranscriptionComplete={handleTranscriptionComplete}
                      setIsLoading={setIsLoading}
                      setError={setError}
                      onFileChange={handleFileChange}
                    />
                  </div>
                  <div className="flex items-center justify-center rounded-xl border border-dashed p-8 text-muted-foreground">
                    <p className="text-center">Ожидание файла для транскрипции</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col space-y-4">
                  <div className="w-full rounded-xl overflow-hidden">
                    <TranscriptionForm
                      onTranscriptionComplete={handleTranscriptionComplete}
                      setIsLoading={setIsLoading}
                      setError={setError}
                      onFileChange={handleFileChange}
                    />
                  </div>
                  <div className="w-full mt-2">
                    <TranscriptionResult
                      transcription={transcription}
                      transcriptionData={transcriptionData}
                      isLoading={isLoading}
                      error={error}
                      originalAudioFile={audioFile}
                      onTranscriptionChange={(newText) => setTranscription(newText)}
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </div>
  );
}
