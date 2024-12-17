import fetch from "node-fetch";
import Sentiment from "sentiment";
import NodeCache from 'node-cache';

// Initialize NodeCache (24 hours TTL for news articles)
const cache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const sentiment = new Sentiment();

const fetchCryptoData = async () => {
  const apiUrl = "https://api.coingecko.com/api/v3/coins/markets";
  const params = new URLSearchParams({
    vs_currency: "usd",
    order: "market_cap_desc",
    per_page: 50,
    page: 1,
    sparkline: false,
  });

  const response = await fetch(`${apiUrl}?${params}`);
  return response.json();
};

const fetchNews = async (coinName) => {
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
    coinName
  )}&language=en&apiKey=${NEWS_API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    console.error(`Failed to fetch news for ${coinName}`);
    return [];
  }

  const data = await response.json();
  return data.articles || [];
};

const fetchNewsWithCache = async (coinName) => {
  const cacheKey = `news_${coinName}`;

  if (cache.has(cacheKey)) {
    console.log(`Returning cached news articles for: ${coinName}`);
    return cache.get(cacheKey);
  }

  const articles = await fetchNews(coinName);
  cache.set(cacheKey, articles);

  return articles;
};

const analyzeSentiment = (articles) => {
  const scores = articles.map(
    (article) => sentiment.analyze(article.title).score
  );

  const averageScore =
    scores.reduce((sum, score) => sum + score, 0) / (scores.length || 1); // Avoid division by zero

  return { scores, averageScore };
};

const enrichWithSentiment = async (coins) => {
  return Promise.all(
    coins.map(async (coin) => {
      const articles = await fetchNewsWithCache(coin.name);
      const { averageScore } = analyzeSentiment(articles);

      return {
        ...coin,
        sentimentScore: averageScore,
        articles: articles.slice(0, 3), // Include top 3 articles
      };
    })
  );
};

const filterRecommendations = (coins, riskLevel) => {
  let marketCapLimit, sentimentThreshold;

  switch (riskLevel) {
    case 1: // Ultra low risk
      marketCapLimit = 10; // Top 10 coins only
      sentimentThreshold = 0.5; // Strongly positive sentiment
      break;
    case 2: // Low risk
      marketCapLimit = 20; // Top 20 coins
      sentimentThreshold = 0.3; // Moderately positive sentiment
      break;
    case 3: // Medium risk
      marketCapLimit = 100; // Top 100 coins
      sentimentThreshold = 0; // Neutral or better sentiment
      break;
    case 4: // High risk
      marketCapLimit = Infinity; // No restriction on market cap
      sentimentThreshold = -0.2; // Allow slightly negative sentiment
      break;
    case 5: // Ultra high risk
      marketCapLimit = Infinity; // No restriction on market cap
      sentimentThreshold = -0.5; // Allow more negative sentiment
      break;
    default:
      throw new Error('Invalid risk level. Must be between 1 and 5.');
  }

  return coins.filter(
    (coin) =>
      coin.market_cap_rank <= marketCapLimit &&
      coin.sentimentScore >= sentimentThreshold
  );
};

export default async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const riskLevel = parseInt(req.query.riskLevel, 10);

  if (isNaN(riskLevel) || riskLevel < 1 || riskLevel > 5) {
    return res.status(400).json({
      error: "Invalid risk level. Please provide a value between 1 and 5.",
    });
  }

  try {
    // Step 1: Fetch top cryptocurrencies
    const coins = await fetchCryptoData();

    // Step 2: Enrich with news and sentiment analysis
    const enrichedCoins = await enrichWithSentiment(coins);

    // Step 3: Filter recommendations based on risk level
    const recommendations = filterRecommendations(enrichedCoins, riskLevel);

    res.status(200).json({
      recommendations: recommendations.slice(0, 10),
    });
  } catch (error) {
    console.error("Error fetching cryptocurrency data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
