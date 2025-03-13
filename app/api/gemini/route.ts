import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    
    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'API ключ Google не найден в переменных окружения' }, { status: 500 });
    }
    
    if (!text) {
      return NextResponse.json({ error: 'Текст не предоставлен' }, { status: 400 });
    }
    
    // Формируем запрос к Gemini API
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=' + process.env.GOOGLE_API_KEY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Проанализируй следующий текст транскрипции и выполни задачи:
            1. Исправь грамматические и пунктуационные ошибки в тексте
            2. Сохрани смысл и все слова из оригинала
            3. Верни текст одним целым блоком без разделения на абзацы
            
            Верни результат в формате JSON:
                {
                  "text": "Исправленный текст"
                }
            Текст для анализа:
            ${text}`
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        }
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Ошибка при обработке с Gemini');
    }
    
    const data = await response.json();
    
    // Извлекаем текст из ответа
    const content = data.candidates[0].content;
    const textResponse = content.parts[0].text;
    
    console.log("Ответ от Gemini:", textResponse);
    
    // Извлекаем JSON из текстового ответа
    let parsedData;
    try {
      // Если ответ уже в формате JSON, просто парсим его
      if (textResponse.trim().startsWith('{')) {
        parsedData = JSON.parse(textResponse);
      } else {
        // Ищем JSON в тексте с учетом различных форматов кода
        const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || 
                          textResponse.match(/```\n([\s\S]*?)\n```/) ||
                          textResponse.match(/{[\s\S]*?}/);
                          
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          // Если не нашли JSON, возвращаем ошибку
          throw new Error('Не удалось найти JSON в ответе');
        }
      }
      
      // Проверяем структуру данных
      if (!parsedData.text || typeof parsedData.text !== 'string') {
        throw new Error('Неверная структура данных в ответе');
      }
      
      return NextResponse.json(parsedData);
    } catch (e) {
      console.error('Ошибка парсинга JSON из ответа Gemini:', e);
      console.error('Полученный ответ:', textResponse);
      return NextResponse.json({ 
        error: 'Не удалось разобрать ответ от модели',
        rawResponse: textResponse 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Ошибка при обработке запроса Gemini:', error);
    return NextResponse.json({ error: 'Ошибка при обработке текста' }, { status: 500 });
  }
}