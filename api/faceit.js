// api/faceit.js - ФИНАЛЬНАЯ ВЕРСИЯ (avg по варианту 3)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { nick, type } = req.query;
  
  if (!nick) {
    return res.status(400).json({ error: 'Укажи ник: ?nick=xKarosh1x' });
  }

  const FACEIT_API_KEY = 'cf9af14a-245b-4d36-80e4-721625d0532a'; // твой ключ
  
  try {
    // ========== ПОЛУЧАЕМ ID ИГРОКА ==========
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

    // ========== ПОЛУЧАЕМ ОБЩУЮ СТАТИСТИКУ ==========
    const statsRes = await fetch(
      `https://open.faceit.com/data/v4/players/${playerId}/stats/cs2`,
      { headers: { 'Authorization': `Bearer ${FACEIT_API_KEY}` } }
    );
    const statsData = await statsRes.json();
    
    const lifetime = statsData.lifetime || {};

    // очистка чисел
    const cleanNumber = (val) => {
      if (!val) return 0;
      const str = String(val).replace(/[^\d.-]/g, '');
      return parseFloat(str) || 0;
    };

    const matches = cleanNumber(lifetime["Matches"]);
    const kills = cleanNumber(lifetime["Total Kills with extended stats"]);
    const kd = cleanNumber(lifetime["Average K/D Ratio"]) || 1.0;
    const winRate = cleanNumber(lifetime["Win Rate %"]);
    const avgKills = matches > 0 ? (kills / matches).toFixed(1) : "0.0";

    // ========== !elo ==========
    if (!type || type === 'base') {
      const result = `${nick} | Уровень: ${cs2Stats.skill_level}, Эло: ${cs2Stats.faceit_elo}`;
      return res.status(200).send(result);
    }

    // ========== !avg ==========
    if (type === 'avg') {
      const result = `${nick} | Убийств/игру: ${avgKills}, K/D: ${kd.toFixed(2)}, Винрейт: ${winRate}%`;
      return res.status(200).send(result);
    }

    // ========== !last ==========
    if (type === 'last') {
      const historyRes = await fetch(
        `https://open.faceit.com/data/v4/players/${playerId}/history?game=cs2&offset=0&limit=1`,
        { headers: { 'Authorization': `Bearer ${FACEIT_API_KEY}` } }
      );
      const historyData = await historyRes.json();
      
      if (!historyData.items || historyData.items.length === 0) {
        return res.status(404).send(`${nick} | Нет данных о последнем матче`);
      }
      
      const lastMatch = historyData.items[0];
      
      const matchRes = await fetch(
        `https://open.faceit.com/data/v4/matches/${lastMatch.match_id}/stats`,
        { headers: { 'Authorization': `Bearer ${FACEIT_API_KEY}` } }
      );
      const matchData = await matchRes.json();

      let playerStats = null;
      let playerTeamId = null;

      if (matchData.rounds && matchData.rounds[0] && matchData.rounds[0].teams) {
        for (const team of matchData.rounds[0].teams) {
          if (team.players) {
            for (const player of team.players) {
              if (player.player_id === playerId) {
                playerStats = player.player_stats;
                playerTeamId = team.team_id;
                break;
              }
            }
          }
        }
      }

      if (!playerStats) {
        return res.status(404).send(`${nick} | Не удалось найти статистику игрока в последнем матче`);
      }

      const winnerId = lastMatch.results?.winner;
      const isWinner = winnerId === playerTeamId;
      const map = lastMatch.iwname || "неизвестно";

      const matchKills = playerStats["Kills"] || "0";
      const matchDeaths = playerStats["Deaths"] || "1";
      const matchKd = (parseInt(matchKills) / parseInt(matchDeaths)).toFixed(2);
      const resultText = isWinner ? "Победа" : "Поражение";

      const result = `${nick} | Последний матч: ${map}, ${matchKills}/${matchDeaths} (K/D: ${matchKd}), ${resultText}`;
      return res.status(200).send(result);
    }

    return res.status(400).json({ error: 'Неверный тип' });
    
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
}