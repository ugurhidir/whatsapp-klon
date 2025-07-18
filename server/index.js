// server/index.js
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// ================== YENİ: SUNUCU HAFIZASI ==================
const chatHistory = {}; // Tüm odaların geçmişini burada tutacağız.
// Yapısı şöyle olacak: { 'Proje Ekibi': [mesaj1, mesaj2], 'Ayşe': [mesaj3] }

io.on('connection', (socket) => {
  console.log('Bir kullanıcı bağlandı:', socket.id);

  socket.on('join room', (roomName) => {
    socket.join(roomName);
    console.log(`Kullanıcı ${socket.id}, '${roomName}' odasına katıldı.`);

    // ===> YENİ: Geçmişi yeni katılan kullanıcıya gönder
    // Eğer bu oda için bir geçmiş varsa, onu sadece bu kullanıcıya gönder.
    if (chatHistory[roomName]) {
      socket.emit('room history', chatHistory[roomName]);
    }
  });

  socket.on('chat message', (data) => {
    // data -> { room: 'oda_ismi', msg: 'kullanıcının mesajı' }
    console.log(`'${data.room}' odasına mesaj: ${data.msg}`);

    // ===> YENİ: Gelen mesajı sunucudaki geçmişe kaydet
    const messageData = { icerik: data.msg, tip: 'gelen' };
    if (!chatHistory[data.room]) {
      chatHistory[data.room] = []; // Odanın geçmişi yoksa oluştur
    }
    chatHistory[data.room].push(messageData);

    // Mesajı, gönderen hariç, odadaki herkese gönder
    socket.to(data.room).emit('chat message', data);
  });

  socket.on('disconnect', () => {
    console.log('Kullanıcı ayrıldı:', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Sunucu http://localhost:3000 adresinde çalışıyor');
});