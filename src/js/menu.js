const { Menu } = require('electron')
const electron = require('electron')
const os = require('os')
const { manuallyCheckForUpdates } = require('./updater')
const app = electron.app

function setupMenu() {
  var isMac = (os.platform() === 'darwin')
  if (!isMac)
    return;
  const menu = Menu.buildFromTemplate([
    {
      label: app.getName(),
      submenu: [
        {
          label: 'Check for Updates...',
          click: manuallyCheckForUpdates
        },
        { type: 'separator' },
        {
          role: 'quit',
          label: 'Quit Uploader'
        }
      ]
   	},
    {
    label: "Edit",
    submenu: [
        { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
        { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
        { type: "separator" },
        { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
        { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
        { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
    ]}
  ])

  Menu.setApplicationMenu(menu)
}

module.exports.setupMenu = setupMenu
