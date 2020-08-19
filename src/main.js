// Modules to control application life and create native browser window
const { app, BrowserWindow } = require('electron')

const { autoUpdater, preventLoginIfNeeded } = require('./js/updater')

const { setupMenu } = require('./js/menu')
const isDev = require('electron-is-dev')

const packageJson = require("../package.json")
const version = packageJson.version
const title = packageJson.appTitle

// Show debugger when developing
require('electron-debug')({ showDevTools: true })

app.commandLine.appendSwitch("disable-background-timer-throttling");

function checkIfCalledViaCLI(args){
	if(args && args.length > 1){
		return true;
	}
	return false;
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow() {
  // Check if called from cli
  const isCalledViaCLI = checkIfCalledViaCLI(process.argv)

  // Trigger update check
  if (!isDev) {
    autoUpdater.checkForUpdates()
  }

  setupMenu()

  // Create the browser window.
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      webviewTag: true
    },
    title: `${title} v${version}`,
    width: 900, height:580, resizable: false
  })

  if (!isDev) {
    autoUpdater.on('update-available', () => {
        preventLoginIfNeeded(mainWindow)
    })
  }
  
  mainWindow.removeMenu()
  
  autoUpdater.on('download-progress', progress => {
    mainWindow && mainWindow.setProgressBar(progress.percent * 0.01)
    mainWindow.webContents.send('download-progress', Math.floor(progress.percent))
  })

  mainWindow.webContents.on('did-finish-load', () => {
      isCalledViaCLI && mainWindow.webContents.send('is-cli', process.argv)
  })
  // and load the index.html of the app.
  mainWindow.loadFile('src/index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  app.quit()
})

app.on('activate', function() {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
