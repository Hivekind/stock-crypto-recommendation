"use client";
import { useState } from "react";
import Chart from "../../components/Chart";

// New component for Risk Level Input
function RiskLevelInput({ riskLevel, setRiskLevel }) {
  return (
    <label>
      Select Your Risk Level (1-5):
      <input
        type="number"
        min="1"
        max="5"
        value={riskLevel}
        className="text-black w-10 border border-gray-300 rounded ml-2 p-1"
        onChange={(e) => setRiskLevel(Number(e.target.value))}
      />
    </label>
  );
}

// New component for Recommendation Button
function RecommendationButton({ handleRecommendation }) {
  return (
    <button
      onClick={handleRecommendation}
      className="px-4 py-2 bg-blue-700 text-white rounded"
    >
      Get Recommendations
    </button>
  );
}

export default function Dashboard() {
  const [riskLevel, setRiskLevel] = useState(1);
  const [recommendations, setRecommendations] = useState([]);
  const [chartLabels, setChartLabels] = useState([]);
  const [chartData, setChartData] = useState([]);

  const handleRecommendation = async () => {
    const apiRoute = `/api/recommendations?riskLevel=${riskLevel}`;
    const response = await fetch(apiRoute);
    const result = await response.json();
    const recommendedAssets = result.recommendations;

    setRecommendations(recommendedAssets);

    const labels = recommendedAssets.map(asset => asset.name);
    const data = recommendedAssets.map(asset => asset.current_price);

    setChartLabels(labels);
    setChartData(data);
  };

  return (
    <div className="container m-auto mt-10 h-full">
      <h1 className="text-2xl mb-12">Stock & Crypto Recommendation System</h1>
      <div className="flex items-center gap-4">
        <RiskLevelInput riskLevel={riskLevel} setRiskLevel={setRiskLevel} />
        <RecommendationButton handleRecommendation={handleRecommendation} />
      </div>
      <div className="grid grid-cols-7 gap-6 mt-5">
        <div className="col-span-3">
          <h2 className="">Recommended Assets:</h2>
          <ul>
            {recommendations.map((asset, index) => (
              <li key={index}>{asset.name}</li>
            ))}
          </ul>
        </div>
        <div className="col-span-4">
          <h2>Price Chart:</h2>
          <Chart labels={chartLabels} data={chartData} />
        </div>
      </div>
    </div>
  );
}
