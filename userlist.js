const fs = require('fs');
const path = require('path');

function getPreviousId(ids, currentId) {
  const sorted = ids.map(BigInt).sort((a, b) => (a < b ? -1 : 1));
  const index = sorted.indexOf(BigInt(currentId));
  return index > 0 ? sorted[index - 1].toString() : null;
}

// Sample list of IDs (update this with your actual IDs)
const existingIds = [
  "1001",
  "1002",
  "1003",
  "1004",
  "1005",
  "1006",
  "1007",
  "1008",
  "1009",
  "1010",
  "1011",
  "1012",
  "1013",
  "1014",
  "1015"
];

// Starting ID to get previous IDs from
const startingId = "1015";

// Generate 10 previous IDs
function generatePreviousIds(ids, startId, count = 10) {
  const result = [];
  let currentId = startId;

  for (let i = 0; i < count; i++) {
    const prevId = getPreviousId(ids, currentId);
    if (prevId === null) {
      console.log(`Stopped at iteration ${i + 1}: No more previous IDs`);
      break;
    }
    result.push(prevId);
    currentId = prevId;
  }

  return result;
}

// Generate and save
const generatedIds = generatePreviousIds(existingIds, startingId, 10);

// Save to JSON file
const outputPath = path.join(__dirname, 'generated-ids.json');
fs.writeFileSync(outputPath, JSON.stringify(generatedIds, null, 2));

console.log(`Generated ${generatedIds.length} IDs:`);
console.log(generatedIds);
console.log(`\nSaved to: ${outputPath}`);
