const { app, BrowserWindow, ipcMain } = require('electron');
let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    frame: false, // no native bar
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('app.html');
}

app.whenReady().then(createWindow);

ipcMain.on('window-control', (event, command) => {
  if (!win) return;
  switch (command) {
    case 'minimize':
      win.minimize();
      break;
    case 'maximize':
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
      break;
    case 'close':
      win.close();
      break;
  }
});
