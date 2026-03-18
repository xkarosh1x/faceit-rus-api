// api/faceit.js - АБСОЛЮТНЫЙ ФИНАЛ
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { nick, type } = req.query;
  
  if (!nick) {
    return res.status(400).json({ error: 'Укажи ник: ?nick=xKarosh1x' });
  }

  const FACEIT_API_KEY = 'cf9af14a-245b-4d36-80e4-721625d0532a'; // Твой ключ
  
  try {
    // ========== ПОЛУЧАЕМ ID И БАЗОВУЮ ИНФУ ==========
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

    // 🔧 Очистка чисел от любых символов (пробелы, запятые, точки)
    const cleanNumber = (val) => {
      if (!val) return 0;
      const str = String(val).replace(/[^\d.-]/g, ''); // оставляем только цифры, точку, минус
      return parseFloat(str) || 0;
    };

    const matches = cleanNumber(lifetime["Matches"]);
    const kills = cleanNumber(lifetime["Kills"]);
    const kd = cleanNumber(lifetime["Average K/D Ratio"]) || 1.0;
    const winRate = cleanNumber(lifetime["Win Rate %"]);
    const avgKills = matches > 0 ? (kills / matches).toFixed(1) : "0.0";

    // ========== КОМАНДА !elo ==========
    if (!type || type === 'base') {
      const result = `${nick} | Уровень: ${cs2Stats.skill_level}, Эло: ${cs2Stats.faceit_elo}`;
      return res.status(200).send(result);
    }

    // ========== КОМАНДА !avg ==========
    if (type === 'avg') {
      const result = `${nick} | За ${matches} матчей: K/D: ${kd.toFixed(2)}, Убийств/игру: ${avgKills}, Винрейт: ${winRate}%`;
      return res.status(200).send(result);
    }

    // ========== КОМАНДА !last ==========
    if (type === 'last') {
      // Получаем последний матч из истории
      const historyRes = await fetch(
        `https://open.faceit.com/data/v4/players/${playerId}/history?game=cs2&offset=0&limit=1`,
        { headers: { 'Authorization': `Bearer ${FACEIT_API_KEY}` } }
      );
      const historyData = await historyRes.json();
      
      if (!historyData.items || historyData.items.length === 0) {
        return res.status(404).send(`${nick} | Нет данных о последнем матче`);
      }
      
      const lastMatch = historyData.items[0];
      
      // 🔍 Универсальный поиск статистики игрока в матче
      let playerStats = null;
      
      // teams может быть массивом или объектом с faction1/faction2
      const teams = lastMatch.teams;
      if (teams) {
        if (Array.isArray(teams)) {
          // Если teams — массив
          for (const team of teams) {
            if (team.players && Array.isArray(team.players)) {
              for (const player of team.players) {
                if (player.player_id === playerId) {
                  playerStats = player.player_stats;
                  break;
                }
              }
            }
          }
        } else {
          // Если teams — объект (faction1, faction2)
          for (const faction of ['faction1', 'faction2']) {
            if (teams[faction] && teams[faction].players) {
              for (const player of teams[faction].players) {
                if (player.player_id === playerId) {
                  playerStats = player.player_stats;
                  break;
                }
              }
            }
          }
        }
      }
      
      if (!playerStats) {
        return res.status(404).send(`${nick} | Не удалось найти статистику игрока в последнем матче`);
      }
      
      // Определяем победу
      const winnerId = lastMatch.results?.winner;
      let playerTeamId = null;
      
      if (teams) {
        if (Array.isArray(teams)) {
          for (const team of teams) {
            if (team.players?.some(p => p.player_id === playerId)) {
              playerTeamId = team.team_id;
              break;
            }
          }
        } else {
          if (teams.faction1?.players?.some(p => p.player_id === playerId)) {
            playerTeamId = teams.faction1.faction_id;
          } else if (teams.faction2?.players?.some(p => p.player_id === playerId)) {
            playerTeamId = teams.faction2.faction_id;
          }
        }
      }
      
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