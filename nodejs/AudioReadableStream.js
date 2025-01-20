const { Readable } = require('stream');

class AudioReadableStream extends Readable {
    constructor() {
        super();
        this.queue = []; 
        this.ended = false; 
    }

    add(data) {
        if (this.ended) {
            return
        }
        this.queue.push(data);
        this._read();
    }

    end() {
        this.ended = true;
        this.push(null);
    }

    _read() {
        if (this.queue.length > 0) {
            const chunk = this.queue.shift();
            this.push(chunk);
        }
    }
}

module.exports = AudioReadableStream