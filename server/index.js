// server/index.js
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const mongoose = require('mongoose');
// ====> YENİ: Gerekli paketleri ve modeli içeri aktar <====
const bcrypt = require('bcrypt');
const User = require('./models/User'); // Az önce oluşturduğumuz User modelini içeri aktar
const jwt = require('jsonwebtoken');
const sanitizeHtml = require('sanitize-html'); // YENİ
const Message = require('./models/Message');   // YENİ


// MongoDB'ye bağlanma
mongoose.connect('mongodb://localhost:27017/whatsapp_klon')
  .then(() => {
    console.log('Veritabanı bağlantısı başarılı!');
  })
  .catch((err) => {
    console.error('Veritabanı bağlantı hatası:', err);
  });

app.use(express.json());
// ================== YENİ: API ROTALARI ==================

// Kullanıcı Kayıt (Register) Rotası
app.post('/api/register', async (req, res) => {
  try {
    // 1. İstek gövdesinden kullanıcı adı ve şifreyi al
    const { username, password } = req.body;

    // 2. Şifreyi hash'le
    const hashedPassword = await bcrypt.hash(password, 10); // 10, hash'leme gücüdür

    // 3. Yeni bir kullanıcı nesnesi oluştur
    const newUser = new User({
      username: username,
      password: hashedPassword
    });

    // 4. Kullanıcıyı veritabanına kaydet
    const savedUser = await newUser.save();

    // 5. Başarılı olduğuna dair bir cevap gönder
    res.status(201).json({ message: "Kullanıcı başarıyla oluşturuldu!", userId: savedUser._id });

  } catch (error) {
    // Eğer bir hata olursa (örn: kullanıcı adı zaten mevcutsa)
    console.error("Kayıt hatası:", error);
    res.status(500).json({ message: "Kayıt sırasında bir hata oluştu.", error: error.message });
  }
});
app.post('/api/login', async (req, res) => {
    try {
        // 1. Kullanıcıyı veritabanında kullanıcı adına göre bul
        const user = await User.findOne({ username: req.body.username });
        if (!user) {
            // Kullanıcı bulunamadıysa hata gönder
            return res.status(404).json({ message: "Kullanıcı bulunamadı." });
        }

        // 2. Gelen şifre ile veritabanındaki hash'lenmiş şifreyi karşılaştır
        const isMatch = await bcrypt.compare(req.body.password, user.password);
        if (!isMatch) {
            // Şifreler eşleşmiyorsa hata gönder
            return res.status(400).json({ message: "Hatalı şifre." });
        }

        // 3. Şifreler eşleşiyorsa, bir JWT oluştur
        const token = jwt.sign(
            { userId: user._id, username: user.username }, // Token'ın içine gömülecek veri (payload)
            'GIZLI_ANAHTARINIZ_BURAYA',                      // Gizli anahtar (daha sonra güvenli bir yere taşınmalı)
            { expiresIn: '1h' }                             // Token'ın geçerlilik süresi (örn: 1 saat)
        );

        // 4. Token'ı istemciye gönder
        res.status(200).json({ message: "Giriş başarılı!", token: token, username: user.username });

    } catch (error) {
        console.error("Giriş hatası:", error);
        res.status(500).json({ message: "Giriş sırasında bir hata oluştu." });
    }
});
// ================== SOCKET.IO YETKİLENDİRME (MIDDLEWARE) ==================
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error: Token eksik'));
    }
    jwt.verify(token, 'GIZLI_ANAHTARINIZ_BURAYA', (err, decoded) => {
        if (err) {
            return next(new Error('Authentication error: Token geçersiz'));
        }
        // Token geçerliyse, kullanıcı bilgilerini socket nesnesine ekle
        socket.user = decoded;
        next();
    });
});

io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.user.username, socket.id);

    // Bir odaya katılınca, geçmişi veritabanından çekip gönder
    socket.on('join room', async (roomName) => {
        try {
            socket.join(roomName);
            console.log(`Kullanıcı ${socket.user.username}, '${roomName}' odasına katıldı.`);
            
            const history = await Message.find({ room: roomName }).sort({ createdAt: 1 }).populate('sender', 'username');
            const formattedHistory = history.map(msg => ({
                icerik: msg.content,
                tip: msg.sender._id.toString() === socket.user.userId ? 'giden' : 'gelen',
                gonderen: msg.sender.username,
                zaman: msg.createdAt
            }));

            socket.emit('room history', formattedHistory);

        } catch (error) {
            console.error("Geçmiş yüklenirken hata:", error);
        }
    });

    // Yeni bir mesaj gelince...
    socket.on('chat message', async (data) => {
        try {
            // 1. Gelen mesajı temizle (Sanitize)
            const cleanMessage = sanitizeHtml(data.msg, {
                allowedTags: [], // Hiçbir HTML etiketine izin verme
                allowedAttributes: {}
            });

            if (!cleanMessage) return; // Boş mesajı engelle

            // 2. Mesajı veritabanına kaydet
            const message = new Message({
                content: cleanMessage,
                room: data.room,
                sender: socket.user.userId
            });
            await message.save();

            // 3. Mesajı odadaki diğerlerine gönder
            const broadcastData = {
                room: data.room,
                msg: cleanMessage,
                sender: socket.user.username,
                timestamp: message.createdAt
            };
            socket.to(data.room).emit('chat message', broadcastData);

        } catch (error) {
            console.error("Mesaj kaydedilirken hata:", error);
        }
    });

  socket.on('disconnect', () => {
    console.log('Kullanıcı ayrıldı:', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Sunucu http://localhost:3000 adresinde çalışıyor');
});