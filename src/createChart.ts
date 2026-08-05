import { readFromJSON, stringToNumber } from "./helper.js";
import type { PriceRecord } from "./helper.js";

const generateChartUrl = (unitKey: string, history: PriceRecord[]): string => {
  if (!history || history.length === 0) return "";

  const labels = history.map((h) => h.date);
  const dataPoints = history.map((h) => stringToNumber(h.price));

  const chartConfig = {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: `${unitKey} Price History`,
          data: dataPoints,
          borderColor: "#42a7c0",
          backgroundColor: "rgba(66, 167, 192, 0.1)",
          fill: true,
          tension: 0.2,
        },
      ],
    },
    options: {
      title: {
        display: true,
        text: `${unitKey} - Price Change`,
      },
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: false,
            },
          },
        ],
      },
    },
  };

  return `https://quickchart.io/chart?c=${encodeURIComponent(
    JSON.stringify(chartConfig),
  )}`;
};

const getAllChartUrls = () => {
  const currentData = readFromJSON();
  const chartUrls: Record<string, string> = {};

  for (const [unitKey, history] of Object.entries(currentData)) {
    chartUrls[unitKey] = generateChartUrl(unitKey, history);
  }

  return chartUrls;
};

export default getAllChartUrls;
