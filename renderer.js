window.addEventListener('DOMContentLoaded', () => {
    // === BÖLÜM 1: GİRİŞ EKRANI ELEMANLARI VE OLAYLARI ===
    const usernameInput = document.getElementById('username-input-login');
    const emailInput = document.getElementById('email-input-register');
    const passwordInput = document.getElementById('password-input');
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
                currentUser = data.user;
                
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
        

        // === BÖLÜM A: ELEMAN SEÇİMLERİ (DEĞİŞİKLİK YOK) ===
        const hosgeldinEkrani = document.getElementById('hosgeldin-ekrani');
        const sohbetEkrani = document.getElementById('sohbet-ekrani');
        const sohbetKartlari = document.querySelectorAll('.sohbet-karti');
        const aktifSohbetIsmiElementi = document.getElementById('aktif-sohbet-ismi');
        const mesajlarAlani = document.querySelector('.mesajlar-alani');
        const mesajFormu = document.querySelector('.mesaj-yazma-formu');
        const mesajInput = mesajFormu.querySelector('input');

        // === BÖLÜM B: PROFİL MODAL ELEMANLARI VE MANTIĞI (TAMAMEN YENİLENDİ) ===
        const profileModal = document.getElementById('profile-modal');
        const profileOpenBtn = document.getElementById('profile-open-btn');
        const profileSaveBtn = document.getElementById('profile-save-btn');
        const profileCancelBtn = document.getElementById('profile-cancel-btn');
        const profileStatusMessage = document.getElementById('profile-status-message');
        const fullNameInput = document.getElementById('fullName-input');
        const usernameDisplay = document.getElementById('username-display');
        const avatarPlaceholder = document.getElementById('avatar-placeholder');
        const avatarInput = document.getElementById('avatar-input');
        const avatarPreview = document.getElementById('avatar-preview');
        const avatarInitials = document.getElementById('avatar-initials');
        const aboutInput = document.getElementById('about-input');
        const cityInput = document.getElementById('city-input');
        const dobInput = document.getElementById('dob-input');
        const socialsContainer = document.getElementById('socials-container');
        const addSocialBtn = document.getElementById('add-social-btn');

        let selectedAvatarFile = null; // Seçilen resim dosyasını saklamak için

        // ================== PROFİL MANTIĞI ==================
        
        // --- Yardımcı Fonksiyon: Sosyal Medya Alanı Oluşturma ---
        const createSocialItem = (social = { platform: 'website', url: '' }) => {
            const item = document.createElement('div');
            item.className = 'social-item';
            
            const platformSelect = document.createElement('select');
            ['website', 'linkedin', 'twitter', 'github', 'instagram', 'reddit', 'other'].forEach(p => {
                const option = document.createElement('option');
                option.value = p;
                option.textContent = p.charAt(0).toUpperCase() + p.slice(1);
                if (p === social.platform) option.selected = true;
                platformSelect.appendChild(option);
            });
         const urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.placeholder = 'https://...';
            urlInput.value = social.url;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '×'; // Çarpı işareti
            removeBtn.onclick = () => item.remove();

            item.appendChild(platformSelect);
            item.appendChild(urlInput);
            item.appendChild(removeBtn);
            socialsContainer.appendChild(item);
        };

         // --- Profil Olay Dinleyicileri ---
        avatarPlaceholder.addEventListener('click', () => {
            avatarInput.click();
        });
        avatarInput.addEventListener('change', () => {
            if (avatarInput.files && avatarInput.files[0]) {
                selectedAvatarFile = avatarInput.files[0];
                
                // Seçilen resmi önizlemede göster
                const reader = new FileReader();
                reader.onload = (e) => {
                    avatarPreview.src = e.target.result;
                    avatarPreview.style.display = 'block';
                    avatarInitials.style.display = 'none';
                };
                reader.readAsDataURL(selectedAvatarFile);
            }
        });
        profileOpenBtn.addEventListener('click', () => {
            fullNameInput.value = user.fullName || '';
            usernameDisplay.value = user.username;
            avatarInitials.textContent = user.username.charAt(0).toUpperCase();
            aboutInput.value = user.about || '';
            cityInput.value = user.city || '';
            // Tarihi YYYY-MM-DD formatına çevir
            if (user.dateOfBirth) {
                dobInput.value = new Date(user.dateOfBirth).toISOString().split('T')[0];
            } else {
                dobInput.value = '';
            }

            // Mevcut sosyal medya linklerini temizle ve yeniden oluştur
            socialsContainer.innerHTML = '';
            if (user.socials && user.socials.length > 0) {
                user.socials.forEach(createSocialItem);
            }
            if (user.avatar) {
                // Sunucudaki resmin tam URL'ini oluştur
                avatarPreview.src = `http://localhost:3000/${user.avatar}`;
                avatarPreview.style.display = 'block';
                avatarInitials.style.display = 'none';
            } else {
                avatarPreview.style.display = 'none';
                avatarInitials.style.display = 'block';
                avatarInitials.textContent = user.username.charAt(0).toUpperCase();
            }
            selectedAvatarFile = null; // Her açılışta seçimi sıfırla
            avatarInput.value = ''; // Input'u temizle

            profileModal.style.display = 'flex';
        });
        profileCancelBtn.addEventListener('click', () => {
            profileModal.style.display = 'none';
        });
        addSocialBtn.addEventListener('click', () => createSocialItem());
        profileSaveBtn.addEventListener('click', async () => {
            profileStatusMessage.textContent = 'Kaydediliyor...';
            // Formdaki tüm verileri topla
            const socialsData = [];
            document.querySelectorAll('.social-item').forEach(item => {
                const platform = item.querySelector('select').value;
                const url = item.querySelector('input').value;
                if (url) { // Sadece URL girilmişse ekle
                    socialsData.push({ platform, url });
                }
            }); // <--- forEach DÖNGÜSÜNÜN KAPANIŞI BURADA

            const updatedProfileData = {
                fullName: fullNameInput.value,
                about: aboutInput.value,
                city: cityInput.value,
                dateOfBirth: dobInput.value ? new Date(dobInput.value) : null,
                socials: socialsData
            };

            // Sunucuya PUT isteği gönder
            try {
                const textUpdateResponse = await fetch('http://localhost:3000/api/profile/update', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify(updatedProfileData)
                });
                if (!textUpdateResponse.ok) throw new Error('Profil bilgileri güncellenemedi.');
                const textData = await textUpdateResponse.json();
                Object.assign(user, textData.user); // Yerel veriyi güncelle

                // 2. Eğer yeni bir avatar seçildiyse, onu yükle
                if (selectedAvatarFile) {
                    const formData = new FormData();
                    formData.append('avatar', selectedAvatarFile);

                    const avatarUpdateResponse = await fetch('http://localhost:3000/api/profile/avatar', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${authToken}` },
                        body: formData // JSON yerine FormData gönderiyoruz
                    });
                    if (!avatarUpdateResponse.ok) throw new Error('Avatar yüklenemedi.');
                    const avatarData = await avatarUpdateResponse.json();
                    Object.assign(user, avatarData.user); // Yerel veriyi tekrar güncelle
                }

                // Her şey başarılıysa
                profileStatusMessage.style.color = 'green';
                profileStatusMessage.textContent = 'Profil başarıyla güncellendi!';
                setTimeout(() => {
                    profileModal.style.display = 'none';
                    profileStatusMessage.textContent = '';
                }, 1500);

            } catch (error) {
                profileStatusMessage.style.color = 'red';
                profileStatusMessage.textContent = error.message || 'Bir hata oluştu.';
            }
        });

        // ================== SOHBET MANTIĞI ==================
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
                socket.emit('chat message', { room: aktifOda, msg: mesajIcerigi });
                mesajBalonuCiz({
                    icerik: mesajIcerigi,
                    gonderen: { id: user.id, username: user.username },
                    zaman: new Date()
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

        // === Yardımcı Fonksiyon: Mesaj Balonu Çizme ===
        function mesajBalonuCiz(mesaj) {
            const mesajDiv = document.createElement('div');
            if (!mesaj.gonderen || !mesaj.gonderen.id) {
                console.error("Hatalı mesaj yapısı:", mesaj);
                return;
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