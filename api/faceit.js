// api/faceit.js
export default async function handler(req, res) {
  // Разрешаем запросы от StreamElements
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { nick } = req.query;
  
  if (!nick) {
    return res.status(400).json({ error: 'Укажи ник: ?nick=xKarosh1x' });
  }

  // ТВОЙ API-ключ FACEIT
  const FACEIT_API_KEY = 'cf9af14a-245b-4d36-80e4-721625d0532a'; // Вставь свой ключ
  
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
    
    // Проверяем, есть ли данные по CS2
    if (!data.games || !data.games.cs2) {
      return res.status(404).json({ error: 'Игрок не играет в CS2 на FACEIT' });
    }
    
    const cs2Stats = data.games.cs2;
    
    // Формируем красивый русский ответ (БЕЗ МАТЧЕЙ)
    const result = `${nick} | Уровень: ${cs2Stats.skill_level}, Эло: ${cs2Stats.faceit_elo}`;
    
    // Отправляем ответ
    res.status(200).send(result);
    
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}