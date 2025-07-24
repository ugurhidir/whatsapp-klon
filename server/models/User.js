const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  // ====> YENİ ALAN <====
  about: {
    type: String,
    default: "Merhaba! Bu WhatsApp klonunu kullanıyorum." // Varsayılan bir değer
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);