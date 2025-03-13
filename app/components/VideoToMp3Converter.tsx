'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/Spinner";

export default function VideoToMp3Converter() {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionComplete, setConversionComplete] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setConversionComplete(false);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      toast.error("Пожалуйста, выберите файл для конвертации");
      return;
    }

    const validFormats = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!validFormats.some(format => file.type.includes(format))) {
      toast.error("Неподдерживаемый формат файла. Используйте MP4, WebM, OGG или QuickTime.");
      return;
    }

    setIsConverting(true);

    try {
      const formData = new FormData();
      formData.append('video', file);

      const response = await fetch('/api/convert-to-mp3', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Произошла ошибка при конвертации');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${file.name.split('.')[0]}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      setConversionComplete(true);
      toast.success("Конвертация завершена. Файл скачивается.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Произошла ошибка при конвертации');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Конвертер видео в MP3</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full items-center gap-4">
          <div className="flex flex-col space-y-1.5">
            <label htmlFor="video-file" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Выберите видеофайл
            </label>
            <input
              id="video-file"
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              disabled={isConverting}
              className="flex h-10 px-3 py-2 border border-input bg-background text-sm rounded-md file:border-0 file:bg-transparent file:text-sm file:font-medium"
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Выбран файл: {file.name}
              </p>
            )}
          </div>
        </div>
        
        <Button 
          onClick={handleConvert} 
          disabled={!file || isConverting}
          className="w-full"
        >
          {isConverting ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Конвертация...
            </>
          ) : (
            "Конвертировать в MP3"
          )}
        </Button>
        
        {conversionComplete && (
          <p className="text-sm text-green-600 text-center mt-2">
            Конвертация успешно завершена!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
