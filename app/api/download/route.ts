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
          properties: {
            page: {
              margin: {
                top: 567, // 1 см = примерно 567 твипов
                right: 567, // 1 см правое поле
                bottom: 567,
                left: 567
              }
            }
          },
          children: paragraphs.map((para: string) => 
            new Paragraph({
              children: [
                new TextRun({
                  text: para.trim(),
                  font: "Times New Roman",
                  size: 28 // 14pt = 28 half-points
                })
              ],
              spacing: {
                after: 240,
                line: 360,
              },
              alignment: "both", // "both" соответствует выравниванию по ширине в docx
              indent: {
                firstLine: 567 // 1 см = примерно 567 твипов (1 см = 28.35 пунктов, 1 пункт = 20 твипов)
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

      // Обновляем content.xml с правильными пространствами и стилями
      zip.file('content.xml', `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  office:version="1.2">
  <office:automatic-styles>
    <style:style style:name="P1" style:family="paragraph" style:parent-style-name="Standard">
      <style:paragraph-properties 
        fo:margin-top="0cm" 
        fo:margin-bottom="0.247cm" 
        fo:line-height="150%"
        fo:text-align="justify"
        fo:text-indent="1cm"/>
      <style:text-properties 
        style:font-name="Times New Roman"
        fo:font-size="14pt"/>
    </style:style>
    <style:style style:name="P2" style:family="paragraph" style:parent-style-name="Standard">
      <style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0.247cm"/>
    </style:style>
    <style:page-layout style:name="pm1">
      <style:page-layout-properties 
        fo:margin-top="1cm" 
        fo:margin-bottom="1cm" 
        fo:margin-left="1cm" 
        fo:margin-right="1cm" 
        style:print-orientation="portrait" />
    </style:page-layout>
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
  xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
  office:version="1.2">
  <office:styles>
    <style:style style:name="Standard" style:family="paragraph" style:class="text">
      <style:text-properties style:font-name="Times New Roman" fo:font-size="14pt"/>
    </style:style>
  </office:styles>
  <office:master-styles>
    <style:master-page style:name="Standard" style:page-layout-name="pm1"/>
  </office:master-styles>
  <office:font-face-decls>
    <style:font-face style:name="Times New Roman" svg:font-family="'Times New Roman'" style:font-family-generic="roman"/>
  </office:font-face-decls>
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
