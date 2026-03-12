const fs = require('node:fs');
const path = require('node:path');
const { extractMetadataFromHtml } = require('../../src/extractMetadata');
const { normalizeMetadata } = require('../helpers/normalizeMetadata');

const projectRoot = path.resolve(__dirname, '../..');
const manifestPath = path.join(projectRoot, 'tests/fixtures/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

describe('metadata fixture compatibility', () => {
  it('has at least one fixture registered', () => {
    expect(Array.isArray(manifest)).toBe(true);
    expect(manifest.length).toBeGreaterThan(0);
  });

  for (const fixture of manifest) {
    it(`matches expected metadata: ${fixture.id}`, () => {
      const html = fs.readFileSync(path.join(projectRoot, fixture.rawHtmlPath), 'utf8');
      const expected = JSON.parse(fs.readFileSync(path.join(projectRoot, fixture.expectedPath), 'utf8'));

      const actual = extractMetadataFromHtml(html, { url: fixture.url });

      expect(normalizeMetadata(actual)).toEqual(normalizeMetadata(expected));
    });
  }
});
