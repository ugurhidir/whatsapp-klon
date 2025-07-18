const mongoose = require('mongoose');

// Bir kullanıcının veritabanında nasıl görüneceğini tanımlayan şema
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true, // Bu alan zorunludur
    unique: true,   // Her kullanıcı adı benzersiz olmalı
    trim: true      // Başındaki ve sonundaki boşlukları temizler
  },
  password: {
    type: String,
    required: true  // Bu alan zorunludur
  }
}, { timestamps: true }); // Otomatik olarak createdAt ve updatedAt alanları ekler

// Bu şemayı kullanarak bir "User" modeli oluştur ve dışa aktar
module.exports = mongoose.model('User', UserSchema);