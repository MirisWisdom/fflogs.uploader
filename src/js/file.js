const JSZip = require("jszip");
const tmp = require("tmp");
const axios = require("axios");
const FormData2 = require('form-data');
const concat = require("concat-stream")

// const testDebugger = new DebugToFile("/tmp/zipfiles.txt")
class ZipFile {
	static events() {
      return {
        UPLOAD_COMPLETE_DATA: "UPLOAD_COMPLETE_DATA",
        PROGRESS: "PROGRESS",
        ERROR: "ERROR",
        FINALIZED: "FINALIZED",
      }
    }
	
    static createTempFile() {
      const path = tmp.tmpNameSync();
      console.log(name);
      return new ZipFile({
        path
      });
    }
  
    constructor(meta) {
      this.meta = meta;
      this.fileListeners = {};
      this.cancelUpload = false
      this.cancelTokenSource = null
      this.addEventListener = this.addEventListener.bind(this);
      this.upload = this.upload.bind(this);
      this.cancel = this.cancel.bind(this);
      this.deleteFile = this.deleteFile.bind(this);
      this.finalize = this.finalize.bind(this);
  
      this.archive = new JSZip();
  
      console.log(this.meta);
    }
  
    addFileFromString(fileName, fileString) {
      this.archive.file("log.txt", fileString);
    }
  
    finalize(callback) {
      this.archive.generateNodeStream({type:'nodebuffer',streamFiles:false, compression: "DEFLATE", compressionOptions: { level: 9 }}).pipe(fs.createWriteStream(this.meta.path)).on('finish', function () {
        // JSZip generates a readable stream with a "end" event,
        // but is piped here in a writable stream which emits a "finish" event.
        callback()
      });
	} 

    addEventListener(id, listener) {
      this.fileListeners[id] = listener;
    }
  
    upload(path, params = {}) {
      const queryString = Object.keys(params)
        .map(key => {
          return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
        })
        .join("&");
  
      const url = `${path}?${queryString}`;
    // const url = "http://localhost:3010/post"
  
      const promise = new Promise(resolve => {
        const fd = new FormData2();
        fd.append("logfile", fs.createReadStream(this.meta.path));
        fd.pipe(
          concat({ encoding: "buffer" }, data =>
            resolve({ data, headers: fd.getHeaders() })
          )
        );
      });

    const CancelToken = axios.CancelToken;
    const source = CancelToken.source()
    this.cancelTokenSource = source
  
      promise.then(({ data, headers }) =>
        axios
          .request({
            method: "post",
            cancelToken: source.token,
            url,
            data,
            headers,
            onUploadProgress: p => {
              console.log("progress", p.total, p.loaded);
              const callbackKey = ZipFile.events().PROGRESS;
              const callback = this.fileListeners[callbackKey];
  
              if (!!callback) {
                callback({
                  bytesTotal: p.total,
                  bytesLoaded: p.loaded
                });
              }
            }
          })
          .then(
            data => {
              console.log("DONE?");
              console.log(data);
              const callbackKey = ZipFile.events().UPLOAD_COMPLETE_DATA;
              const callback = this.fileListeners[callbackKey];
              if (!!callback) {
                callback(data);
              }
            },
            error => {
              if (this.cancelUpload) {
                  return
              }

              const callbackKey = ZipFile.events().ERROR;
              const callback = this.fileListeners[callbackKey];
              if (!!callback) {
                callback(error);
              }
            }
          )
          .catch( (thrown) => {
            if (axios.isCancel(thrown)) {
              console.log('Request canceled', thrown.message);
            } else {
                callback(error);
            }
          })
      );
    }
  
    cancel() {
        this.cancelUpload = true
        if (this.cancelTokenSource) {
            this.cancelTokenSource.cancel('Operation canceled by user.')
        }
    }
  
    deleteFile() {
        console.log("Delete called on", this.meta.path)
        fs.unlinkSync(this.meta.path)
    }
  
    resolvePath() {}
  }