function normalizeValue(value) {
  if (value == null) return null;
  if (typeof value !== 'string') return value;
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact || null;
}

function normalizeDate(value) {
  const normalized = normalizeValue(value);
  if (!normalized) return null;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function normalizeMetadata(metadata) {
  return {
    author: normalizeValue(metadata.author),
    title: normalizeValue(metadata.title),
    articleDate: normalizeDate(metadata.articleDate),
    source: normalizeValue(metadata.source)
  };
}

module.exports = { normalizeMetadata };
