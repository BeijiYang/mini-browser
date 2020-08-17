const images = require("images");
const HTMLparser = require('./HTMLparser');
const render = require("./render");
const Request = require('./Request');

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

  const response = await request.send();
  const dom = HTMLparser.parse(response.body);
  const viewport = images(800, 600);
  render(viewport, dom);

  viewport.save('viewport.jpg');
}()