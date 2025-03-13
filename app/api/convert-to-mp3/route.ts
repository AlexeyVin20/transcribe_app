import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { promisify } from 'util';
import { randomUUID } from 'crypto';

const execPromise = promisify(exec);

export async function POST(request: NextRequest) {
  const tempDir = process.env.TEMP_DIR || '/tmp';
  const inputPath = join(tempDir, `input-${randomUUID()}.mp4`);
  const outputPath = join(tempDir, `output-${randomUUID()}.mp3`);
  
  try {
    console.log('[INFO] Получен запрос на конвертацию видео в MP3');
    
    const formData = await request.formData();
    const file = formData.get('video') as File;
    
    if (!file) {
      console.error('[ERROR] Файл не предоставлен');
      return NextResponse.json({ error: 'Файл не предоставлен' }, { status: 400 });
    }
    
    console.log(`[INFO] Получен файл: ${file.name}, тип: ${file.type}, размер: ${file.size} байт`);
    
    // Записываем входной файл
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, buffer);
    console.log(`[INFO] Файл сохранен по пути: ${inputPath}`);
    
    // Конвертируем с помощью ffmpeg
    console.log('[INFO] Запуск конвертации через ffmpeg');
    await execPromise(`ffmpeg -i "${inputPath}" -q:a 0 -map a "${outputPath}"`);
    console.log('[INFO] Конвертация завершена');
    
    // Читаем результат
    const outputBuffer = await readFile(outputPath);
    console.log(`[INFO] MP3 файл создан, размер: ${outputBuffer.length} байт`);
    
    // Удаляем временные файлы
    try {
      await unlink(inputPath);
      await unlink(outputPath);
      console.log('[INFO] Временные файлы удалены');
    } catch (e) {
      console.warn('[WARN] Не удалось удалить временные файлы:', e);
    }
    
    return new NextResponse(outputBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${file.name.split('.')[0]}.mp3"`,
      },
    });
  } catch (error) {
    console.error('[ERROR] Ошибка конвертации:', error);
    
    // Очистка временных файлов
    try {
      await unlink(inputPath);
      await unlink(outputPath);
    } catch (cleanupError) {
      console.warn('[WARN] Ошибка при очистке временных файлов:', cleanupError);
    }
    
    return NextResponse.json({ 
      error: 'Ошибка при конвертации. Проверьте формат файла и наличие ffmpeg на сервере.' 
    }, { status: 500 });
  }
}
