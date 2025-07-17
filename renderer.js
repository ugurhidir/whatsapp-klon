window.addEventListener('DOMContentLoaded', () => {
    const socket = io('http://localhost:3000');
    const sohbetGecmisleri = {};

    // HTML'den gerekli elemanları seçiyoruz
    const sohbetKartlari = document.querySelectorAll('.sohbet-karti');
    const hosgeldinEkrani = document.getElementById('hosgeldin-ekrani');
    const sohbetEkrani = document.getElementById('sohbet-ekrani');
    const aktifSohbetIsmi = document.getElementById('aktif-sohbet-ismi');
    const mesajlarAlani = document.querySelector('.mesajlar-alani');
    const mesajFormu = document.querySelector('.mesaj-yazma-formu');
    const mesajInput = mesajFormu.querySelector('input');

    // Sohbet kartlarına tıklama olayları
    sohbetKartlari.forEach(kart => {
        kart.addEventListener('click', () => {
            sohbetKartlari.forEach(digerKart => digerKart.classList.remove('aktif'));
            kart.classList.add('aktif');
            hosgeldinEkrani.style.display = 'none';
            sohbetEkrani.style.display = 'flex';
            const sohbetIsmi = kart.querySelector('.sohbet-isim').innerText;
            aktifSohbetIsmi.innerText = sohbetIsmi;

            // Sohbet değiştirildiğinde eski mesajları temizle (Opsiyonel ama iyi bir pratik)
            mesajlarAlani.innerHTML = '';
        });
    });

    // Mesaj gönderme formu 'submit' olduğunda
    mesajFormu.addEventListener('submit', (e) => {
        e.preventDefault(); 
        if (mesajInput.value) {
            socket.emit('chat message', mesajInput.value);
            mesajEkle(mesajInput.value, 'giden');
            mesajInput.value = '';
        }
    });

    // Sunucudan 'chat message' olayı geldiğinde...
    socket.on('chat message', (msg) => {
        mesajEkle(msg, 'gelen');
    });

    // Ekrana yeni bir mesaj balonu ekleyen yardımcı fonksiyon
    function mesajEkle(icerik, tip) {
        const mesajDiv = document.createElement('div');
        mesajDiv.classList.add('mesaj', tip);
        
        const p = document.createElement('p');
        p.innerText = icerik;
        
        mesajDiv.appendChild(p);
        mesajlarAlani.appendChild(mesajDiv);

        mesajlarAlani.scrollTop = mesajlarAlani.scrollHeight;
    }
});