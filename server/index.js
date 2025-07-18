const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sanitizeHtml = require('sanitize-html');

// Modelleri içeri aktar
const User = require('./models/User');
const Message = require('./models/Message');

// Express'in JSON verilerini işlemesini sağla
app.use(express.json());

// MongoDB'ye bağlanma
mongoose.connect('mongodb://localhost:27017/whatsapp_klon')
  .then(() => console.log('Veritabanı bağlantısı başarılı!'))
  .catch((err) => console.error('Veritabanı bağlantı hatası:', err));

// ================== API ROTALARI ==================

// Kullanıcı Kayıt (Register) Rotası
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Kullanıcı adı ve şifre zorunludur.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    const savedUser = await newUser.save();
    res.status(201).json({ message: "Kullanıcı başarıyla oluşturuldu!", userId: savedUser._id });
  } catch (error) {
    console.error("Kayıt hatası:", error);
    // Aynı kullanıcı adı hatasını daha net bir şekilde yakala
    if (error.code === 11000) {
        return res.status(409).json({ message: 'Bu kullanıcı adı zaten alınmış.' });
    }
    res.status(500).json({ message: "Kayıt sırasında bir hata oluştu.", error: error.message });
  }
});

// Kullanıcı Giriş (Login) Rotası
app.post('/api/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (!user) {
            return res.status(404).json({ message: "Kullanıcı bulunamadı." });
        }

        const isMatch = await bcrypt.compare(req.body.password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Hatalı şifre." });
        }

        const token = jwt.sign(
            { userId: user._id, username: user.username },
            'GIZLI_ANAHTARINIZ_BURAYA', // Bu anahtarı güvenli bir yere taşıyın
            { expiresIn: '1h' }
        );

        res.status(200).json({ 
            message: "Giriş başarılı!", 
            token: token, 
            userId: user._id,
            username: user.username 
        });
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
        socket.user = decoded;
        next();
    });
});

// ================== SOCKET.IO BAĞLANTI MANTIĞI ==================
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
                gonderen: {
                    id: msg.sender._id.toString(),
                    username: msg.sender.username
                },
                zaman: msg.createdAt,
                room: msg.room
            }));

            socket.emit('room history', formattedHistory);

        } catch (error) {
            console.error("Geçmiş yüklenirken hata:", error);
        }
    });

    // Yeni bir mesaj gelince...
    socket.on('chat message', async (data) => {
        try {
            const cleanMessage = sanitizeHtml(data.msg, {
                allowedTags: [],
                allowedAttributes: {}
            });

            if (!cleanMessage) return;

            const message = new Message({
                content: cleanMessage,
                room: data.room,
                sender: socket.user.userId
            });
            await message.save();

            const broadcastData = {
                icerik: cleanMessage,
                gonderen: {
                    id: socket.user.userId,
                    username: socket.user.username
                },
                zaman: message.createdAt,
                room: data.room
            };
            // Mesajı gönderen hariç odadaki herkese gönder
            socket.to(data.room).emit('chat message', broadcastData);

        } catch (error) {
            console.error("Mesaj kaydedilirken hata:", error);
        }
    });

    socket.on('disconnect', () => {
        if (socket.user) {
            console.log('Kullanıcı ayrıldı:', socket.user.username, socket.id);
        } else {
            console.log('Kimliği doğrulanmamış bir kullanıcı ayrıldı:', socket.id);
        }
    });
});

server.listen(3000, () => {
  console.log('Sunucu http://localhost:3000 adresinde çalışıyor');
});