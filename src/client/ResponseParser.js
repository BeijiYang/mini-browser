const ChunkedBodyParser = require('./ChunkedBodyParser');

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
  get isFinished() {
    return this.bodyParser && this.bodyParser.isFinished;
  }

  get response() {
    this.statusLine.match(/HTTP\/1.1 ([0-9]+) ([\s\S]+)/);
    return {
      statusCode: RegExp.$1,
      statusText: RegExp.$2,
      headers: this.headers,
      body: this.bodyParser.content.join('')
    }
  }

  receive(string) {
    for (const char of string) {
      this.receiveChar(char);
    }
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
          // Transfer-Encoding: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Transfer-Encoding
          // "chunked" is the default value in node. we use it as the example.
          if (this.headers['Transfer-Encoding'] === 'chunked') {
            this.bodyParser = new ChunkedBodyParser();
          }
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
        this.bodyParser.receiveChar(char);
        break;

      default:
        break;
    }
  }
}

module.exports = ResponseParser;
