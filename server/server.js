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
      //   response.end(
      //     `<html maaa=a >
      // <head>
      //       <style>
      // body div #myid{
      //   width:100px;
      //   background-color: #ff5000;
      // }
      // body div img{
      //   width:30px;
      //   background-color: #ff1111;
      // }
      //   </style>
      // </head>
      // <body>
      //   <div>
      //       <img id="myid"/>
      //       <img />
      //   </div>
      // </body>
      // </html>`);
      // });
      response.end(
        `<html maaa=a >
    <head>
          <style>
    #container {
      width:500px;
      height:300px;
      display:flex;
      background-color:rgb(139,195,74);
    }
    #container #myid {
      width:200px;
      height:100px;
      background-color:rgb(255,235,59);
    }
    #container .c1 {
      flex:1;
      background-color:rgb(56,142,60);
    }
      </style>
    </head>
    <body>
      <div id="container">
          <div id="myid"/>
          <div class="c1" />
      </div>
    </body>
    </html>`);
    });
}).listen(8080);

console.log('The server is running!');
