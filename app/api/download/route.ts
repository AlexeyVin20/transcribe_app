import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import JSZip from 'jszip';

export async function POST(request: NextRequest) {
  try {
    const { text, format } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Текст не предоставлен' }, { status: 400 });
    }

    // Разбиваем текст на абзацы и добавляем типизацию
    const paragraphs: string[] = text.split(/\n\s*\n/);

    if (format === 'docx') {
      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs.map((para: string) => 
            new Paragraph({
              children: [new TextRun(para.trim())],
              spacing: {
                after: 240,
                line: 360,
              }
            })
          ),
        }],
      });

      const buffer = await Packer.toBuffer(doc);

      return new NextResponse(buffer, {
        headers: {
          'Content-Disposition': 'attachment; filename="transcription.docx"',
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      });
    } else if (format === 'odt') {
      const zip = new JSZip();

      // Добавляем mimetype файл (должен быть первым и без сжатия)
      zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });

      // Обновляем manifest.xml
      zip.folder('META-INF')?.file('manifest.xml', `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">
  <manifest:file-entry manifest:media-type="application/vnd.oasis.opendocument.text" manifest:version="1.2" manifest:full-path="/"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="styles.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="meta.xml"/>
</manifest:manifest>`);

      // Форматируем абзацы для ODT с двойным переносом
      const formattedParagraphs = paragraphs
        .map((para: string) => {
          const sanitizedText = para.trim()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
          return `<text:p text:style-name="P1">${sanitizedText}</text:p>\n<text:p text:style-name="P2"></text:p>`;
        })
        .join('\n');

      // Обновляем content.xml с правильными пространствами имен и стилями
      zip.file('content.xml', `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  office:version="1.2">
  <office:automatic-styles>
    <style:style style:name="P1" style:family="paragraph" style:parent-style-name="Standard">
      <style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0.247cm" fo:line-height="150%"/>
    </style:style>
    <style:style style:name="P2" style:family="paragraph" style:parent-style-name="Standard">
      <style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0.247cm"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:text>
      ${formattedParagraphs}
    </office:text>
  </office:body>
</office:document-content>`);

      // Обновляем styles.xml с базовыми стилями
      zip.file('styles.xml', `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  office:version="1.2">
  <office:styles>
    <style:style style:name="Standard" style:family="paragraph" style:class="text"/>
  </office:styles>
</office:document-styles>`);

      // Создаем ODT файл
      const odtBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        mimeType: 'application/vnd.oasis.opendocument.text',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 9
        }
      });

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
