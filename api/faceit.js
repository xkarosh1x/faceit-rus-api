// api/faceit.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { nick, type } = req.query;
  
  if (!nick) {
    return res.status(400).json({ error: 'Укажи ник: ?nick=xKarosh1x' });
  }

  const FACEIT_API_KEY = 'cf9af14a-245b-4d36-80e4-721625d0532a'; // ВСТАВЬ СВОЙ КЛЮЧ
  
  try {
    // Получаем ID игрока
    const playerRes = await fetch(
      `https://open.faceit.com/data/v4/players?nickname=${nick}`,
      { headers: { 'Authorization': `Bearer ${FACEIT_API_KEY}` } }
    );
    const playerData = await playerRes.json();
    const playerId = playerData.player_id;
    
    // Получаем статистику
    const statsRes = await fetch(
      `https://open.faceit.com/data/v4/players/${playerId}/stats/cs2`,
      { headers: { 'Authorization': `Bearer ${FACEIT_API_KEY}` } }
    );
    const statsData = await statsRes.json();
    
    // Базовые данные об игроке (уровень, эло)
    const cs2Stats = playerData.games.cs2;
    
    // Lifetime статистика
    const lifetime = statsData.lifetime;
    
    // Парсим числа
    const kills = parseInt(lifetime["Kills"]?.replace(/\s/g, '') || "0");
    const matches = parseInt(lifetime["Matches"]?.replace(/\s/g, '') || "1");
    const winRate = lifetime["Win Rate %"]?.replace(/\s/g, '') || "0";
    
    // Для K/D используем готовое значение из API (оно точнее)
    const kd = lifetime["Average K/D Ratio"] || "1.1";
    
    // Базовый ответ (как было)
    if (!type || type === 'base') {
      const result = `${nick} | Уровень: ${cs2Stats.skill_level}, Эло: ${cs2Stats.faceit_elo}`;
      return res.status(200).send(result);
    }
    
    // Средняя статистика
    if (type === 'avg') {
      const avgKills = (kills / matches).toFixed(1);
      // Смертей нет в прямом виде, но K/D = kills/deaths => deaths = kills / kd
      const avgDeaths = (kills / matches / parseFloat(kd)).toFixed(1);
      
      const result = `${nick} | За ${matches} матчей: K/D: ${kd}, Убийств/игру: ${avgKills}, Смертей/игру: ${avgDeaths}, Винрейт: ${winRate}%`;
      return res.status(200).send(result);
    }
    
    // Последний матч
    if (type === 'last') {
      // Берем первый сегмент (последняя карта)
      const lastMatch = statsData.segments?.[0];
      if (!lastMatch) {
        return res.status(404).send(`${nick} | Нет данных о последнем матче`);
      }
      
      const map = lastMatch.label || "неизвестно";
      const matchKills = lastMatch.stats?.["Kills"] || "0";
      const matchDeaths = lastMatch.stats?.["Deaths"] || "0";
      const matchKd = (parseInt(matchKills) / parseInt(matchDeaths)).toFixed(2);
      const result = lastMatch.stats?.["Wins"] === "1" ? "Победа" : "Поражение";
      
      return res.status(200).send(`${nick} | Последний матч: ${map}, ${matchKills}/${matchDeaths} (K/D: ${matchKd}), ${result}`);
    }
    
    return res.status(400).json({ error: 'Неверный тип' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}