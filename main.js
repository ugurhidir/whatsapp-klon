// Gerekli modülleri içeri aktarıyoruz.
// app: Uygulamanın yaşam döngüsünü yönetir.
// BrowserWindow: Uygulama pencereleri oluşturur.
const { app, BrowserWindow } = require('electron');

// Ana pencereyi oluşturacak olan fonksiyon.
const createWindow = () => {
  // 800x600 piksel boyutlarında yeni bir tarayıcı penceresi oluşturur.
  const win = new BrowserWindow({
    width: 1000,
    height: 700
  });

  // Pencerenin içine index.html dosyasını yükler.
  win.loadFile('index.html');
  win.webContents.openDevTools();
  win.removeMenu();
};

// Electron hazır olduğunda createWindow fonksiyonunu çağırır.
// Bazı API'lar sadece bu olay gerçekleştikten sonra kullanılabilir.
app.whenReady().then(() => {
  createWindow();
});

// Tüm pencereler kapatıldığında uygulamayı kapatır (macOS hariç).
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});