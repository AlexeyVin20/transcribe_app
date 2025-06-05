import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@deepgram/sdk';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { randomBytes } from 'crypto';

// Конфигурация для Next.js API route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '300mb',
    },
    externalResolver: true,
  },
};

const MAX_FILE_SIZE = 300 * 1024 * 1024; // 300MB

const INPUT_SUPPORTED_FORMATS = [
  // Существующие форматы
  'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav',
  'audio/x-wav', 'audio/flac', 'audio/ogg', 'video/mp4',
  'video/webm', 'audio/webm',
  // Добавляем MXF и MTS (хотя MIME типы могут быть разными, будем проверять по расширению)
  'application/mxf', 'video/m2ts', // Примерные MIME типы, фактическая проверка будет по расширению
];

const DEEPGRAM_SUPPORTED_FORMATS = [
  'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav',
  'audio/x-wav', 'audio/flac', 'audio/ogg', 'video/mp4',
  'video/webm', 'audio/webm'
] as const;

const SUPPORTED_MODELS = ['whisper', 'nova-2', 'nova-3'] as const;

const SUPPORTED_LANGUAGES = ['ru', 'en', 'es', 'fr', 'de'] as const;

type TranscriptionOptions = {
  language: typeof SUPPORTED_LANGUAGES[number];
  smart_format: boolean;
  punctuate: boolean;
  paragraphs: boolean;
  diarize: boolean;
  utterances: boolean;
  words: boolean;
  model: typeof SUPPORTED_MODELS[number];
};

// Функция для конвертации в MP3 с использованием ffmpeg
async function convertToMp3(inputFileBuffer: Buffer, originalFileName: string): Promise<{ buffer: Buffer, cleanup: () => Promise<void> }> {
  const tempInputId = randomBytes(16).toString('hex');
  const tempInputPath = path.join(os.tmpdir(), `${tempInputId}_${originalFileName}`);
  const tempOutputPath = path.join(os.tmpdir(), `${tempInputId}.mp3`);

  await fs.writeFile(tempInputPath, inputFileBuffer);

  console.log(`[INFO] Начало конвертации файла: ${originalFileName} в MP3. Временный входной файл: ${tempInputPath}`);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', tempInputPath,
      '-vn',             // Отключить видео
      '-acodec', 'libmp3lame', // Аудиокодек MP3
      '-ab', '192k',      // Битрейт аудио
      '-ar', '44100',     // Частота дискретизации
      '-ac', '2',          // Количество аудиоканалов (стерео)
      tempOutputPath
    ]);

    let ffmpegOutput = '';
    ffmpeg.stdout.on('data', (data) => {
      ffmpegOutput += data.toString();
    });
    ffmpeg.stderr.on('data', (data) => {
      ffmpegOutput += data.toString();
    });

    ffmpeg.on('close', async (code) => {
      console.log(`[INFO] ffmpeg STDOUT/STDERR: ${ffmpegOutput}`);
      if (code === 0) {
        console.log(`[INFO] Файл успешно сконвертирован в MP3: ${tempOutputPath}`);
        try {
          const outputFileBuffer = await fs.readFile(tempOutputPath);
          const cleanup = async () => {
            try {
              await fs.unlink(tempInputPath);
              await fs.unlink(tempOutputPath);
              console.log(`[INFO] Временные файлы удалены: ${tempInputPath}, ${tempOutputPath}`);
            } catch (cleanupError) {
              console.error('[ERROR] Ошибка при удалении временных файлов:', cleanupError);
            }
          };
          resolve({ buffer: outputFileBuffer, cleanup });
        } catch (readError) {
          console.error('[ERROR] Ошибка чтения сконвертированного файла:', readError);
          reject(new Error('Ошибка чтения сконвертированного файла'));
        }
      } else {
        console.error(`[ERROR] Ошибка конвертации ffmpeg (код: ${code}): ${ffmpegOutput}`);
        // Попытаемся удалить временные файлы даже в случае ошибки
        try {
          await fs.unlink(tempInputPath);
        } catch (e) { /* Игнорируем ошибку удаления входного файла */ }
        try {
          await fs.unlink(tempOutputPath); // Выходного файла может и не быть
        } catch (e) { /* Игнорируем ошибку удаления выходного файла */ }
        reject(new Error(`Ошибка конвертации файла (код: ${code})`));
      }
    });

    ffmpeg.on('error', (err) => {
      console.error('[ERROR] Не удалось запустить ffmpeg:', err);
      reject(new Error('Не удалось запустить процесс конвертации. Убедитесь, что ffmpeg установлен и доступен в PATH.'));
    });
  });
}

