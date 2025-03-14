import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@deepgram/sdk';

export async function POST(request: NextRequest) {
  try {
    console.log('[INFO] Получен запрос на транскрипцию');

    if (!process.env.DEEPGRAM_API_KEY) {
      console.error('[ERROR] API ключ Deepgram не найден в переменных окружения');
      return NextResponse.json({ error: 'Ошибка конфигурации сервера' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const model = formData.get('model') as string;
    const needTimestamps = formData.get('timestamps') === 'true';

    if (!file) {
      console.error('[ERROR] Файл не предоставлен');
      return NextResponse.json({ error: 'Файл не предоставлен' }, { status: 400 });
    }

    const fileType = file.type.toLowerCase();
    const supportedFormats = [
      'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav',
      'audio/x-wav', 'audio/flac', 'audio/ogg', 'video/mp4',
      'video/webm', 'audio/webm'
    ];

    if (!supportedFormats.some(format => fileType.includes(format))) {
      console.error('[ERROR] Неподдерживаемый формат файла:', fileType);
      return NextResponse.json({
        error: 'Неподдерживаемый формат файла. Используйте MP3, WAV, MP4, FLAC, OGG или WebM.'
      }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

    let options = {
      language: 'ru',
      smart_format: true,
      punctuate: true,
      paragraphs: true,
      diarize: true,
      utterances: true,
      words: needTimestamps,
    };

    if (model === 'whisper') {
      options.model = 'whisper';
    } else {
      options.model = model === 'nova-2' ? 'nova-2' : 'nova-3';
    }

    console.log('[INFO] Параметры транскрипции:', options);

    try {
      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        buffer,
        options
      );

      if (error) {
        console.error('[ERROR] Ошибка API Deepgram:', error);
        throw error;
      }

      if (!result || !result.results) {
        console.error('[ERROR] Пустой результат от Deepgram API');
        return NextResponse.json({ error: 'Ошибка при получении результатов транскрипции' }, { status: 500 });
      }

      const alternative = result.results.channels[0]?.alternatives[0];
      if (!alternative) {
        console.error('[ERROR] Не найдены альтернативы в результате Deepgram');
        return NextResponse.json({ error: 'Транскрипция не удалась' }, { status: 500 });
      }

      const response = {
        text: alternative.transcript || '',
      };

      if (needTimestamps && alternative.words) {
        response['words'] = alternative.words;
      }

      if (alternative.paragraphs) {
        response['paragraphs'] = alternative.paragraphs.paragraphs;
      }

      console.log('[INFO] Успешная транскрипция, текст длиной:', response.text.length);
      return NextResponse.json(response);
    } catch (apiError) {
      console.error('[ERROR] Ошибка Deepgram API:', apiError);
      return NextResponse.json({ error: 'Ошибка при транскрипции. Проверьте формат файла.' }, { status: 500 });
    }
  } catch (error) {
    console.error('[ERROR] Общая ошибка при обработке запроса:', error);
    return NextResponse.json({ error: 'Ошибка при обработке файла. Проверьте формат и целостность файла.' }, { status: 500 });
  }
}