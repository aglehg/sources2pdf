const fs = require('node:fs/promises');

function isLikelyHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function readUrls(inputPath) {
  const content = await fs.readFile(inputPath, 'utf8');
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const urls = [];
  for (const line of lines) {
    if (!isLikelyHttpUrl(line)) {
      console.log(`[SKIP] Invalid URL: ${line}`);
      continue;
    }
    urls.push(line);
  }

  return urls;
}

module.exports = { readUrls };
