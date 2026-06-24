const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 5177);

const server = http.createServer((req, res) => {
  const urlPath = req.url === '/' ? '/preview.html' : req.url.split('?')[0];
  const filePath = path.join(root, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ''));

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const contentType = filePath.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream';
    res.writeHead(200, { 'content-type': contentType });
    res.end(data);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Preview server listening on http://127.0.0.1:${port}/preview.html`);
});
