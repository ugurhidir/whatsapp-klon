const mongoose = require('mongoose');

// --- Sosyal Medya Linki için Alt Şema ---
const SocialLinkSchema = new mongoose.Schema({
  platform: {
    type: String,
    required: true,
    // ====> DEĞİŞİKLİK BURADA <====
    enum: ['linkedin', 'twitter', 'github', 'instagram', 'reddit', 'website', 'other'],
    trim: true,
    lowercase: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });


// --- ANA KULLANICI ŞEMASI ---
const UserSchema = new mongoose.Schema({
  // ... diğer tüm alanlar aynı ...
  username: { type: String, required: true, unique: true, trim: true, index: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  fullName: { type: String, trim: true, default: '' },
  avatar: { type: String, default: '' },
  about: { type: String, default: "Merhaba! Bu WhatsApp klonunu kullanıyorum.", trim: true },
  dateOfBirth: { type: Date },
  city: { type: String, trim: true, default: '' },
  socials: [SocialLinkSchema]

}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);