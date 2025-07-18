const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    content: { type: String, required: true },
    room: { type: String, required: true },
    sender: {
        type: mongoose.Schema.Types.ObjectId, // Bir User ID'si saklayacak
        ref: 'User', // Bu ID'nin User modeline ait olduğunu belirtir
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);