export default async function handler(req, res) {
    const { category } = req.query;
    const key = process.env.VITE_NEWS_KEY;
    
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?country=us&category=${category}&pageSize=10&apiKey=${key}`
    );
    
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  }