// api/faceit.js - ИСПРАВЛЕННАЯ ВЕРСИЯ С ПРАВИЛЬНЫМИ ПОЛЯМИ
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
    
    if (!playerData || playerData.errors) {
      return res.status(404).json({ error: 'Игрок не найден' });
    }
    
    const playerId = playerData.player_id;
    
    // Получаем статистику
    const statsRes = await fetch(
      `https://open.faceit.com/data/v4/players/${playerId}/stats/cs2`,
      { headers: { 'Authorization': `Bearer ${FACEIT_API_KEY}` } }
    );
    const statsData = await statsRes.json();
    
    // Базовые данные об игроке (уровень, эло)
    const cs2Stats = playerData.games?.cs2;
    if (!cs2Stats) {
      return res.status(404).json({ error: 'Игрок не играет в CS2' });
    }
    
    // Lifetime статистика - используем поля из твоего JSON
    const lifetime = statsData.lifetime || {};
    
    // Парсим числа (убираем пробелы и лишние символы)
    const matches = parseInt(String(lifetime["Matches"] || "0").replace(/\s/g, '')) || 0;
    const kills = parseInt(String(lifetime["Kills"] || "0").replace(/\s/g, '')) || 0;
    
    // Берем готовый K/D Ratio из API (он уже посчитан правильно)
    const kdRaw = String(lifetime["Average K/D Ratio"] || "1.0").replace(/\s/g, '');
    const kd = parseFloat(kdRaw) || 1.0;
    
    // Винрейт
    const winRateRaw = String(lifetime["Win Rate %"] || "0").replace(/\s/g, '');
    const winRate = parseFloat(winRateRaw) || 0;
    
    // Базовый ответ (!elo)
    if (!type || type === 'base') {
      const result = `${nick} | Уровень: ${cs2Stats.skill_level || 0}, Эло: ${cs2Stats.faceit_elo || 0}`;
      return res.status(200).send(result);
    }
    
    // Средняя статистика (!avg)
    if (type === 'avg') {
      // Считаем убийств за матч
      const avgKills = matches > 0 ? (kills / matches).toFixed(1) : "0.0";
      
      // Смерти считаем через K/D: deaths = kills / kd
      const avgDeaths = (matches > 0 && kd > 0) 
        ? (kills / matches / kd).toFixed(1) 
        : "0.0";
      
      const result = `${nick} | За ${matches} матчей: K/D: ${kd.toFixed(2)}, Убийств/игру: ${avgKills}, Смертей/игру: ${avgDeaths}, Винрейт: ${winRate}%`;
      return res.status(200).send(result);
    }
    
    // Последний матч (!last)
    if (type === 'last') {
      // Берем первый сегмент (последняя карта)
      const segments = statsData.segments || [];
      if (segments.length === 0) {
        return res.status(404).send(`${nick} | Нет данных о последнем матче`);
      }
      
      const lastMatch = segments[0];
      const map = lastMatch.label || "неизвестно";
      
      // Статистика матча
      const matchKills = parseInt(String(lastMatch.stats?.["Kills"] || "0").replace(/\s/g, '')) || 0;
      const matchDeaths = parseInt(String(lastMatch.stats?.["Deaths"] || "0").replace(/\s/g, '')) || 1;
      const matchKd = (matchKills / matchDeaths).toFixed(2);
      
      // Результат (Wins = 1 значит победа)
      const matchWon = lastMatch.stats?.["Wins"] === "1";
      const result = matchWon ? "Победа" : "Поражение";
      
      return res.status(200).send(`${nick} | Последний матч: ${map}, ${matchKills}/${matchDeaths} (K/D: ${matchKd}), ${result}`);
    }
    
    return res.status(400).json({ error: 'Неверный тип. Используй: base, avg, last' });
    
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
}