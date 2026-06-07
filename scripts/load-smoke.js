const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const totalRequests = Number(process.env.REQUESTS || 60);
const concurrency = Number(process.env.CONCURRENCY || 10);

const paths = ['/', '/login', '/register', '/demo', '/api/topics'];

async function request(path) {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'User-Agent': 'gb-speaking-ai-load-smoke/1.0' },
  });
  const durationMs = Math.round(performance.now() - startedAt);

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  await response.arrayBuffer();
  return { path, durationMs };
}

async function worker(id, queue, results) {
  while (queue.length > 0) {
    const index = queue.shift();
    if (typeof index !== 'number') return;
    const path = paths[index % paths.length];
    try {
      results.push(await request(path));
    } catch (error) {
      results.push({ path, error: error instanceof Error ? error.message : String(error), worker: id });
    }
  }
}

async function main() {
  const queue = Array.from({ length: totalRequests }, (_, index) => index);
  const results = [];

  await Promise.all(
    Array.from({ length: Math.min(concurrency, totalRequests) }, (_, index) => worker(index + 1, queue, results))
  );

  const failures = results.filter(result => 'error' in result);
  const successful = results.filter(result => !('error' in result));
  const durations = successful.map(result => result.durationMs).sort((a, b) => a - b);
  const avg = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0;
  const p95 = durations.length ? durations[Math.floor(durations.length * 0.95) - 1] ?? durations[durations.length - 1] : 0;

  console.log(`Load smoke target: ${baseUrl}`);
  console.log(`Requests: ${totalRequests}, concurrency: ${concurrency}`);
  console.log(`Success: ${successful.length}, failures: ${failures.length}, avg: ${avg}ms, p95: ${p95}ms`);

  if (failures.length > 0) {
    console.error('Failures:');
    for (const failure of failures.slice(0, 10)) {
      console.error(`- ${failure.path}: ${failure.error}`);
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