export async function POST(request: NextRequest) {
  console.log('[INFO] Получен запрос на транскрипцию');

  if (!process.env.DEEPGRAM_API_KEY) {
    console.error('[ERROR] API ключ Deepgram не найден в переменных окружения');
    return NextResponse.json({ error: 'Ошибка конфигурации сервера' }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Безопасное получение formData с обработкой ошибок
    let formData;
    try {
      formData = await request.formData();
    } catch (formError) {
      console.error('[ERROR] Ошибка получения formData:', formError);
      return NextResponse.json({ 
        error: 'Ошибка при получении данных формы. Возможно, превышен размер файла.'
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const file = formData.get('file') as File;
    const model = formData.get('model') as typeof SUPPORTED_MODELS[number];
    const needTimestamps = formData.get('timestamps') === 'true';

    if (!file) {
      console.error('[ERROR] Файл не предоставлен');
      return NextResponse.json({ error: 'Файл не предоставлен' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const originalFileType = file.type.toLowerCase();
    const originalFileName = file.name;
    const fileExtension = path.extname(originalFileName).toLowerCase();

    let buffer: Buffer;
    let finalFileType = originalFileType;
    let cleanupConverterFiles: (() => Promise<void>) | null = null;

    try {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } catch (bufferError) {
      console.error('[ERROR] Ошибка при преобразовании файла в буфер:', bufferError);
      return NextResponse.json({ error: 'Ошибка при обработке файла' }, { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Конвертация для .mxf и .mts файлов
    if (['.mxf', '.mts'].includes(fileExtension)) {
      console.log(`[INFO] Обнаружен файл ${fileExtension}, требуется конвертация.`);
      try {
        const conversionResult = await convertToMp3(buffer, originalFileName);
        buffer = conversionResult.buffer;
        cleanupConverterFiles = conversionResult.cleanup;
        finalFileType = 'audio/mpeg'; // MP3 MIME type
        console.log('[INFO] Файл успешно сконвертирован в MP3.');
      } catch (conversionError: any) {
        console.error('[ERROR] Ошибка конвертации файла:', conversionError);
        return NextResponse.json({
          error: `Ошибка конвертации файла: ${conversionError.message}`
        }, { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (file.size > MAX_FILE_SIZE && !['.mxf', '.mts'].includes(fileExtension)) { // Проверяем размер исходного файла, если не конвертировался
      console.error('[ERROR] Превышен размер файла:', file.size);
      if (cleanupConverterFiles) await cleanupConverterFiles();
      return NextResponse.json({
        error: 'Размер файла превышает допустимый лимит (300MB)'
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Проверка размера сконвертированного файла (если была конвертация)
    if (['.mxf', '.mts'].includes(fileExtension) && buffer.length > MAX_FILE_SIZE) {
        console.error('[ERROR] Превышен размер сконвертированного файла:', buffer.length);
        if (cleanupConverterFiles) await cleanupConverterFiles();
        return NextResponse.json({
            error: 'Размер сконвертированного файла превышает допустимый лимит (300MB)'
        }, { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!DEEPGRAM_SUPPORTED_FORMATS.some(format => finalFileType.includes(format))) {
      console.error('[ERROR] Неподдерживаемый формат файла для Deepgram:', finalFileType, 'Исходный тип:', originalFileType);
      if (cleanupConverterFiles) await cleanupConverterFiles();
      return NextResponse.json({
        error: 'Неподдерживаемый формат файла для транскрипции. Используйте MP3, WAV, MP4, FLAC, OGG или WebM, или MXF/MTS для автоконвертации.'
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!SUPPORTED_MODELS.includes(model)) {
      console.error('[ERROR] Неподдерживаемая модель:', model);
      if (cleanupConverterFiles) await cleanupConverterFiles();
      return NextResponse.json({
        error: 'Неподдерживаемая модель транскрипции'
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    
    console.log('[INFO] Модель транскрипции:', model);
    
    // Безопасный вызов API с обработкой ошибок
    let result, error;
    try {
      const transcriptionResponse = await deepgram.listen.prerecorded.transcribeFile(
        buffer,
        {
          model: model,
          language: 'multi',
          smart_format: true,
          punctuate: true,
          paragraphs: true,
          diarize: true,
          utterances: false,
          words: needTimestamps
        }
      );
      result = transcriptionResponse.result;
      error = transcriptionResponse.error;
    } catch (apiError) {
      console.error('[ERROR] Ошибка при вызове API Deepgram:', apiError);
      if (cleanupConverterFiles) await cleanupConverterFiles();
      return NextResponse.json({
        error: 'Ошибка при транскрипции. Возможно, превышен таймаут или проблема с сетевым соединением.'
      }, { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (error) {
      console.error('[ERROR] Ошибка API Deepgram:', error);
      if (cleanupConverterFiles) await cleanupConverterFiles();
      return NextResponse.json({
        error: 'Ошибка при транскрипции'
      }, { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!result?.results) {
      console.error('[ERROR] Пустой результат от Deepgram API');
      if (cleanupConverterFiles) await cleanupConverterFiles();
      return NextResponse.json({
        error: 'Ошибка при получении результатов транскрипции'
      }, { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const alternative = result.results.channels[0]?.alternatives[0];
    if (!alternative) {
      console.error('[ERROR] Не найдены альтернативы в результате Deepgram');
      if (cleanupConverterFiles) await cleanupConverterFiles();
      return NextResponse.json({
        error: 'Транскрипция не удалась'
      }, { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response = {
      text: alternative.transcript || '',
      ...(needTimestamps && alternative.words ? { words: alternative.words } : {}),
      ...(alternative.paragraphs ? { paragraphs: alternative.paragraphs.paragraphs } : {}),
      metadata: {
        duration: (() => {
          if (alternative.words && alternative.words.length > 0) {
            return alternative.words[alternative.words.length - 1].end;
          }
          if (alternative.paragraphs && alternative.paragraphs.paragraphs && alternative.paragraphs.paragraphs.length > 0) {
            return alternative.paragraphs.paragraphs[alternative.paragraphs.paragraphs.length - 1].end;
          }
          return null;
        })()
      }
    };

    console.log('[INFO] Успешная транскрипция, текст длиной:', response.text.length);
    
    if (cleanupConverterFiles) await cleanupConverterFiles();
    
    return NextResponse.json(response, { 
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[ERROR] Общая ошибка при обработке запроса:', error);
    return NextResponse.json({
      error: 'Ошибка при обработке файла. Проверьте формат и целостность файла.'
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
