// api/faceit.js - ВРЕМЕННАЯ ДИАГНОСТИКА
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { nick, type } = req.query;
  
  if (!nick) {
    return res.status(400).json({ error: 'Укажи ник' });
  }

  const FACEIT_API_KEY = 'cf9af14a-245b-4d36-80e4-721625d0532a';
  
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
    
    // Отправляем ВСЁ, что пришло (чтобы увидеть структуру)
    return res.status(200).json(statsData);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}