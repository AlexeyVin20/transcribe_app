'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import TranscriptionForm from '@/app/components/TranscriptionForm';
import TranscriptionResult from '@/app/components/TranscriptionResult';
import VideoToMp3Converter from '@/app/components/VideoToMp3Converter';

export default function Home() {
  // Основные состояния
  const [transcription, setTranscription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transcriptionData, setTranscriptionData] = useState(null);
  
  const handleTranscriptionResult = (data) => {
    if (data && typeof data === 'object' && data.text) {
      setTranscription(data.text);
      setTranscriptionData(data);
    } else {
      setError('Получены некорректные данные транскрипции');
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold text-center mb-8">
        Транскрипция и обработка аудио/видео
      </h1>
      
      <Tabs defaultValue="transcription" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="transcription">Транскрипция</TabsTrigger>
          <TabsTrigger value="convert">Конвертация видео в MP3</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transcription" className="space-y-6">
          <TranscriptionForm 
            onTranscriptionComplete={handleTranscriptionResult} 
            setIsLoading={setIsLoading} 
            setError={setError} 
          />
          
          <TranscriptionResult 
            transcription={transcription}
            transcriptionData={transcriptionData}
            isLoading={isLoading}
            error={error}
            onTranscriptionChange={(text) => setTranscription(text)}
          />
        </TabsContent>
        
        <TabsContent value="convert">
          <VideoToMp3Converter />
        </TabsContent>
      </Tabs>
      
      <Toaster />
    </div>
  );
}
