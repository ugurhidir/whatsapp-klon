// Gerekli kütüphaneleri çağırıyoruz
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// Birisi sunucuya bağlandığında ne olacağını tanımlıyoruz
io.on('connection', (socket) => {
  console.log('Bir kullanıcı bağlandı.');

  // Bir kullanıcıdan 'chat message' olayı geldiğinde...
  socket.on('chat message', (msg) => {
    console.log('Mesaj: ' + msg);
    // Gelen mesajı, gönderen hariç bağlı olan HERKESE geri gönderiyoruz.
    socket.broadcast.emit('chat message', msg); // BU SATIRI DEĞİŞTİRDİK
});

  // Kullanıcı bağlantıyı kestiğinde
  socket.on('disconnect', () => {
    console.log('Kullanıcı ayrıldı.');
  });
});

// Sunucuyu 3000 portunda dinlemeye başlatıyoruz
server.listen(3000, () => {
  console.log('Sunucu http://localhost:3000 adresinde çalışıyor');
});