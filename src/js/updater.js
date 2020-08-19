const { dialog } = require('electron')
const { autoUpdater } = require('electron-updater')

let updateMenuItem = null

// Setup logger for auto updater
autoUpdater.logger = require('electron-log')
autoUpdater.logger.transports.file.level = 'info'
autoUpdater.autoDownload = false

autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...')
})

let userUpdateChoice = 0;
autoUpdater.on('update-available', info => {
  console.log('Update available')
  console.log('Version', info.version)
  console.log('Release date', info.releaseDate)
  userUpdateChoice = dialog.showMessageBoxSync({
    type: 'question',
    buttons: ['No', 'Yes'],
    title: 'Update downloaded',
    message: 'An update is available. Install and restart now?',
    defaultId: 0,
    cancelId: 1
  })
  const no = userUpdateChoice === 0
  if (no) {
    console.log('User decided not to update now')
  } else {
    console.log('User decided to update now. Downloading update.')
    autoUpdater.downloadUpdate()
  }
})

autoUpdater.on('update-not-available', () => {
  console.log('Update not available')
  if (updateMenuItem !== null) {
    dialog.showMessageBox({
      title: 'No Updates',
      message: 'Current version is up-to-date.'
    })
    updateMenuItem.enabled = true
    updateMenuItem = null
  }
})

autoUpdater.on('download-progress', progress => {
  console.log(`Progress ${Math.floor(progress.percent)}`);
})

autoUpdater.on('update-downloaded', () => {
  console.log('Update downloaded')
  if (updateMenuItem !== null) {
    updateMenuItem.enabled = true
    updateMenuItem = null
  }
  autoUpdater.quitAndInstall()
})

autoUpdater.on('error', error => {
  console.error(error)
})

function manuallyCheckForUpdates(menuItem) {
  updateMenuItem = menuItem
  updateMenuItem.enabled = false
  autoUpdater.checkForUpdates()
}

function preventLoginIfNeeded(mainWindow) {
    if (userUpdateChoice === 1 ) {
        mainWindow.webContents.send('prevent-login')
    }
}
// exports
module.exports.autoUpdater = autoUpdater
module.exports.manuallyCheckForUpdates = manuallyCheckForUpdates
module.exports.preventLoginIfNeeded = preventLoginIfNeeded
