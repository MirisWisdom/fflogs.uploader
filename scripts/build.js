const fs = require("fs-extra")
const path = require("path")
const replace = require("replace-in-file")
const cmd = require("node-cmd")

const appMap = {
  wc: {
    name: "Warcraft Logs",
    secondaryName: "warcraftlogs",
    pathChange: "warcraft",
    icon: "wc_icon",
  },
  swtor: {
    name: "SWTOR Logs",
    secondaryName: "swtorlogs",
    pathChange: "swtor",
    icon: "swtor_icon",
  },
  ff: {
    name: "FF Logs",
    secondaryName: "fflogs",
    pathChange: "ff",
    icon: "ff_icon",
  },
  eso: {
    name: "ESO Logs",
    secondaryName: "esologs",
    pathChange: "eso",
    icon: "eso_icon",
  }
}

const publish = process.argv.includes("--publish")
const appArg = publish ? process.argv[3] : process.argv[2]
let dir = path.resolve(process.cwd() + "/../")
const tempDir = path.resolve(dir + "/temp")
fs.mkdirsSync(dir + "/temp")
fs.copy(dir + "/electron", dir + "/temp", runBuild)

function runBuild() {
  if (!appMap[appArg]) {
    return console.error("No app argument provided")
  }
  console.log("Building app: ", appMap[appArg].name)

  updateTempFiles(appMap[appArg])
  buildApp()
}

function updateTempFiles(build) {
  fs.removeSync(tempDir + "/node_modules")

  // Rename anything with Warcraft Logs to desired name
  replace.sync({
    files: tempDir + "/package.json",
    from: [ /Warcraft Logs/g, /warcraftlogs/g, /wc_icon/g ],
    to: [ build.name, build.secondaryName, build.icon ],
  })

  // Locate src/index.html and change imports
  replace.sync({
    files: path.resolve(tempDir, "src", "index.html"),
    from: /warcraft/g,
    to: build.pathChange,
  })
}

// Run build electron-builder build
function buildApp() {
  console.log("Running build...")
  const shouldPublish = publish ? "--publish always" : ""
  const buildScript = `
            cd ../temp
            yarn install
            electron-builder ${shouldPublish} -mw
        `
  cmd.get(buildScript, (err, data) => {
	if (!publish)
		return
		
    console.log("PWD: ", data)
    if (err) {
      console.log("Error: ", err)
    }

    const tempFiles = fs.readdirSync(tempDir + "/dist", "UTF-8")

    const filteredDmg = tempFiles.filter((file) => {
      return file.includes(".dmg") && !file.includes(".blockmap")
    })

    const filteredExe = tempFiles.filter((file) => {
      return file.includes(".exe") && !file.includes(".blockmap")
    })

    // Remove extension
    const fileNameDmg = filteredDmg[0]
      .replace(/\.[^/.]+$/, "")
      .replace(/\s/g, "\\ ")
    const fileNameExe = filteredExe[0]
      .replace(/\.[^/.]+$/, "")
      .replace(/\s/g, "\\ ")
    const newName = appMap[appArg].name.replace(/\s/g, "")

    const copyDmgScript = `
            aws s3 cp s3://combatloguploaders/${fileNameDmg}.dmg s3://combatloguploaders/${newName}Uploader.dmg && aws cloudfront create-invalidation --distribution-id E175EB2ZOOFQ7N --paths "/*"
        `
    cmd.get(copyDmgScript, (err, data) => {
      console.log("Rename Dmg: ", data)
      if (err) {
        console.log("Rename error: ", err)
      }
    })

    const copyExeScript = `
            aws s3 cp s3://combatloguploaders/${fileNameExe}.exe s3://combatloguploaders/${newName}Uploader.exe && aws cloudfront create-invalidation --distribution-id E175EB2ZOOFQ7N --paths "/*"
        `
    cmd.get(copyExeScript, (err, data) => {
      console.log("Rename Exe: ", data)
      if (err) {
        console.log("Rename error: ", err)
      }
    })
  })
}
