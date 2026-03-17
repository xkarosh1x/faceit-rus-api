// api/faceit.js
export default async function handler(req, res) {
  // Разрешаем запросы от StreamElements
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Получаем ник из запроса (например, /api/faceit?nick=xKarosh1x)
  const { nick } = req.query;
  
  if (!nick) {
    return res.status(400).json({ error: 'Укажи ник: ?nick=xKarosh1x' });
  }

  // Твой API-ключ FACEIT (вставь сюда свой)
  const FACEIT_API_KEY = 'cf9af14a-245b-4d36-80e4-721625d0532a';
  
  try {
    // Запрашиваем данные у FACEIT API
    const response = await fetch(
      `https://open.faceit.com/data/v4/players?nickname=${nick}`,
      {
        headers: {
          'Authorization': `Bearer ${FACEIT_API_KEY}`
        }
      }
    );
    
    const data = await response.json();
    
    // Проверяем, нашелся ли игрок
    if (data.errors) {
      return res.status(404).json({ error: 'Игрок не найден' });
    }
    
    // Забираем нужные данные по CS2
    const cs2Stats = data.games.cs2;
    
    // Формируем красивый русский ответ
    const result = `${nick} | Уровень: ${cs2Stats.skill_level}, Эло: ${cs2Stats.faceit_elo}, Матчей: ${cs2Stats.matches_count}`;
    
    // Отправляем ответ
    res.status(200).send(result);
    
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}