import { NextRequest, NextResponse } from 'next/server';
import { FFmpeg } from '@ffmpeg/ffmpeg';

export async function POST(request: NextRequest) {
  const ffmpeg = new FFmpeg();

  try {
    // Загружаем FFmpeg
    console.log('[INFO] Загрузка FFmpeg');
    await ffmpeg.load();

    const formData = await request.formData();
    const file = formData.get('video') as File;

    if (!file) {
      console.error('[ERROR] Файл не предоставлен');
      return NextResponse.json({ error: 'Файл не предоставлен' }, { status: 400 });
    }

    const inputName = 'input.mp4';
    const outputName = 'output.mp3';

    // Получаем данные файла как ArrayBuffer и преобразуем в Uint8Array
    console.log('[INFO] Чтение файла в память');
    const fileData = new Uint8Array(await file.arrayBuffer());

    // Записываем файл в виртуальную файловую систему FFmpeg
    console.log('[INFO] Запись файла в виртуальную ФС');
    ffmpeg.FS('writeFile', inputName, fileData);

    // Выполняем команду конвертации
    console.log('[INFO] Запуск конвертации');
    await ffmpeg.run('-i', inputName, '-q:a', '0', '-map', 'a', outputName);

    // Читаем результат
    console.log('[INFO] Чтение сконвертированного файла');
    const data = ffmpeg.FS('readFile', outputName);

    // Возвращаем MP3 файл
    console.log('[INFO] Отправка MP3 файла клиенту');
    return new NextResponse(data.buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${file.name.split('.')[0]}.mp3"`,
      },
    });
  } catch (error) {
    console.error('[ERROR] Ошибка конвертации:', error);
    return NextResponse.json({ error: 'Ошибка при конвертации.' }, { status: 500 });
  } finally {
    // Очистка
    if (ffmpeg) {
      console.log('[INFO] Завершение работы FFmpeg');
      ffmpeg.exit();
    }
  }
}