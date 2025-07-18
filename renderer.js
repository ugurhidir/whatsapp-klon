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
    let currentUser = null; // Değişkeni en dışta, başlangıçta null olarak tanımla

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
                // Dışarıdaki currentUser değişkeninin değerini güncelle
                currentUser = { id: data.userId, username: data.username };
                
                loginContainer.style.display = 'none';
                appContainer.style.display = 'flex';
                initializeChat(token, currentUser);
            } else {
                statusMessage.textContent = data.message;
            }
        } catch (error) {
            statusMessage.textContent = 'Sunucuya bağlanılamadı.';
        }
    });

    // === BÖLÜM 2: SOHBET EKRANI MANTIĞI ===
     function initializeChat(authToken, user) {
        const socket = io('http://localhost:3000', { auth: { token: authToken } });

        const hosgeldinEkrani = document.getElementById('hosgeldin-ekrani');
        const sohbetEkrani = document.getElementById('sohbet-ekrani');
        const sohbetKartlari = document.querySelectorAll('.sohbet-karti');
        const aktifSohbetIsmiElementi = document.getElementById('aktif-sohbet-ismi');
        const mesajlarAlani = document.querySelector('.mesajlar-alani');
        const mesajFormu = document.querySelector('.mesaj-yazma-formu');
        const mesajInput = mesajFormu.querySelector('input');

        sohbetKartlari.forEach(kart => {
            kart.addEventListener('click', () => {
                sohbetKartlari.forEach(digerKart => digerKart.classList.remove('aktif'));
                kart.classList.add('aktif');
                hosgeldinEkrani.style.display = 'none';
                sohbetEkrani.style.display = 'flex';
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
                // Sunucuya sadece ham bilgiyi gönder
                socket.emit('chat message', { room: aktifOda, msg: mesajIcerigi });
                
                // Kendi giden mesajımızı kendimiz çiziyoruz
                mesajBalonuCiz({
                    icerik: mesajIcerigi,
                    gonderen: { id: user.id, username: user.username },
                    zaman: new Date() // Anlık zamanı kullan
                });
                mesajInput.value = '';
            }
        });

        // Sunucudan gelen CANLI mesaj
        socket.on('chat message', (mesaj) => {
            const aktifOda = aktifSohbetIsmiElementi.innerText;
            if (mesaj.room === aktifOda) {
                mesajBalonuCiz(mesaj);
            }
        });

        // Sunucudan gelen GEÇMİŞ mesajlar
        socket.on('room history', (history) => {
            history.forEach(mesaj => {
                mesajBalonuCiz(mesaj);
            });
        });

        socket.on('connect_error', (err) => {
            console.error('Socket bağlantı hatası:', err.message);
        });

        // Bu yardımcı fonksiyon artık doğru veri yapısını bekliyor
        function mesajBalonuCiz(mesaj) {
            const mesajDiv = document.createElement('div');
            // 'gonderen' nesnesinin varlığını kontrol et
            if (!mesaj.gonderen || !mesaj.gonderen.id) {
                console.error("Hatalı mesaj yapısı:", mesaj);
                return; // Hatalıysa balonu çizme
            }

            const tip = mesaj.gonderen.id === user.id ? 'giden' : 'gelen';
            mesajDiv.classList.add('mesaj', tip);

            if (tip === 'gelen' && mesaj.gonderen.username) {
                const senderP = document.createElement('p');
                senderP.classList.add('mesaj-gonderen');
                senderP.textContent = mesaj.gonderen.username;
                mesajDiv.appendChild(senderP);
            }

            const contentP = document.createElement('p');
            contentP.textContent = mesaj.icerik;
            mesajDiv.appendChild(contentP);

            if (mesaj.zaman) {
                const timeP = document.createElement('p');
                timeP.classList.add('mesaj-zamani');
                timeP.textContent = new Date(mesaj.zaman).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                mesajDiv.appendChild(timeP);
            }

            mesajlarAlani.appendChild(mesajDiv);
            mesajlarAlani.scrollTop = mesajlarAlani.scrollHeight;
        }
    }
});