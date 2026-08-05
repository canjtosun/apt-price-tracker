import fs from "fs";

// Price History
interface PriceRecord {
  date: string;
  price: string;
}
type PriceHistory = Record<string, PriceRecord[]>;

// Apartment complex display names
const aptNames = {
  gallery: "Gallery at Domain",
  villages: "Villages at Domain",
  standard: "Standard at Domain",
};

// Target floor plan codes to filter for each apartment complex
const allowedFloorPlans: Record<string, string[]> = {
  [aptNames.gallery]: ["A2"],
  [aptNames.villages]: ["A7", "A8"],
  [aptNames.standard]: ["A8"],
};

// Helper: Today's date in YYYY-MM-DD
const getTodayDate = (): any => {
  return new Date().toISOString().split("T")[0];
};

// Converts string to number with removing some notations
const stringToNumber = (str: string) => {
  if (!str) return 0;
  const cleanStr = str.replaceAll("$", "").replaceAll(",", "");
  return Number.parseFloat(cleanStr);
};

// Write to JSON file
const writeToJSON = (prices: PriceHistory) => {
  try {
    fs.writeFileSync("prices.json", JSON.stringify(prices, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing file", error);
  }
};

// Read from JSON file
const readFromJSON = (): PriceHistory => {
  try {
    if (!fs.existsSync("prices.json")) return {};
    const data = fs.readFileSync("prices.json", "utf8");
    const parsed = JSON.parse(data);

    // Migration / Safety check: If old single string format exists, upgrade it to array format gracefully
    const converted: PriceHistory = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (typeof val === "string") {
        converted[key] = [{ date: getTodayDate(), price: val }];
      } else if (Array.isArray(val)) {
        converted[key] = val;
      }
    }
    return converted;
  } catch (error) {
    console.error("Error reading file", error);
    return {};
  }
};

// Safely extracts the floor plan name as a string for filtering purposes
const getFloorPlanName = (
  u: any,
  floorPlanMap: Record<string, string>,
): string => {
  const rawFp =
    u.floor_plan_name ||
    u.layout_name ||
    floorPlanMap[u.floor_plan_id] ||
    floorPlanMap[u.layout_id];

  if (!rawFp) return "N/A";

  if (typeof rawFp === "object") {
    return rawFp.name || rawFp.filter_label || "N/A";
  }

  return String(rawFp);
};

const findLowestPricePerUnit = () => {
  const unitLowestPrices: Record<string, string> = {};
  const prices = readFromJSON();
  for (const [unitKey, history] of Object.entries(prices)) {
    const numericPrices = history.map((price) => stringToNumber(price.price));
    const lowestPrice = Math.min(...numericPrices);
    unitLowestPrices[unitKey] =
      `$${lowestPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  }
  return unitLowestPrices;
};

const findHighestPricePerUnit = () => {
  const unitHighestPrices: Record<string, string> = {};
  const prices = readFromJSON();
  for (const [unitKey, history] of Object.entries(prices)) {
    const numericPrices = history.map((price) => stringToNumber(price.price));
    const lowestPrice = Math.max(...numericPrices);
    unitHighestPrices[unitKey] =
      `$${lowestPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  }
  return unitHighestPrices;
};

export {
  aptNames,
  allowedFloorPlans,
  getTodayDate,
  stringToNumber,
  writeToJSON,
  readFromJSON,
  getFloorPlanName,
  findLowestPricePerUnit,
  findHighestPricePerUnit,
};
export type { PriceHistory, PriceRecord };
