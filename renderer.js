// renderer.js
window.addEventListener('DOMContentLoaded', () => {
    // ====> KALDIRILDI: Artık istemcinin kendi geçmişi yok.
    // const sohbetGecmisleri = {}; 

    const socket = io('http://localhost:3000');

    // HTML elemanları (değişiklik yok)
    const sohbetKartlari = document.querySelectorAll('.sohbet-karti');
    const hosgeldinEkrani = document.getElementById('hosgeldin-ekrani');
    const sohbetEkrani = document.getElementById('sohbet-ekrani');
    const aktifSohbetIsmiElementi = document.getElementById('aktif-sohbet-ismi');
    const mesajlarAlani = document.querySelector('.mesajlar-alani');
    const mesajFormu = document.querySelector('.mesaj-yazma-formu');
    const mesajInput = mesajFormu.querySelector('input');

    // Bir odaya tıklandığında...
    sohbetKartlari.forEach(kart => {
        kart.addEventListener('click', () => {
            // ...stil, panel ve başlık güncelleme kodları aynı...
            sohbetKartlari.forEach(digerKart => digerKart.classList.remove('aktif'));
            kart.classList.add('aktif');
            hosgeldinEkrani.style.display = 'none';
            sohbetEkrani.style.display = 'flex';
            const yeniSohbetIsmi = kart.querySelector('.sohbet-isim').innerText;
            aktifSohbetIsmiElementi.innerText = yeniSohbetIsmi;

            // Mesajlar alanını her zaman temizle
            mesajlarAlani.innerHTML = '';

            // Sunucuya odaya katıldığını bildir. Sunucu bize geçmişi gönderecek.
            socket.emit('join room', yeniSohbetIsmi);
        });
    });
    
    // Mesaj gönderme formu (giden mesajları ekleme)
    mesajFormu.addEventListener('submit', (e) => {
        e.preventDefault();
        if (mesajInput.value) {
            const aktifOda = aktifSohbetIsmiElementi.innerText;
            const mesajIcerigi = mesajInput.value;
            socket.emit('chat message', { room: aktifOda, msg: mesajIcerigi });
            mesajBalonuCiz({ icerik: mesajIcerigi, tip: 'giden' }); // Giden mesajı doğrudan çiz
            mesajInput.value = '';
        }
    });

    // ================== YENİ OLAY DİNLEYİCİLERİ ==================

    // Sunucudan gelen CANLI mesajları dinle
    socket.on('chat message', (data) => {
        const aktifOda = aktifSohbetIsmiElementi.innerText;
        if (data.room === aktifOda) {
             // Gelen mesajın tipi her zaman 'gelen' olmalı
            mesajBalonuCiz({ icerik: data.msg, tip: 'gelen' });
        }
    });

    // Sunucudan gelen GEÇMİŞ mesajları dinle
    socket.on('room history', (history) => {
        // history -> [mesaj1, mesaj2, ...]
        history.forEach(mesaj => {
            mesajBalonuCiz(mesaj);
        });
    });

    // YARDIMCI FONKSİYON (Değişiklik yok)
    function mesajBalonuCiz(mesaj) {
        const mesajDiv = document.createElement('div');
        mesajDiv.classList.add('mesaj', mesaj.tip);
        const p = document.createElement('p');
        p.innerText = mesaj.icerik;
        mesajDiv.appendChild(p);
        mesajlarAlani.appendChild(mesajDiv);
        mesajlarAlani.scrollTop = mesajlarAlani.scrollHeight;
    }
});