// api/faceit.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { nick } = req.query;
  
  if (!nick) {
    return res.status(400).json({ error: 'Укажи ник: ?nick=xKarosh1x' });
  }

  const FACEIT_API_KEY = 'твой_ключ_сюда'; // Вставь свой ключ
  
  try {
    const response = await fetch(
      `https://open.faceit.com/data/v4/players?nickname=${nick}`,
      {
        headers: {
          'Authorization': `Bearer ${FACEIT_API_KEY}`
        }
      }
    );
    
    const data = await response.json();
    
    // Временный вывод — показываем ВСЁ, что пришло
    return res.status(200).json(data.games.cs2);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}