class ChunkedBodyParser {
  constructor() {
    // d    \r\n     Hello World\n    \r\n    0    \r\n    \r\n
    this.WAITING_LENGTH = 0;
    this.WAITING_LENGTH_LINE_END = 1;

    this.READING_CHUNK = 2;
    this.WAITING_BLANK_LINE = 3;
    this.WAITING_BLANK_LINE_END = 4;

    this.current = this.WAITING_LENGTH;

    this.content = [];
    this.length = 0;
    this.isFinished = false;
  }

  receiveChar(char) {
    switch (this.current) {
      case this.WAITING_LENGTH:
        if (char === '\r') {
          this.current = this.WAITING_LENGTH_LINE_END;
          if (this.length === 0) {
            this.isFinished = true;
          }
        } else {
          // operation of hexadecimal numbers。for example，2AF5，2 => A => F => 5
          this.length *= 16;
          this.length += parseInt(char, 16);
        }
        break;

      case this.WAITING_LENGTH_LINE_END:
        if (char === '\n' && !this.isFinished) {
          this.current = this.READING_CHUNK;
        }
        break;

      case this.READING_CHUNK:
        this.content.push(char);
        this.length -= 1;
        if (this.length === 0) {
          this.current = this.WAITING_BLANK_LINE;
        }
        break;

      case this.WAITING_BLANK_LINE:
        if (char === '\r') {
          this.current = this.WAITING_BLANK_LINE_END;
        }
        break;

      case this.WAITING_BLANK_LINE_END:
        if (char === '\n') {
          this.current = this.WAITING_LENGTH;
        }
        break;

      default:
        break;
    }
  }
}

module.exports = ChunkedBodyParser;
