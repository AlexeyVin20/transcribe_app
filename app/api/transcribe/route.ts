import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@deepgram/sdk';

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

const SUPPORTED_FORMATS = [
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

    if (file.size > MAX_FILE_SIZE) {
      console.error('[ERROR] Превышен размер файла:', file.size);
      return NextResponse.json({
        error: 'Размер файла превышает допустимый лимит (300MB)'
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const fileType = file.type.toLowerCase();
    if (!SUPPORTED_FORMATS.some(format => fileType.includes(format))) {
      console.error('[ERROR] Неподдерживаемый формат файла:', fileType);
      return NextResponse.json({
        error: 'Неподдерживаемый формат файла. Используйте MP3, WAV, MP4, FLAC, OGG или WebM.'
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!SUPPORTED_MODELS.includes(model)) {
      console.error('[ERROR] Неподдерживаемая модель:', model);
      return NextResponse.json({
        error: 'Неподдерживаемая модель транскрипции'
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Безопасное получение буфера
    let buffer;
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

    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    
    console.log('[INFO] Модель транскрипции:', model);
    
    // Безопасный вызов API с обработкой ошибок
    let result, error;
    try {
      const transcriptionResponse = await deepgram.listen.prerecorded.transcribeFile(
        buffer,
        {
          model: 'nova-3',
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
      return NextResponse.json({
        error: 'Ошибка при транскрипции. Возможно, превышен таймаут или проблема с сетевым соединением.'
      }, { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (error) {
      console.error('[ERROR] Ошибка API Deepgram:', error);
      return NextResponse.json({
        error: 'Ошибка при транскрипции'
      }, { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!result?.results) {
      console.error('[ERROR] Пустой результат от Deepgram API');
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
      ...(alternative.paragraphs ? { paragraphs: alternative.paragraphs.paragraphs } : {})
    };

    console.log('[INFO] Успешная транскрипция, текст длиной:', response.text.length);
    
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
