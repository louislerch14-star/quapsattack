const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "QuapsHub",
    icon: path.join(__dirname, 'icon.ico'), // Falls du ein Icon hinzufügen willst
    autoHideMenuBar: true, // Versteckt die langweilige Windows-Menüleiste oben
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // HIER wird deine Live-Website aufgerufen!
  mainWindow.loadURL('https://quapsattack.airbusfan.de');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // OPTIONAL: Globaler Shortcut (z.B. Alt + C)
  // Wenn man Alt+C drückt, öffnet sich die App oder minimiert sich
  globalShortcut.register('Alt+C', () => {
    if (!mainWindow) return;
    if (mainWindow.isFocused()) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});
