const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sanitizeHtml = require('sanitize-html');
const multer = require('multer'); // YENİ: multer'ı içeri aktar
const path = require('path');   // YENİ: Dosya yolları için Node.js modülü

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Modelleri içeri aktar
const User = require('./models/User');
const Message = require('./models/Message');

// Express'in JSON verilerini işlemesini sağla
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// MongoDB'ye bağlanma
mongoose.connect('mongodb://192.168.2.110:27017/whatsapp_klon')
  .then(() => console.log('Veritabanı bağlantısı başarılı!'))
  .catch((err) => console.error('Veritabanı bağlantı hatası:', err));

// ====> YENİ: Multer yapılandırması <====
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
         cb(null, path.join(__dirname, 'uploads/avatars/'));
    },
    filename: function (req, file, cb) {
        // Dosyaya benzersiz bir isim ver (kullanıcıID-zaman.uzantı)
        const uniqueSuffix = req.user.userId + '-' + Date.now() + path.extname(file.originalname);
        cb(null, uniqueSuffix);
    }
});
const upload = multer({ storage: storage });

// ====> YENİ: Yeniden kullanılabilir kimlik doğrulama middleware'i <====
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, 'GIZLI_ANAHTARINIZ_BURAYA', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user; // Kullanıcı bilgisini request nesnesine ekle
        next();
    });
};

// ================== API ROTALARI ==================

// Kullanıcı Kayıt (Register) Rotası
app.post('/api/register', async (req, res) => {
  try {
    // ====> DEĞİŞİKLİK: email'i de al ve kontrol et <====
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Kullanıcı adı, email ve şifre zorunludur.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // ====> DEĞİŞİKLİK: email'i de kaydet <====
    const newUser = new User({ username, email, password: hashedPassword });
    const savedUser = await newUser.save();

    res.status(201).json({ message: "Kullanıcı başarıyla oluşturuldu!", userId: savedUser._id });

  } catch (error) {
    console.error("Kayıt hatası:", error);
    if (error.code === 11000) {
        // Hangi alanın kopyalandığını tespit et (username mi email mi)
        const field = Object.keys(error.keyValue)[0];
        return res.status(409).json({ message: `Bu ${field} zaten alınmış.` });
    }
    res.status(500).json({ message: "Kayıt sırasında bir hata oluştu." });
  }
});

// Kullanıcı Giriş (Login) Rotası
app.post('/api/login', async (req, res) => {
     try {
        // ====> DEĞİŞİKLİK: Giriş yaparken kullanıcı adı VEYA email ile bulma <====
        // Bu, kullanıcıların email'leriyle de giriş yapabilmesini sağlar.
        const user = await User.findOne({ 
            $or: [{ username: req.body.usernameOrEmail }, { email: req.body.usernameOrEmail }]
        });

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
        const userProfile = {
            id: user._id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            avatar: user.avatar,
            about: user.about,
            dateOfBirth: user.dateOfBirth,
            city: user.city,
            socials: user.socials
        };

        res.status(200).json({ 
            message: "Giriş başarılı!", 
            token: token, 
            userId: user._id,
            user: userProfile
        });
    } catch (error) {
        console.error("Giriş hatası:", error);
        res.status(500).json({ message: "Giriş sırasında bir hata oluştu." });
    }
});

// ================== PROFİL GÜNCELLEME ROTASI ==================
app.put('/api/profile/update', authenticateToken, async (req, res) => {
    try {
        const { fullName, about, dateOfBirth, city, socials } = req.body;
        const updates = { fullName, about, dateOfBirth, city, socials };
        
        const updatedUser = await User.findByIdAndUpdate(req.user.userId, { $set: updates }, { new: true }).select('-password');
        if (!updatedUser) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        
        res.status(200).json({ message: 'Profil başarıyla güncellendi.', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: "Profil güncellenirken bir hata oluştu." });
    }
});

// ====> YENİ: Avatar Yükleme Rotası <====
app.post('/api/profile/avatar', [authenticateToken, upload.single('avatar')], async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Lütfen bir dosya seçin.' });
        }
        
        const avatarPath = `uploads/avatars/${req.file.filename}`; // Sadece göreceli yolu kaydet

        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId, 
            { avatar: avatarPath },
            { new: true }
        ).select('-password');
        
        res.status(200).json({ message: 'Avatar başarıyla güncellendi.', user: updatedUser });

    } catch (error) {
        console.error("Avatar yükleme hatası:", error);
        res.status(500).json({ message: "Avatar yüklenirken bir hata oluştu." });
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