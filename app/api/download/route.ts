import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph } from 'docx';
import JSZip from 'jszip';

export async function POST(request: NextRequest) {
  try {
    const { text, format } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Текст не предоставлен' }, { status: 400 });
    }

    if (format === 'docx') {
      // Создаем DOCX документ
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ text }),
          ],
        }],
      });

      // Упаковываем документ в Buffer
      const buffer = await Packer.toBuffer(doc);

      // Возвращаем документ как ответ
      return new NextResponse(buffer, {
        headers: {
          'Content-Disposition': 'attachment; filename="transcription.docx"',
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      });
    } else if (format === 'odt') {
      // Создаем простой ODT файл с помощью JSZip
      const zip = new JSZip();

      // Добавляем mimetype файл
      zip.file('mimetype', 'application/vnd.oasis.opendocument.text');

      // Добавляем META-INF/manifest.xml
      zip.folder('META-INF')?.file('manifest.xml', `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">
  <manifest:file-entry manifest:media-type="application/vnd.oasis.opendocument.text" manifest:full-path="/"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="meta.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="styles.xml"/>
</manifest:manifest>`);

      // Преобразуем текст, экранируя специальные символы
      const sanitizedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      // Добавляем content.xml с текстом
      zip.file('content.xml', `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
  <office:body>
    <office:text>
      <text:p>${sanitizedText}</text:p>
    </office:text>
  </office:body>
</office:document-content>`);

      // Добавляем мета-информацию
      zip.file('meta.xml', `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <office:meta>
    <dc:title>Transcription App</dc:title>
    <dc:date>${new Date().toISOString()}</dc:date>
  </office:meta>
</office:document-meta>`);

      zip.file('styles.xml', `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0">
  <office:styles/>
</office:document-styles>`);

      // Генерируем ODT файл
      const odtBuffer = await zip.generateAsync({ type: 'nodebuffer' });

      // Возвращаем ODT как ответ
      return new NextResponse(odtBuffer, {
        headers: {
          'Content-Disposition': 'attachment; filename="transcription.odt"',
          'Content-Type': 'application/vnd.oasis.opendocument.text',
        },
      });
    } else {
      return NextResponse.json({ error: 'Неподдерживаемый формат' }, { status: 400 });
    }
  } catch (error) {
    console.error('Ошибка при скачивании файла:', error);
    return NextResponse.json(
      { error: 'Ошибка при обработке запроса' },
      { status: 500 }
    );
  }
}
