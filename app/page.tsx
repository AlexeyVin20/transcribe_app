'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import TranscriptionForm from '@/app/components/TranscriptionForm';
import TranscriptionResult from '@/app/components/TranscriptionResult';

export default function Home() {
  const [transcription, setTranscription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  interface TranscriptionData {
    text: string;
  }
  const [transcriptionData, setTranscriptionData] = useState<TranscriptionData | null>(null);

  const handleTranscriptionResult = (data: { text: string } | null) => {
    if (data && typeof data === 'object' && data.text) {
      setTranscription(data.text);
      setTranscriptionData(data);
    } else {
      setError('Получены некорректные данные транскрипции');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold text-center mb-8 text-primary animate-fade-in">
  Транскрипция и обработка аудио/видео
</h1>

      <Tabs defaultValue="transcription" className="w-full">
      <TabsList className="grid w-full grid-cols-1 mb-8 bg-gray-100 p-1 rounded-lg">
  <TabsTrigger value="transcription" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
    Транскрипция
  </TabsTrigger>
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
      </Tabs>

      <Toaster />
    </div>
  );
}