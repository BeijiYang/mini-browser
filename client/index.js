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
      });

      connection.on('error', error => {
        console.log(error);
        reject(error);
        connection.end();
      })
    })
  }

  toString() {
    // http messages https://developer.mozilla.org/en-US/docs/Web/HTTP/Messages
    return `${this.method} ${this.path} HTTP/1.1\r
${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}\r
\r
${this.bodyText}`;
  }
}

class ResponseParser {

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
  console.log(response);
}()