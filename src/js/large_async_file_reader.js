class LargeAsyncFileReader {
  constructor(encoding) {
	this._encoding = encoding;
    this._bufferSize = 8388608;
    this._maxStringChars = 256;
    this._maxStringSize = this._maxStringChars * 1000;
    this.stringBuffer = Buffer.alloc(this._maxStringSize);

    this.currentPosition = 0;
    this._fileStream = undefined;
    this.inProgressOffset = 0;
    this.ready = false;
    this.complete = false;
    this.filePath = "";
    this.fileSize = 0;
    this.chunkCounter = 0;

    this.openAsync = this.openAsync.bind(this);
    this.isComplete = this.isComplete.bind(this);
    this.file = this.file.bind(this);
    this.bytesAvailable = this.bytesAvailable.bind(this);
    this.position = this.position.bind(this);
    this.processChunk = this.processChunk.bind(this);
    this.readUTFChunk = this.readUTFChunk.bind(this);
  }

  openAsync(filePath, start = 0) {
    this.complete = false;
    this.currentPosition = start;
    this.inProgressOffset = 0;
    this.filePath = filePath;
    const stats = fs.statSync(filePath);
    this.fileSize = stats.size;
    this._fileStream = fs.createReadStream(filePath, {
      start,
      bufferSize: this._bufferSize
    });
    this._fileStream.on("readable", () => (this.ready = true));
    this._fileStream.on("end", () => {
      this.complete = true;
      console.log("*COMPLETE*");
    });
  }

  position() {
    return this.currentPosition;
  }

  isComplete() {
    return this.complete;
  }

  bytesAvailable() {
    if (this.complete) {
        return 0
    }
    
    return this.fileSize - this.currentPosition;
  }

  file() {
    return {
      size: this.fileSize
    };
  }

  close() {
    this._fileStream.close();
    this.complete = false;
    this.position = 0
    this.inProgressOffset = 0
  }

  readUTFChunk() {
    if (this.complete) {
      if (this.debug) {
        console.log("... done!");
      }
      return Promise.resolve([]);
    }

    return new Promise((resolve, reject) => {
      const tryer = () => {
        setTimeout(() => {
          if (!this.ready) {
            // not ready... wait then try again
            tryer();
            return;
          }

          // stream is ready, try to read a chunk and process it if necessary
          const chunk = this._fileStream.read(this._bufferSize);
          if (this.debug) {
              console.log("chunk null", chunk === null);
          }
          if (chunk === null) {
            if (!this.complete) {
              tryer();
            } else {
              resolve([]);
            }
          } else {
            const extractedLines = this.processChunk(chunk);
            if (this.debug) {
              console.log("-----", this.chunkCounter, "-------");
              console.log("extracted lines", extractedLines.length);
              console.log("position", this.position());
              console.log("bytesAvailable", this.bytesAvailable());
              console.log("file", this.file().size);
            }

            this.chunkCounter++;

            resolve(extractedLines);
          }
        }, 0);
      };

      tryer();
    });
  }

  processChunk(chunk) {
    const { stringBuffer } = this;

    const extractedLines = [];
	
	let lineChunk = []
	let emptyChunk = true
	
    for (const b of chunk) {
      // advance the position tracker
      this.currentPosition++;
      if (this.inProgressOffset >= this._maxStringSize)
      	throw "This file is corrupt and contains over 256k of text with no newlines.";
      stringBuffer.writeUInt8(b, this.inProgressOffset);
      if (b === 10) {
        const line = stringBuffer.toString(this._encoding, 0, this.inProgressOffset);
	      
        lineChunk.push(line.trim());
        
        this.inProgressOffset = 0;
        if (emptyChunk) {
	        emptyChunk = false
	        extractedLines.push(lineChunk)
        }
        
        if (lineChunk.length >= 5000) {
	        emptyChunk = true
	        lineChunk = []
        }
      } else {
        this.inProgressOffset++;
      }
    }

    return extractedLines;
  }
}
