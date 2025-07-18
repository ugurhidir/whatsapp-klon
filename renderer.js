window.addEventListener('DOMContentLoaded', () => {
    // === BÖLÜM 1: GİRİŞ EKRANI ELEMANLARI VE OLAYLARI ===
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const registerBtn = document.getElementById('register-btn');
    const loginBtn = document.getElementById('login-btn');
    const statusMessage = document.getElementById('status-message');
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    
    let token = null;

    // Kayıt Ol butonu olayı
    registerBtn.addEventListener('click', async () => {
        const username = usernameInput.value;
        const password = passwordInput.value;
        if (!username || !password) {
            statusMessage.textContent = 'Lütfen tüm alanları doldurun.';
            return;
        }
        try {
            const response = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password }),
            });
            const data = await response.json();
            if (response.ok) {
                statusMessage.style.color = 'green';
                statusMessage.textContent = data.message;
            } else {
                statusMessage.style.color = 'red';
                statusMessage.textContent = data.message || 'Bir hata oluştu.';
            }
        } catch (error) {
            statusMessage.style.color = 'red';
            statusMessage.textContent = 'Sunucuya bağlanılamadı.';
        }
    });

    // Giriş Yap butonu olayı
    loginBtn.addEventListener('click', async () => {
        const username = usernameInput.value;
        const password = passwordInput.value;
        if (!username || !password) {
            statusMessage.textContent = 'Lütfen tüm alanları doldurun.';
            return;
        }
        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (response.ok) {
                token = data.token;
                loginContainer.style.display = 'none';
                appContainer.style.display = 'flex';
                initializeChat(token);
            } else {
                statusMessage.textContent = data.message;
            }
        } catch (error) {
            statusMessage.textContent = 'Sunucuya bağlanılamadı.';
        }
    });

    // === BÖLÜM 2: SOHBET EKRANI MANTIĞI ===
    function initializeChat(authToken) {
        const socket = io('http://localhost:3000', { auth: { token: authToken } });

        // ====> DÜZELTME: EKSİK ELEMANLAR BURADA YENİDEN SEÇİLİYOR <====
        const hosgeldinEkrani = document.getElementById('hosgeldin-ekrani');
        const sohbetEkrani = document.getElementById('sohbet-ekrani');
        // ==========================================================

        const sohbetKartlari = document.querySelectorAll('.sohbet-karti');
        const aktifSohbetIsmiElementi = document.getElementById('aktif-sohbet-ismi');
        const mesajlarAlani = document.querySelector('.mesajlar-alani');
        const mesajFormu = document.querySelector('.mesaj-yazma-formu');
        const mesajInput = mesajFormu.querySelector('input');

        sohbetKartlari.forEach(kart => {
            kart.addEventListener('click', () => {
                sohbetKartlari.forEach(digerKart => digerKart.classList.remove('aktif'));
                kart.classList.add('aktif');

                // ====> DÜZELTME: EKSİK KOD BURAYA EKLENİYOR <====
                hosgeldinEkrani.style.display = 'none';
                sohbetEkrani.style.display = 'flex';
                // ===============================================

                const yeniSohbetIsmi = kart.querySelector('.sohbet-isim').innerText;
                aktifSohbetIsmiElementi.innerText = yeniSohbetIsmi;
                mesajlarAlani.innerHTML = '';
                socket.emit('join room', yeniSohbetIsmi);
            });
        });

        mesajFormu.addEventListener('submit', (e) => {
            e.preventDefault();
            if (mesajInput.value) {
                const aktifOda = aktifSohbetIsmiElementi.innerText;
                const mesajIcerigi = mesajInput.value;
                socket.emit('chat message', { room: aktifOda, msg: mesajIcerigi });
                mesajBalonuCiz({ icerik: mesajIcerigi, tip: 'giden' });
                mesajInput.value = '';
            }
        });

        socket.on('chat message', (data) => {
            const aktifOda = aktifSohbetIsmiElementi.innerText;
            if (data.room === aktifOda) {
                mesajBalonuCiz({ icerik: data.msg, tip: 'gelen' });
            }
        });

        socket.on('room history', (history) => {
            history.forEach(mesaj => mesajBalonuCiz(mesaj));
        });

        socket.on('connect_error', (err) => {
            console.error('Socket bağlantı hatası:', err.message);
        });
        function mesajBalonuCiz(mesaj) {
        const mesajDiv = document.createElement('div');
        mesajDiv.classList.add('mesaj', mesaj.tip);
        const p = document.createElement('p');
        p.innerText = mesaj.icerik;
        mesajDiv.appendChild(p);
        mesajlarAlani.appendChild(mesajDiv);
        mesajlarAlani.scrollTop = mesajlarAlani.scrollHeight;
    }
    }

    
});