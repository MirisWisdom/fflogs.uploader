class DebugToFile {

    constructor(fileName = "debug.txt", active = true) {
        this.number = 0
        this.file = fs.createWriteStream(fileName)
        this.log = this.log.bind(this)
        this.active = active
    }

    log(toWrite) {
        if (this.active) {
            this.file.write(toWrite + "\n")
        }
    }
}