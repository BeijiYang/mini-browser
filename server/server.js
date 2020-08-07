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
      // response.end(' Hello World\n');
      response.end(
        `<html maaa=a >
    <head>
          <style>
    body div #myid{
      width:100px;
      background-color: #ff5000;
    }
    body div img{
      width:30px;
      background-color: #ff1111;
    }
      </style>
    </head>
    <body>
      <div>
          <img id="myid"/>
          <img />
      </div>
    </body>
    </html>`);
    });
}).listen(8080);

console.log('The server is running!');
