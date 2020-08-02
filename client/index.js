const net = require('net');

class Request {
  constructor({
    method,
    host,
    port,
    path,
    headers,
    body
  }) {
    this.method = method || 'GET';
    this.host = host;
    this.port = port || 80;
    this.path = path || '/';
    this.headers = headers || {};
    this.body = body || {};
    // the header Content-Type is required, otherwise the body can not be parsered correctly.
    if (!this.headers['Content-Type']) {
      this.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    // encode the http body. These are four mosted used format: application/x-www-form-urlencoded multipart/form-data application/json text/xml
    // application/x-www-form-urlencoded 提交的数据按照 key1=val1&key2=val2 的方式进行编码，key 和 val 都进行了 URL 转码
    // encodeURIComponent: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
    if (this.headers['Content-Type'] === 'application/json') {
      this.bodyText = JSON.stringify(this.body);
    } else if (this.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
      this.bodyText = Object.keys(this.body).map(
        key => `${key}=${encodeURIComponent(this.body[key])}`
      ).join('&');
    }

    this.headers["Content-Length"] = this.bodyText.length;
  }


  // The parameter is a TCP connection.
  send(connection) {
    return new Promise((resolve, reject) => {
      const parser = new ResponseParser;

      if (connection) {
        connection.write(this.toString());
      } else {
        // create a TCP connection
        connection = net.createConnection(
          { host: this.host, port: this.port },
          () => connection.write(this.toString())
        );
      }

      connection.on('data', data => {
        console.log(data.toString());
        console.log(JSON.stringify(data.toString(), null, 4))
        // reveive the data and pass it to the parser
        parser.receive(data.toString());
        if (parser.isFinished) {
          resolve(parser.response);
          connection.end();
        }
      });

      connection.on('error', error => {
        console.log(error);
        reject(error);
        connection.end();
      })
    })
  }

  toString() {
    //     console.log(`${this.method} ${this.path} HTTP/1.1\r
    // ${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}\r
    // \r
    // ${this.bodyText}`)

    // request line \r headers \r 空行\r body
    // http messages https://developer.mozilla.org/en-US/docs/Web/HTTP/Messages
    return `${this.method} ${this.path} HTTP/1.1\r
${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}\r
\r
${this.bodyText}`;
  }
}

class ResponseParser {
  constructor() {
    // "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nDate: Sun, 02 Aug 2020 17:05:31 GMT\r\nConnection: keep-alive\r\nTransfer-Encoding: chunked\r\n\r\nd\r\n Hello World\n\r\n0\r\n\r\n"
    // we can design the states according to the format of the response
    this.WAITING_STATUS_LINE = 0;
    this.WAITING_STATUS_LINE_END = 1;

    this.WAITING_HEADER_NAME = 2;
    this.WAITING_HEADER_SPACE = 3;
    this.WAITING_HEADER_VALUE = 4;
    this.WAITING_HEADER_LINE_END = 5;
    this.WAITING_HEADER_BLOCK_END = 6;

    this.WAITING_BODY = 7;


    // initial state
    this.current = this.WAITING_STATUS_LINE;

    this.statusLine = '';
    this.headers = {};
    this.headerName = '';
    this.headerValue = '';
    this.bodyParser = null;
  }
  get isFinished() { }

  get response() { }

  receive(string) {
    for (const char of string) {
      this.receiveChar(char);
    }
    console.log(this.headers)
  }
  // "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nDate: Sun, 02 Aug 2020 17:05:31 GMT\r\nConnection: keep-alive\r\nTransfer-Encoding: chunked\r\n\r\nd\r\n Hello World\n\r\n0\r\n\r\n"  // a state machine
  // a state machine
  receiveChar(char) {
    switch (this.current) {
      case this.WAITING_STATUS_LINE:
        if (char === '\r') {
          this.current = this.WAITING_STATUS_LINE_END;
        } else {
          this.statusLine += char;
        }
        break;

      case this.WAITING_STATUS_LINE_END:
        if (char === '\n') {
          this.current = this.WAITING_HEADER_NAME;
        }
        break;

      case this.WAITING_HEADER_NAME:
        if (char === ':') {
          this.current = this.WAITING_HEADER_SPACE;
        } else if (char === '\r') {
          // no key-value pairs at all or the end of k-v paris (no more)
          this.current = this.WAITING_HEADER_BLOCK_END;
        } else {
          this.headerName += char;
        }
        break;

      case this.WAITING_HEADER_SPACE:
        if (char === ' ') {
          this.current = this.WAITING_HEADER_VALUE;
        }
        break;
      case this.WAITING_HEADER_VALUE:
        if (char === '\r') {
          this.current = this.WAITING_HEADER_LINE_END;
        } else {
          this.headerValue += char;
        }
        break;

      case this.WAITING_HEADER_LINE_END:
        if (char === '\n') {
          this.current = this.WAITING_HEADER_NAME;
          this.headers = {
            ...this.headers,
            [this.headerName]: this.headerValue
          }
          this.headerName = '';
          this.headerValue = '';
        }
        break;

      case this.WAITING_HEADER_BLOCK_END:
        if (char === '\n') {
          this.current = this.WAITING_BODY;
        }
        break;

      case this.WAITING_BODY:
        // console.log((char));
        console.log(JSON.stringify(char));
        break;

      default:
        break;
    }
  }
}

void async function () {
  const request = new Request({
    method: 'POST',
    host: '127.0.0.1',
    port: 8080,
    path: '/',
    headers: {
      ['X-Jobpal']: 'chatbots',
    },
    body: {
      name: 'Jobpal',
    }
  });

  const reponse = await request.send();
  // console.log(response);
  // the format of response: status line \r 空行 \r headers \r body 
  // 其中 body：node 默认格式 chunked body: 16进制数字表长度 内容 直到最后是0
}()