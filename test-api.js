const data = JSON.stringify({
  studentMessage: "Hello, my name is John and I want to learn English.",
  history: [],
  level: "B1",
  topicId: "self-introduction"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

async function run() {
  const http = await import('node:http');
  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let responseBody = '';

    res.on('data', (chunk) => {
      responseBody += chunk;
    });

    res.on('end', () => {
      console.log('RESPONSE:', responseBody);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.write(data);
  req.end();
}

run();
