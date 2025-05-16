import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'API ключ OpenRouter не найден в переменных окружения' }, { status: 500 });
    }

    if (!text) {
      return NextResponse.json({ error: 'Текст не предоставлен' }, { status: 400 });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat:free',
        messages: [
          {
            role: 'user',
            content: `Проанализируй следующий текст транскрипции и выполни задачи:
1. Исправь грамматические и пунктуационные ошибки в тексте
2. Сохрани смысл и все слова из оригинала
3. Если найдешь несоответствия названий, то исправь их.
4. МНТК - название компании. 
5. Абзацы всегда дели с помощью \n\n.
6. ВАЖНО: ОБЯЗАТЕЛЬНО сохраняй метаданные о времени и говорящем в ТОЧНО ТАКОМ ЖЕ формате "[MM:SS - MM:SS] [Говорящий N]:" в начале каждого абзаца, если они присутствуют в исходном тексте. НИКОГДА не изменяй и не удаляй эти метаданные.
7. Пример, как должен выглядеть абзац с метаданными:
"[03:16 - 03:59] [Говорящий 1]: Текст абзаца с исправленными ошибками..."

Верни результат в формате JSON:
{
  "text": "Исправленный текст с сохраненными метаданными"
  "summary": "Здесь напиши общий смысл всего текста."
}
Текст для анализа:
${text}`
          }
        ],
        temperature: 0.2,
        max_tokens: 99679,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Ошибка при обработке с OpenRouter');
    }

    const data = await response.json();
    console.log("Полный ответ от OpenRouter:", JSON.stringify(data));
    
    // Проверяем структуру данных перед чтением полей
    if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error('Некорректная структура ответа: отсутствуют данные choices');
    }
    
    if (!data.choices[0].message || !data.choices[0].message.content) {
      throw new Error('Некорректная структура ответа: отсутствует сообщение в ответе');
    }
    
    const content = data.choices[0].message.content;

    console.log("Ответ от OpenRouter:", content);

    let parsedData;
    try {
      if (content.trim().startsWith('{')) {
        parsedData = JSON.parse(content);
      } else {
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
                          content.match(/```\n([\s\S]*?)\n```/) ||
                          content.match(/{[\s\S]*?}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          throw new Error('Не удалось найти JSON в ответе');
        }
      }

      if (!parsedData.text || typeof parsedData.text !== 'string') {
        throw new Error('Неверная структура данных в ответе');
      }

      return NextResponse.json(parsedData);
    } catch (e) {
      console.error('Ошибка парсинга JSON из ответа OpenRouter:', e);
      console.error('Полученный ответ:', content);
      return NextResponse.json({
        error: 'Не удалось разобрать ответ от модели',
        rawResponse: content
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Ошибка при обработке запроса OpenRouter:', error);
    return NextResponse.json({ error: 'Ошибка при обработке текста' }, { status: 500 });
  }
}