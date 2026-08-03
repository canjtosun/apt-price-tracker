import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config();

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

// Fetches apartment unit data from the respective SightMap API endpoints
const fetchData = async () => {
  const apiURLs = {
    [aptNames.gallery]:
      "https://sightmap.com/app/api/v1/8epm66g4v6d/sightmaps/92683",
    [aptNames.villages]:
      "https://sightmap.com/app/api/v1/8ywklnk4vlx/sightmaps/96283",
    [aptNames.standard]:
      "https://sightmap.com/app/api/v1/27vq1gd6wox/sightmaps/112984",
  };

  const results: Record<string, any> = {};

  // Iterate over each apartment API URL and fetch raw JSON data
  for (const [name, url] of Object.entries(apiURLs)) {
    if (!url) continue;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const data = await response.json();
      results[name] = data;
    } catch (error: any) {
      results[name] = { error: error.message };
    }
  }

  return results;
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

// Constructs the email body and sends the digest notification via Nodemailer
const sendEmail = async (data: any) => {
  // Configure the SMTP transporter using Gmail credentials from .env
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.USER_PASSWORD,
    },
  });

  const emailSections: string[] = [];

  // Process data for each apartment complex
  for (const [key, aptName] of Object.entries(aptNames)) {
    const aptData = data[aptName];

    // Handle missing or failed API responses
    if (!aptData || aptData.error) {
      emailSections.push(
        `=== ${aptName.toUpperCase()} ===\nNo data available: ${
          aptData?.error || "Unknown Error"
        }`,
      );
      continue;
    }

    const units = aptData.data?.units || [];
    const floorPlans = aptData.data?.floor_plans || aptData.data?.layouts || [];
    const totalUnits = units.length;

    // Build a lookup map converting floor plan IDs to human-readable layout names
    const floorPlanMap: Record<string, string> = {};
    floorPlans.forEach((fp: any) => {
      const nameValue = typeof fp.name === "object" ? fp.name?.name : fp.name;
      floorPlanMap[fp.id] = nameValue || fp.filter_label || "";
    });

    const allowedPlans = allowedFloorPlans[aptName] || [];

    // Filter available units based on floor plan codes
    const filteredUnits = units.filter((u: any) => {
      const fpName = getFloorPlanName(u, floorPlanMap);

      // Match against the list of target floor plans
      const matchesFloorPlan =
        allowedPlans.length === 0 ||
        allowedPlans.some((plan) =>
          fpName.toLowerCase().includes(plan.toLowerCase()),
        );

      return matchesFloorPlan
    });

    // Format filtered units into readable text blocks
    const unitsTextList =
      filteredUnits.length > 0
        ? filteredUnits
            .map((u: any) => {
              return `Unit Number: ${
                u.display_unit_number || u.unit_number
              }\nSqft: ${u.display_area || u.area + " sq. ft."}\nPrice: ${
                u.display_price || "$" + u.price
              }\nAvailable: ${u.display_available_on || u.available_on}`;
            })
            .join("\n\n")
        : "No matching apartments available for the selected floor plans.";

    const targetPlanListStr = allowedPlans.join(", ");
    const sectionText = `=== ${aptName.toUpperCase()} ===\nTotal Available Units: ${totalUnits}\nTarget Floor Plans: [${targetPlanListStr}]\n\nFiltered Units:\n\n${unitsTextList}`;
    emailSections.push(sectionText);
  }

  // Combine all property sections into a single email payload separated by dividers
  const emailBody = emailSections.join(
    "\n\n==========================================\n\n",
  );

  const mailOptions = {
    from: `Apt Price Tracker <${process.env.EMAIL_USER}>`,
    to: process.env.TO_EMAIL || process.env.EMAIL_USER,
    subject: `🏢 Apartment Tracker Update - ${new Date().toLocaleDateString(
      "en-US",
      { timeZone: "America/Chicago" },
    )}`,
    text: emailBody,
  };

  // Dispatch the email notification
  await transporter.sendMail(mailOptions);
};

// Main execution block
const main = async () => {
  try {
    const data = await fetchData();
    await sendEmail(data);
  } catch (error) {
    // Silent catch
  }
};

main();
