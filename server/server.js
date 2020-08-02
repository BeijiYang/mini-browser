const http = require("http");

http.createServer((request, response) => {
  let body = [];

  request.on('error', error => {
    console.log(error);
  })
    .on('data', chunk => {
      body.push(chunk.toString());
      console.log(body)
    })
    .on('end', () => {
      body = body.join('');
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end(' Hello World\n');
    });
}).listen(8080);

console.log('The server is running!');
