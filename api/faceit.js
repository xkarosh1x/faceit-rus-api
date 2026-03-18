// api/faceit.js - ПОЛНАЯ РАБОЧАЯ ВЕРСИЯ
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { nick, type } = req.query;
  
  if (!nick) {
    return res.status(400).json({ error: 'Укажи ник: ?nick=xKarosh1x' });
  }

  const FACEIT_API_KEY = 'cf9af14a-245b-4d36-80e4-721625d0532a'; // ВСТАВЬ СВОЙ КЛЮЧ
  
  try {
    // ===== 1. ПОЛУЧАЕМ ID ИГРОКА =====
    const playerRes = await fetch(
      `https://open.faceit.com/data/v4/players?nickname=${nick}`,
      { headers: { 'Authorization': `Bearer ${FACEIT_API_KEY}` } }
    );
    const playerData = await playerRes.json();
    
    if (!playerData || playerData.errors) {
      return res.status(404).json({ error: 'Игрок не найден' });
    }
    
    const playerId = playerData.player_id;
    const cs2Stats = playerData.games?.cs2;
    
    if (!cs2Stats) {
      return res.status(404).json({ error: 'Игрок не играет в CS2' });
    }
    
    // ===== 2. ПОЛУЧАЕМ ОБЩУЮ СТАТИСТИКУ =====
    const statsRes = await fetch(
      `https://open.faceit.com/data/v4/players/${playerId}/stats/cs2`,
      { headers: { 'Authorization': `Bearer ${FACEIT_API_KEY}` } }
    );
    const statsData = await statsRes.json();
    
    const lifetime = statsData.lifetime || {};
    
    // Парсим числа для !avg
    const matches = parseInt(String(lifetime["Matches"] || "0").replace(/\s/g, '')) || 0;
    const kills = parseInt(String(lifetime["Kills"] || "0").replace(/\s/g, '')) || 0;
    const kd = parseFloat(String(lifetime["Average K/D Ratio"] || "1.0").replace(/\s/g, '')) || 1.0;
    const winRate = parseFloat(String(lifetime["Win Rate %"] || "0").replace(/\s/g, '')) || 0;
    
    // ===== 3. ОБРАБАТЫВАЕМ КОМАНДЫ =====
    
    // --- !elo (базовая информация) ---
    if (!type || type === 'base') {
      const result = `${nick} | Уровень: ${cs2Stats.skill_level || 0}, Эло: ${cs2Stats.faceit_elo || 0}`;
      return res.status(200).send(result);
    }
    
    // --- !avg (средняя статистика) ---
    if (type === 'avg') {
      const avgKills = matches > 0 ? (kills / matches).toFixed(1) : "0.0";
      const avgDeaths = (matches > 0 && kd > 0) ? (kills / matches / kd).toFixed(1) : "0.0";
      
      const result = `${nick} | За ${matches} матчей: K/D: ${kd.toFixed(2)}, Убийств/игру: ${avgKills}, Смертей/игру: ${avgDeaths}, Винрейт: ${winRate}%`;
      return res.status(200).send(result);
    }
    
    // --- !last (последний матч) ---
    if (type === 'last') {
      // Получаем историю матчей
      const historyRes = await fetch(
        `https://open.faceit.com/data/v4/players/${playerId}/history?game=cs2&offset=0&limit=1`,
        { headers: { 'Authorization': `Bearer ${FACEIT_API_KEY}` } }
      );
      
      const historyData = await historyRes.json();
      
      if (!historyData.items || historyData.items.length === 0) {
        return res.status(404).send(`${nick} | Нет данных о последнем матче`);
      }
      
      const lastMatch = historyData.items[0];
      
      // Получаем детальную статистику матча
      const matchRes = await fetch(
        `https://open.faceit.com/data/v4/matches/${lastMatch.match_id}/stats`,
        { headers: { 'Authorization': `Bearer ${FACEIT_API_KEY}` } }
      );
      
      const matchData = await matchRes.json();
      
      // Находим статистику нашего игрока
      let playerStats = null;
      for (const team of matchData.rounds[0].teams) {
        for (const player of team.players) {
          if (player.player_id === playerId) {
            playerStats = player.player_stats;
            break;
          }
        }
      }
      
      if (!playerStats) {
        return res.status(404).send(`${nick} | Не удалось найти статистику игрока`);
      }
      
      const map = lastMatch.iwname || "неизвестно";
      const matchKills = playerStats["Kills"] || "0";
      const matchDeaths = playerStats["Deaths"] || "1";
      const matchKd = (parseInt(matchKills) / parseInt(matchDeaths)).toFixed(2);
      
      // Определяем победу
      const isWinner = lastMatch.results?.winner === lastMatch.teams?.faction1?.faction_id
        ? lastMatch.teams?.faction1?.players?.some(p => p.player_id === playerId)
        : lastMatch.teams?.faction2?.players?.some(p => p.player_id === playerId);
      
      const result = isWinner ? "Победа" : "Поражение";
      
      return res.status(200).send(`${nick} | Последний матч: ${map}, ${matchKills}/${matchDeaths} (K/D: ${matchKd}), ${result}`);
    }
    
    return res.status(400).json({ error: 'Неверный тип. Используй: base, avg, last' });
    
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
}