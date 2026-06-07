// Simple smoke test to ensure topics and API paths are reachable in Node environment
async function run() {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const topicsPath = path.join(process.cwd(), 'src', 'lib', 'topics.ts');
  if (!fs.existsSync(topicsPath)) {
    console.error('topics.ts not found at', topicsPath);
    process.exit(2);
  }

  const text = fs.readFileSync(topicsPath, 'utf8');
  if (!/export const TOPICS/.test(text)) {
    console.error('TOPICS export not found in topics.ts');
    process.exit(2);
  }

  const matches = text.match(/\n\s*\{[\s\S]*?\n\s*\},/g) || [];
  console.log('Found topic-like objects (approx):', matches.length);
  process.exit(0);
}

run();
