// api/faceit.js
export default async function handler(req, res) {
  // Разрешаем запросы отовсюду
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { nick, type } = req.query;
  
  if (!nick) {
    return res.status(400).json({ error: 'Укажи ник: ?nick=xKarosh1x' });
  }

  // ТВОЙ API-ключ FACEIT (вставь сюда свой)
  const FACEIT_API_KEY = 'cf9af14a-245b-4d36-80e4-721625d0532a';
  
  try {
    // 1. Сначала получаем базовую информацию (нужен ID игрока)
    const playerResponse = await fetch(
      `https://open.faceit.com/data/v4/players?nickname=${nick}`,
      {
        headers: {
          'Authorization': `Bearer ${FACEIT_API_KEY}`
        }
      }
    );
    
    const playerData = await playerResponse.json();
    
    // Проверяем, есть ли данные по CS2
    if (!playerData.games || !playerData.games.cs2) {
      return res.status(404).json({ error: 'Игрок не играет в CS2 на FACEIT' });
    }
    
    const playerId = playerData.player_id;
    
    // Если тип не указан или type=base — возвращаем базовую информацию
    if (!type || type === 'base') {
      const cs2Stats = playerData.games.cs2;
      const result = `${nick} | Уровень: ${cs2Stats.skill_level}, Эло: ${cs2Stats.faceit_elo}`;
      return res.status(200).send(result);
    }
    
    // 2. Для avg и last — запрашиваем детальную статистику
    if (type === 'avg' || type === 'last') {
      const statsResponse = await fetch(
        `https://open.faceit.com/data/v4/players/${playerId}/stats/cs2`,
        {
          headers: {
            'Authorization': `Bearer ${FACEIT_API_KEY}`
          }
        }
      );
      
      const statsData = await statsResponse.json();
      
      // Считаем средние показатели за последние 20 матчей
      const kills = parseInt(statsData.lifetime["Kills"]) || 0;
      const deaths = parseInt(statsData.lifetime["Deaths"]) || 1;
      const kd = (kills / deaths).toFixed(2);
      const wins = parseInt(statsData.lifetime["Wins"]) || 0;
      const matches = parseInt(statsData.lifetime["Matches"]) || 1;
      const winRate = ((wins / matches) * 100).toFixed(1);
      
      if (type === 'avg') {
        // Средняя статистика за 20 игр
        const avgKills = (kills / matches).toFixed(1);
        const avgDeaths = (deaths / matches).toFixed(1);
        const result = `${nick} | Среднее за 20 игр: K/D: ${kd}, Убийств: ${avgKills}, Смертей: ${avgDeaths}, Винрейт: ${winRate}%`;
        return res.status(200).send(result);
      }
      
      if (type === 'last') {
        // Берем последний матч из сегментов
        const lastMatch = statsData.segments[0];
        if (!lastMatch) {
          return res.status(404).json({ error: 'Нет данных о последнем матче' });
        }
        
        const lastKills = lastMatch.stats["Kills"];
        const lastDeaths = lastMatch.stats["Deaths"];
        const lastKd = (lastKills / lastDeaths).toFixed(2);
        const result = `${nick} | Последний матч: ${lastKills}/${lastDeaths} (K/D: ${lastKd}), Карта: ${lastMatch.stats["Map"] || "N/A"}`;
        return res.status(200).send(result);
      }
    }
    
    // Если тип не распознан
    return res.status(400).json({ error: 'Неверный тип. Используй: base, avg, last' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}