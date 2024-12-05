import fetch from 'node-fetch';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { riskLevel } = req.query;

    if (!riskLevel || isNaN(riskLevel) || riskLevel < 1 || riskLevel > 5) {
        return res.status(400).json({ error: 'Invalid risk level. Please provide a value between 1 and 5.' });
    }

    // Fetch Cryptocurrency Data
    const apiUrl = 'https://api.coingecko.com/api/v3/coins/markets';
    const params = new URLSearchParams({
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 100,
        page: 1,
        sparkline: false,
    });

    try {
        const response = await fetch(`${apiUrl}?${params}`);
        const data = await response.json();

        // Categorize Cryptos by Risk Level
        const categorizedCryptos = data.filter(coin => {
            const rank = coin.market_cap_rank;
            switch (parseInt(riskLevel, 10)) {
                case 1: // Very Low Risk
                    return rank <= 10;
                case 2: // Low Risk
                    return rank > 10 && rank <= 30;
                case 3: // Medium Risk
                    return rank > 30 && rank <= 70;
                case 4: // High Risk
                    return rank > 70 && rank <= 150;
                case 5: // Very High Risk
                    return rank > 150;
                default:
                    return false;
            }
        });

        // Score Cryptos
        const scoredCryptos = categorizedCryptos
            .map(coin => ({
                ...coin,
                score: coin.market_cap / 1e9 + (riskLevel >= 4 ? coin.price_change_percentage_24h : -Math.abs(coin.price_change_percentage_24h)),
            }))
            .sort((a, b) => b.score - a.score);

        // Respond with Top 5 Recommendations
        res.status(200).json({
            recommendations: scoredCryptos.slice(0, 5),
        });
    } catch (error) {
        console.error('Error fetching cryptocurrency data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}