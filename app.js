/* ============================================
   TATI PORTELA FITNESS APP - JavaScript
   ============================================ */

const API_BASE = window.location.origin + '/api';

const App = {
    currentUser: null,
    currentPage: 'dashboard',
    workoutTimer: null,
    workoutSeconds: 0,
    workoutPaused: false,
    activeWorkoutData: null,
    selectedMood: null,
    selectedSleepRating: 0,
    deferredPrompt: null,
    waterCount: 0,
    serverOnline: false,

    // ==========================================
    // INITIALIZATION
    // ==========================================
    init() {
        this.setupSplash();
        this.setupPWA();
        this.setupSliders();
        this.setupStars();
        this.setupWaterTracker();
        this.checkServerStatus().then(() => this.checkAuth());
    },

    setupSplash() {
        setTimeout(() => {
            const splash = document.getElementById('splashScreen');
            splash.classList.add('fade-out');
            setTimeout(() => splash.style.display = 'none', 500);
        }, 1500);
    },

    setupPWA() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('SW registrado:', reg.scope))
                .catch(err => console.log('SW erro:', err));
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            const banner = document.getElementById('installBanner');
            const btn = document.getElementById('btnInstall');
            if (banner) banner.style.display = 'block';
            if (btn) btn.style.display = 'inline-flex';
        });

        window.addEventListener('appinstalled', () => {
            this.deferredPrompt = null;
            document.getElementById('installBanner').style.display = 'none';
            this.toast('App instalado com sucesso!', 'success');
        });
    },

    installApp() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            this.deferredPrompt.userChoice.then(choice => {
                if (choice.outcome === 'accepted') {
                    this.toast('Instalando...', 'info');
                }
                this.deferredPrompt = null;
            });
        } else {
            this.toast('Abra no Chrome Android e use "Adicionar à tela inicial"', 'info');
        }
    },

    dismissInstall() {
        document.getElementById('installBanner').style.display = 'none';
    },

    // ==========================================
    // SERVER API
    // ==========================================
    async checkServerStatus() {
        try {
            const res = await fetch(API_BASE + '/stats', { method: 'GET', signal: AbortSignal.timeout(3000) });
            this.serverOnline = res.ok;
        } catch {
            this.serverOnline = false;
        }
    },

    async serverRequest(endpoint, method, body) {
        if (!this.serverOnline) return null;
        try {
            const opts = { method, headers: { 'Content-Type': 'application/json' } };
            if (body) opts.body = JSON.stringify(body);
            const res = await fetch(API_BASE + endpoint, opts);
            if (res.ok) return await res.json();
        } catch { /* offline fallback */ }
        return null;
    },

    async syncUserToServer(email, userData) {
        await this.serverRequest('/users/' + encodeURIComponent(email), 'PUT', userData);
    },

    async syncAllUsersToServer() {
        const users = this.db.get('users') || {};
        await this.serverRequest('/users/bulk', 'PUT', users);
    },

    async loadUsersFromServer() {
        const serverUsers = await this.serverRequest('/users', 'GET');
        if (serverUsers && typeof serverUsers === 'object') {
            const localUsers = this.db.get('users') || {};
            // Merge: server wins for existing, keep local-only users
            const merged = { ...localUsers, ...serverUsers };
            this.db.set('users', merged);
            return merged;
        }
        return null;
    },

    // ==========================================
    // DATABASE (localStorage)
    // ==========================================
    db: {
        get(key) {
            try {
                const data = localStorage.getItem('tatifit_' + key);
                return data ? JSON.parse(data) : null;
            } catch { return null; }
        },
        set(key, value) {
            localStorage.setItem('tatifit_' + key, JSON.stringify(value));
        },
        remove(key) {
            localStorage.removeItem('tatifit_' + key);
        }
    },

    // ==========================================
    // AUTHENTICATION
    // ==========================================
    checkAuth() {
        const session = this.db.get('session');
        if (session) {
            // Try loading from server first, then fall back to local
            if (this.serverOnline) {
                this.loadUsersFromServer().then(() => {
                    const users = this.db.get('users') || {};
                    if (users[session.email]) {
                        this.currentUser = users[session.email];
                        this.showApp();
                    } else {
                        setTimeout(() => { this.showAuth(); this.initBiometricButton(); }, 1600);
                    }
                });
            } else {
                const users = this.db.get('users') || {};
                if (users[session.email]) {
                    this.currentUser = users[session.email];
                    this.showApp();
                    return;
                }
                setTimeout(() => { this.showAuth(); this.initBiometricButton(); }, 1600);
            }
        } else {
            setTimeout(() => { this.showAuth(); this.initBiometricButton(); }, 1600);
        }
    },

    showAuth() {
        document.getElementById('authScreen').style.display = 'flex';
    },

    togglePassword(inputId, btn) {
        const input = document.getElementById(inputId);
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
            btn.setAttribute('aria-label', 'Ocultar senha');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
            btn.setAttribute('aria-label', 'Mostrar senha');
        }
    },

    showLogin() {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('recoveryForm').style.display = 'none';
    },

    showRegister() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
        document.getElementById('recoveryForm').style.display = 'none';
    },

    showRecovery() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('recoveryForm').style.display = 'block';
        document.getElementById('recoveryStep1').style.display = 'block';
        document.getElementById('recoveryStep2').style.display = 'none';
        document.getElementById('recoveryStep3').style.display = 'none';
        document.getElementById('recoveryEmail').value = '';
        this._recoveryEmail = null;
    },

    verifyRecoveryEmail() {
        const email = document.getElementById('recoveryEmail').value.trim();
        if (!email) {
            this.toast('Digite seu email cadastrado', 'error');
            return;
        }
        const users = this.db.get('users') || {};
        const user = users[email];
        if (!user) {
            this.toast('Email não encontrado', 'error');
            return;
        }
        if (!user.securityQuestion || !user.securityAnswer) {
            this.toast('Esta conta não possui pergunta de segurança. Entre em contato com a Tati Portela.', 'error');
            return;
        }
        this._recoveryEmail = email;
        const questionLabels = {
            pet: 'Qual o nome do seu primeiro pet?',
            cidade: 'Em qual cidade você nasceu?',
            mae: 'Qual o nome da sua mãe?',
            escola: 'Qual o nome da sua primeira escola?',
            melhor_amigo: 'Qual o nome do seu melhor amigo de infância?',
            esporte: 'Qual seu esporte favorito?'
        };
        document.getElementById('recoveryUserName').textContent = user.nome.split(' ')[0];
        document.getElementById('recoveryQuestion').textContent = questionLabels[user.securityQuestion] || user.securityQuestion;
        document.getElementById('recoveryStep1').style.display = 'none';
        document.getElementById('recoveryStep2').style.display = 'block';
        document.getElementById('recoveryAnswer').value = '';
        this.toast('Email verificado! Responda a pergunta de segurança.', 'info');
    },

    verifyRecoveryAnswer() {
        const answer = document.getElementById('recoveryAnswer').value.trim().toLowerCase();
        if (!answer) {
            this.toast('Digite sua resposta', 'error');
            return;
        }
        const users = this.db.get('users') || {};
        const user = users[this._recoveryEmail];
        if (!user || user.securityAnswer.toLowerCase() !== answer) {
            this.toast('Resposta incorreta', 'error');
            return;
        }
        document.getElementById('recoveryStep2').style.display = 'none';
        document.getElementById('recoveryStep3').style.display = 'block';
        document.getElementById('recoveryNewPassword').value = '';
        document.getElementById('recoveryConfirmPassword').value = '';
        this.toast('Resposta correta! Crie sua nova senha.', 'success');
    },

    resetPassword() {
        const newPw = document.getElementById('recoveryNewPassword').value;
        const confirmPw = document.getElementById('recoveryConfirmPassword').value;
        if (!newPw || newPw.length < 6) {
            this.toast('A senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }
        if (newPw !== confirmPw) {
            this.toast('As senhas não coincidem', 'error');
            return;
        }
        const users = this.db.get('users') || {};
        const user = users[this._recoveryEmail];
        if (!user) {
            this.toast('Erro ao redefinir senha', 'error');
            return;
        }
        user.password = this.hashPassword(newPw);
        users[this._recoveryEmail] = user;
        this.db.set('users', users);
        this._recoveryEmail = null;
        this.toast('Senha redefinida com sucesso! Faça login.', 'success');
        this.showLogin();
    },

    login() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.toast('Preencha todos os campos', 'error');
            return;
        }

        const hashedPw = this.hashPassword(password);

        // Try server login first
        if (this.serverOnline) {
            this.serverRequest('/login', 'POST', { email, password: hashedPw })
                .then(result => {
                    if (result && result.success) {
                        // Update local cache with server data
                        const users = this.db.get('users') || {};
                        users[email] = result.user;
                        this.db.set('users', users);
                        this.currentUser = result.user;
                        this.db.set('session', { email });
                        document.getElementById('authScreen').style.display = 'none';
                        this.showApp();
                        this.toast('Bem-vinda(o) de volta, ' + result.user.nome.split(' ')[0] + '!', 'success');
                        this.promptBiometricRegistration();
                    } else {
                        // Fallback to local
                        this._loginLocal(email, hashedPw);
                    }
                });
        } else {
            this._loginLocal(email, hashedPw);
        }
    },

    _loginLocal(email, hashedPw) {
        const users = this.db.get('users') || {};
        const user = users[email];

        if (!user || user.password !== hashedPw) {
            this.toast('Email ou senha incorretos', 'error');
            return;
        }

        this.currentUser = user;
        this.db.set('session', { email: user.email });
        document.getElementById('authScreen').style.display = 'none';
        this.showApp();
        this.toast('Bem-vinda(o) de volta, ' + user.nome.split(' ')[0] + '!', 'success');
        this.promptBiometricRegistration();
    },

    register() {
        const nome = document.getElementById('regNome').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const telefone = document.getElementById('regTelefone').value.trim();
        const nascimento = document.getElementById('regNascimento').value;
        const sexo = document.getElementById('regSexo').value;
        const peso = parseFloat(document.getElementById('regPeso').value);
        const altura = parseInt(document.getElementById('regAltura').value);
        const objetivo = document.getElementById('regObjetivo').value;
        const restricoes = document.getElementById('regRestricoes').value.trim();
        const securityQuestion = document.getElementById('regSecurityQuestion').value;
        const securityAnswer = document.getElementById('regSecurityAnswer').value.trim();

        if (!nome || !email || !password) {
            this.toast('Nome, email e senha são obrigatórios', 'error');
            return;
        }
        if (password.length < 6) {
            this.toast('Senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }
        if (!securityQuestion || !securityAnswer) {
            this.toast('Preencha a pergunta e resposta de segurança para recuperação de senha', 'error');
            return;
        }

        const users = this.db.get('users') || {};
        if (users[email]) {
            this.toast('Este email já está cadastrado', 'error');
            return;
        }

        const user = {
            nome, email, telefone, nascimento, sexo, objetivo, restricoes,
            peso: peso || null,
            altura: altura || null,
            metaPeso: null,
            password: this.hashPassword(password),
            securityQuestion,
            securityAnswer,
            createdAt: new Date().toISOString(),
            metrics: {},
            workouts: [],
            workoutHistory: [],
            settings: {
                metaPassos: 10000,
                metaAgua: 8,
                metaCalorias: 2000
            }
        };

        // Save initial metrics
        if (peso) {
            this.addMetricEntry(user, 'peso', peso);
        }
        if (altura) {
            this.addMetricEntry(user, 'altura', altura);
        }

        users[email] = user;
        this.db.set('users', users);
        this.currentUser = user;
        this.db.set('session', { email });

        // Sync to server
        this.syncUserToServer(email, user);

        // Add default workouts
        this.addDefaultWorkouts();

        document.getElementById('authScreen').style.display = 'none';
        this.showApp();
        this.toast('Conta criada com sucesso! Bem-vinda(o)!', 'success');
    },

    hashPassword(pw) {
        let hash = 0;
        for (let i = 0; i < pw.length; i++) {
            const char = pw.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return 'h' + Math.abs(hash).toString(36);
    },

    // ==========================================
    // BIOMETRIC AUTHENTICATION (WebAuthn)
    // ==========================================
    async isBiometricAvailable() {
        if (!window.PublicKeyCredential) return false;
        try {
            return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        } catch {
            return false;
        }
    },

    getBiometricCredential(email) {
        const creds = this.db.get('biometric_credentials') || {};
        return creds[email] || null;
    },

    saveBiometricCredential(email, credentialId) {
        const creds = this.db.get('biometric_credentials') || {};
        creds[email] = credentialId;
        this.db.set('biometric_credentials', creds);
    },

    removeBiometricCredential(email) {
        const creds = this.db.get('biometric_credentials') || {};
        delete creds[email];
        this.db.set('biometric_credentials', creds);
    },

    _generateChallenge() {
        const arr = new Uint8Array(32);
        crypto.getRandomValues(arr);
        return arr;
    },

    _base64ToBuffer(base64) {
        const str = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
        const buf = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) buf[i] = str.charCodeAt(i);
        return buf.buffer;
    },

    _bufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let str = '';
        for (const b of bytes) str += String.fromCharCode(b);
        return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    },

    async registerBiometric() {
        if (!this.currentUser) return;
        const available = await this.isBiometricAvailable();
        if (!available) {
            this.toast('Biometria não disponível neste dispositivo', 'error');
            return;
        }

        try {
            const email = this.currentUser.email;
            const challenge = this._generateChallenge();
            const userId = new TextEncoder().encode(email);

            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge,
                    rp: { name: 'Tati Portela Fitness', id: location.hostname },
                    user: {
                        id: userId,
                        name: email,
                        displayName: this.currentUser.nome
                    },
                    pubKeyCredParams: [
                        { alg: -7, type: 'public-key' },
                        { alg: -257, type: 'public-key' }
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: 'platform',
                        userVerification: 'required'
                    },
                    timeout: 60000
                }
            });

            const credId = this._bufferToBase64(credential.rawId);
            this.saveBiometricCredential(email, credId);
            this.toast('Biometria ativada com sucesso!', 'success');
        } catch (err) {
            if (err.name !== 'NotAllowedError') {
                this.toast('Erro ao registrar biometria', 'error');
            }
        }
    },

    async loginBiometric() {
        const available = await this.isBiometricAvailable();
        if (!available) {
            this.toast('Biometria não disponível neste dispositivo', 'error');
            return;
        }

        // Find any registered biometric credential
        const creds = this.db.get('biometric_credentials') || {};
        const emails = Object.keys(creds);
        if (emails.length === 0) {
            this.toast('Nenhuma biometria cadastrada. Faça login com email e senha primeiro.', 'info');
            return;
        }

        try {
            const allowCredentials = emails.map(email => ({
                id: this._base64ToBuffer(creds[email]),
                type: 'public-key',
                transports: ['internal']
            }));

            const challenge = this._generateChallenge();
            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge,
                    rpId: location.hostname,
                    allowCredentials,
                    userVerification: 'required',
                    timeout: 60000
                }
            });

            // Match the returned credential to an email
            const usedCredId = this._bufferToBase64(assertion.rawId);
            const matchedEmail = emails.find(e => creds[e] === usedCredId);

            if (!matchedEmail) {
                this.toast('Credencial biométrica não reconhecida', 'error');
                return;
            }

            const users = this.db.get('users') || {};
            const user = users[matchedEmail];
            if (!user) {
                this.toast('Usuário não encontrado', 'error');
                this.removeBiometricCredential(matchedEmail);
                return;
            }

            this.currentUser = user;
            this.db.set('session', { email: matchedEmail });
            document.getElementById('authScreen').style.display = 'none';
            this.showApp();
            this.toast('Bem-vinda(o), ' + user.nome.split(' ')[0] + '!', 'success');
        } catch (err) {
            if (err.name !== 'NotAllowedError') {
                this.toast('Erro na autenticação biométrica', 'error');
            }
        }
    },

    async promptBiometricRegistration() {
        if (!this.currentUser) return;
        const available = await this.isBiometricAvailable();
        if (!available) return;

        const existingCred = this.getBiometricCredential(this.currentUser.email);
        if (existingCred) return; // already registered

        // Small delay so the user sees the app first
        setTimeout(() => {
            if (confirm('Deseja ativar o login por biometria (impressão digital / reconhecimento facial)?')) {
                this.registerBiometric();
            }
        }, 1500);
    },

    async initBiometricButton() {
        const btn = document.getElementById('btnBiometricLogin');
        if (!btn) return;
        const available = await this.isBiometricAvailable();
        const creds = this.db.get('biometric_credentials') || {};
        if (available && Object.keys(creds).length > 0) {
            btn.style.display = 'flex';
        } else {
            btn.style.display = 'none';
        }
    },

    logout() {
        if (confirm('Deseja realmente sair?')) {
            this.db.remove('session');
            this.currentUser = null;
            location.reload();
        }
    },

    // ==========================================
    // APP MAIN
    // ==========================================
    showApp() {
        document.getElementById('appMain').style.display = 'block';
        this.updateHeader();
        this.updateDashboard();
        this.loadWorkouts();
        this.updateMetrics();
        this.loadHistory();
        this.loadProfile();
        this.loadStudentsSummary();
    },

    updateHeader() {
        const user = this.currentUser;
        if (!user) return;

        const firstName = user.nome.split(' ')[0];
        const initials = user.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const hour = new Date().getHours();
        let greeting = 'Bom dia';
        if (hour >= 12 && hour < 18) greeting = 'Boa tarde';
        else if (hour >= 18) greeting = 'Boa noite';

        document.getElementById('userName').textContent = firstName;
        document.getElementById('greeting').textContent = greeting + '!';
        document.getElementById('userAvatar').textContent = initials;
    },

    // ==========================================
    // NAVIGATION
    // ==========================================
    navigate(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

        const pageMap = {
            'dashboard': 'pageDashboard',
            'treinos': 'pageTreinos',
            'metricas': 'pageMetricas',
            'historico': 'pageHistorico',
            'perfil': 'pagePerfil'
        };

        const targetPage = document.getElementById(pageMap[page]);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = page;
        }

        const navBtn = document.querySelector(`.nav-btn[data-page="${page}"]`);
        if (navBtn) navBtn.classList.add('active');

        // Refresh page data
        if (page === 'historico') this.loadHistory();
        if (page === 'metricas') this.updateMetrics();
        if (page === 'dashboard') this.updateDashboard();

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // ==========================================
    // DASHBOARD
    // ==========================================
    updateDashboard() {
        const user = this.currentUser;
        if (!user) return;

        const today = new Date().toISOString().split('T')[0];

        // Daily Metrics
        const todayCalories = this.getTodayMetric('caloriasGastas');
        const todaySteps = this.getTodayMetric('passos');
        const todayFC = this.getLatestMetric('fcRepouso');

        document.getElementById('dashCalorias').textContent = todayCalories || '0';
        document.getElementById('dashPassos').textContent = todaySteps || '0';
        document.getElementById('dashAgua').textContent = this.waterCount;
        document.getElementById('dashFC').textContent = todayFC || '--';

        // Health Overview
        const peso = this.getLatestMetric('peso');
        const altura = this.getLatestMetric('altura') || user.altura;
        if (peso && altura) {
            const imc = (peso / ((altura / 100) ** 2)).toFixed(1);
            document.getElementById('dashIMC').textContent = imc;
            const imcStatus = this.getIMCClassification(parseFloat(imc));
            const el = document.getElementById('dashIMCStatus');
            el.textContent = imcStatus.text;
            el.className = 'health-status ' + imcStatus.class;
        }

        const gordura = this.getLatestMetric('gordura');
        if (gordura) {
            document.getElementById('dashGordura').textContent = gordura + '%';
            const gClass = this.getGorduraClassification(gordura, user.sexo);
            const el = document.getElementById('dashGorduraStatus');
            el.textContent = gClass.text;
            el.className = 'health-status ' + gClass.class;
        }

        const pa = this.getLatestMetricObj('pressaoArterial');
        if (pa) {
            document.getElementById('dashPA').textContent = pa.sistolica + '/' + pa.diastolica;
            const paClass = this.getPAClassification(pa.sistolica, pa.diastolica);
            const el = document.getElementById('dashPAStatus');
            el.textContent = paClass.text;
            el.className = 'health-status ' + paClass.class;
        }

        const sono = this.getLatestMetric('sonoHoras');
        if (sono) {
            document.getElementById('dashSono').textContent = sono + 'h';
            const sonoClass = sono >= 7 ? { text: 'Bom', class: '' } :
                              sono >= 6 ? { text: 'Regular', class: 'warning' } :
                              { text: 'Insuficiente', class: 'danger' };
            const el = document.getElementById('dashSonoStatus');
            el.textContent = sonoClass.text;
            el.className = 'health-status ' + sonoClass.class;
        }

        // Today's Workout
        this.updateTodayWorkout();

        // Weight Chart
        this.drawWeightChart();
    },

    updateTodayWorkout() {
        const user = this.currentUser;
        const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
        const today = days[new Date().getDay()];
        const todayWorkouts = (user.workouts || []).filter(w => w.days && w.days.includes(today));

        const container = document.getElementById('todayWorkout');
        if (todayWorkouts.length === 0) {
            container.innerHTML = `
                <div class="empty-state small">
                    <i class="fas fa-calendar-check"></i>
                    <p>Nenhum treino agendado para hoje</p>
                    <button class="btn-small" onclick="App.navigate('treinos')">Escolher Treino</button>
                </div>`;
            return;
        }

        container.innerHTML = todayWorkouts.map(w => `
            <div class="workout-card" onclick="App.startWorkout('${w.id}')">
                <div class="workout-icon ${w.category}">
                    <i class="fas ${this.getCategoryIcon(w.category)}"></i>
                </div>
                <div class="workout-info">
                    <div class="workout-name">${this.escapeHtml(w.name)}</div>
                    <div class="workout-meta">
                        <span><i class="fas fa-clock"></i> ${w.duration} min</span>
                        <span><i class="fas fa-list"></i> ${w.exercises.length} exercícios</span>
                    </div>
                </div>
                <button class="workout-start"><i class="fas fa-play"></i></button>
            </div>
        `).join('');
    },

    // ==========================================
    // METRICS
    // ==========================================
    addMetricEntry(user, key, value, extra) {
        if (!user.metrics) user.metrics = {};
        if (!user.metrics[key]) user.metrics[key] = [];

        const entry = {
            value,
            date: new Date().toISOString(),
            ...extra
        };

        user.metrics[key].push(entry);
    },

    getTodayMetric(key) {
        const user = this.currentUser;
        if (!user || !user.metrics || !user.metrics[key]) return null;
        const today = new Date().toISOString().split('T')[0];
        const entries = user.metrics[key].filter(e => e.date.startsWith(today));
        return entries.length ? entries[entries.length - 1].value : null;
    },

    getLatestMetric(key) {
        const user = this.currentUser;
        if (!user || !user.metrics || !user.metrics[key] || !user.metrics[key].length) return null;
        return user.metrics[key][user.metrics[key].length - 1].value;
    },

    getLatestMetricObj(key) {
        const user = this.currentUser;
        if (!user || !user.metrics || !user.metrics[key] || !user.metrics[key].length) return null;
        return user.metrics[key][user.metrics[key].length - 1];
    },

    saveMetric(type) {
        const user = this.currentUser;
        if (!user) return;

        let value, extra;
        switch (type) {
            case 'peso':
                value = parseFloat(document.getElementById('inputPeso').value);
                if (!value) { this.toast('Insira o peso', 'error'); return; }
                user.peso = value;
                break;
            case 'altura':
                value = parseInt(document.getElementById('inputAltura').value);
                if (!value) { this.toast('Insira a altura', 'error'); return; }
                user.altura = value;
                break;
            case 'gordura':
                value = parseFloat(document.getElementById('inputGordura').value);
                if (value === null || isNaN(value)) { this.toast('Insira o percentual', 'error'); return; }
                break;
            case 'massaMuscular':
                value = parseFloat(document.getElementById('inputMassaMuscular').value);
                if (!value) { this.toast('Insira a massa muscular', 'error'); return; }
                break;
            case 'massaOssea':
                value = parseFloat(document.getElementById('inputMassaOssea').value);
                if (!value) { this.toast('Insira a massa óssea', 'error'); return; }
                break;
            case 'aguaCorporal':
                value = parseFloat(document.getElementById('inputAguaCorporal').value);
                if (!value) { this.toast('Insira o percentual', 'error'); return; }
                break;
            case 'rcq':
                const cintura = parseFloat(document.getElementById('inputCintura').value);
                const quadril = parseFloat(document.getElementById('inputQuadril').value);
                if (!cintura || !quadril) { this.toast('Insira cintura e quadril', 'error'); return; }
                value = (cintura / quadril).toFixed(2);
                extra = { cintura, quadril };
                break;
            case 'fcRepouso':
                value = parseInt(document.getElementById('inputFCRepouso').value);
                if (!value) { this.toast('Insira a FC', 'error'); return; }
                break;
            case 'fcMaxima':
                value = parseInt(document.getElementById('inputFCMaxima').value);
                if (!value) { this.toast('Insira a FC máxima', 'error'); return; }
                break;
            case 'pressaoArterial':
                const sistolica = parseInt(document.getElementById('inputPASistolica').value);
                const diastolica = parseInt(document.getElementById('inputPADiastolica').value);
                if (!sistolica || !diastolica) { this.toast('Insira sistólica e diastólica', 'error'); return; }
                value = sistolica + '/' + diastolica;
                extra = { sistolica, diastolica };
                break;
            case 'vo2max':
                value = parseFloat(document.getElementById('inputVO2Max').value);
                if (!value) { this.toast('Insira o VO2 Max', 'error'); return; }
                break;
            case 'spo2':
                value = parseInt(document.getElementById('inputSpO2').value);
                if (!value) { this.toast('Insira o SpO2', 'error'); return; }
                break;
            case 'glicemia':
                value = parseInt(document.getElementById('inputGlicemia').value);
                if (!value) { this.toast('Insira a glicemia', 'error'); return; }
                break;
            case 'colesterolTotal':
                value = parseInt(document.getElementById('inputColesterolTotal').value);
                if (!value) { this.toast('Insira o valor', 'error'); return; }
                break;
            case 'hdl':
                value = parseInt(document.getElementById('inputHDL').value);
                if (!value) return;
                break;
            case 'ldl':
                value = parseInt(document.getElementById('inputLDL').value);
                if (!value) return;
                break;
            case 'triglicerideos':
                value = parseInt(document.getElementById('inputTriglicerideos').value);
                if (!value) return;
                break;
            case 'hba1c':
                value = parseFloat(document.getElementById('inputHbA1c').value);
                if (!value) return;
                break;
            case 'hemoglobina':
                value = parseFloat(document.getElementById('inputHemoglobina').value);
                if (!value) return;
                break;
            case 'vitD':
                value = parseFloat(document.getElementById('inputVitD').value);
                if (!value) return;
                break;
            case 'testosterona':
                value = parseFloat(document.getElementById('inputTestosterona').value);
                if (!value) return;
                break;
            case 'tsh':
                value = parseFloat(document.getElementById('inputTSH').value);
                if (!value) return;
                break;
            case 'creatinina':
                value = parseFloat(document.getElementById('inputCreatinina').value);
                if (!value) return;
                break;
            case 'acidoUrico':
                value = parseFloat(document.getElementById('inputAcidoUrico').value);
                if (!value) return;
                break;
            case 'ferro':
                value = parseInt(document.getElementById('inputFerro').value);
                if (!value) return;
                break;
            case 'sonoHoras':
                value = parseFloat(document.getElementById('inputSonoHoras').value);
                if (!value) { this.toast('Insira as horas', 'error'); return; }
                break;
            case 'qualidadeSono':
                value = this.selectedSleepRating;
                if (!value) { this.toast('Selecione a qualidade', 'error'); return; }
                break;
            case 'estresse':
                value = parseInt(document.getElementById('inputEstresse').value);
                break;
            case 'energia':
                value = parseInt(document.getElementById('inputEnergia').value);
                break;
            case 'dor':
                value = parseInt(document.getElementById('inputDor').value);
                break;
            case 'caloriasConsumidas':
                value = parseInt(document.getElementById('inputCaloriasIn').value);
                if (!value) return;
                break;
            case 'caloriasGastas':
                value = parseInt(document.getElementById('inputCaloriasOut').value);
                if (!value) return;
                break;
            case 'passos':
                value = parseInt(document.getElementById('inputPassos').value);
                if (!value) return;
                break;
            case 'temperatura':
                value = parseFloat(document.getElementById('inputTemperatura').value);
                if (!value) return;
                break;
            case 'humor':
                value = this.selectedMood || 'neutro';
                extra = { obs: document.getElementById('inputObsDia').value };
                break;
            // Body Measurements
            case 'peitoral': case 'bracoD': case 'bracoE':
            case 'antebracoD': case 'antebracoE':
            case 'medCintura': case 'abdomen': case 'medQuadril':
            case 'coxaD': case 'coxaE':
            case 'panturrilhaD': case 'panturrilhaE':
            case 'pescoco': case 'ombros':
                value = parseFloat(document.getElementById('input' + type.charAt(0).toUpperCase() + type.slice(1)).value);
                if (!value) { this.toast('Insira a medida', 'error'); return; }
                break;
            // Performance
            case 'rm_supino': case 'rm_agachamento': case 'rm_terra':
                const rmId = 'inputRM_' + type.split('_')[1];
                value = parseFloat(document.getElementById(rmId).value);
                if (!value) { this.toast('Insira a carga', 'error'); return; }
                break;
            case 'cooper':
                value = parseInt(document.getElementById('inputCooper').value);
                if (!value) return;
                break;
            case 'prancha':
                value = parseInt(document.getElementById('inputPrancha').value);
                if (!value) return;
                break;
            case 'flexibilidade':
                value = parseFloat(document.getElementById('inputFlexibilidade').value);
                if (value === null || isNaN(value)) return;
                break;
            case 'equilibrio':
                value = parseInt(document.getElementById('inputEquilibrio').value);
                if (!value) return;
                break;
            case 'preensao':
                value = parseFloat(document.getElementById('inputPreensao').value);
                if (!value) return;
                break;
            default:
                return;
        }

        this.addMetricEntry(user, type, value, extra);
        this.saveUser();
        this.updateMetrics();
        this.updateDashboard();
        this.toast('Métrica salva!', 'success');
    },

    updateMetrics() {
        const user = this.currentUser;
        if (!user) return;

        // IMC
        const peso = this.getLatestMetric('peso') || user.peso;
        const altura = this.getLatestMetric('altura') || user.altura;
        if (peso && altura) {
            const imc = peso / ((altura / 100) ** 2);
            document.getElementById('metricIMC').textContent = imc.toFixed(1);
            const imcClass = this.getIMCClassification(imc);
            const classEl = document.getElementById('metricIMCClass');
            classEl.textContent = imcClass.text;
            classEl.className = 'metric-classification ' + imcClass.class;

            // IMC Indicator position (16-40 mapped to 0-100%)
            const pos = Math.max(0, Math.min(100, ((imc - 16) / 24) * 100));
            document.getElementById('imcIndicator').style.left = pos + '%';
        }

        // TMB (Harris-Benedict)
        if (peso && altura && user.nascimento && user.sexo) {
            const age = Math.floor((Date.now() - new Date(user.nascimento).getTime()) / 31557600000);
            let tmb;
            if (user.sexo === 'M') {
                tmb = 88.362 + (13.397 * peso) + (4.799 * altura) - (5.677 * age);
            } else {
                tmb = 447.593 + (9.247 * peso) + (3.098 * altura) - (4.330 * age);
            }
            document.getElementById('metricTMB').textContent = Math.round(tmb) + ' kcal/dia';
        }

        // RCQ
        const rcq = this.getLatestMetric('rcq');
        if (rcq) {
            document.getElementById('metricRCQ').textContent = rcq;
        }

        // FC Zones
        const fcMax = this.getLatestMetric('fcMaxima');
        const calcFCMax = user.nascimento ? 220 - Math.floor((Date.now() - new Date(user.nascimento).getTime()) / 31557600000) : null;
        const useFCMax = fcMax || calcFCMax;
        if (useFCMax) {
            document.getElementById('metricFCMaxCalc').textContent =
                'FC Máx estimada: ' + (calcFCMax || '--') + ' bpm' + (fcMax ? ' | Medida: ' + fcMax + ' bpm' : '');
            document.getElementById('zone1').textContent = Math.round(useFCMax * 0.5) + '-' + Math.round(useFCMax * 0.6) + ' bpm';
            document.getElementById('zone2').textContent = Math.round(useFCMax * 0.6) + '-' + Math.round(useFCMax * 0.7) + ' bpm';
            document.getElementById('zone3').textContent = Math.round(useFCMax * 0.7) + '-' + Math.round(useFCMax * 0.8) + ' bpm';
            document.getElementById('zone4').textContent = Math.round(useFCMax * 0.8) + '-' + Math.round(useFCMax * 0.9) + ' bpm';
            document.getElementById('zone5').textContent = Math.round(useFCMax * 0.9) + '-' + useFCMax + ' bpm';
        }

        // Blood Pressure
        const pa = this.getLatestMetricObj('pressaoArterial');
        if (pa) {
            const paClass = this.getPAClassification(pa.sistolica, pa.diastolica);
            const el = document.getElementById('metricPAClass');
            el.textContent = paClass.text;
            el.className = 'metric-classification ' + paClass.class;
        }

        // VO2 Max
        const vo2 = this.getLatestMetric('vo2max');
        if (vo2) {
            const vo2Class = this.getVO2Classification(vo2, user.sexo);
            const el = document.getElementById('metricVO2Class');
            el.textContent = vo2Class.text;
            el.className = 'metric-classification ' + vo2Class.class;
        }

        // SpO2
        const spo2 = this.getLatestMetric('spo2');
        if (spo2) {
            const spo2Class = spo2 >= 95 ? { text: 'Normal', class: 'normal' } :
                              spo2 >= 90 ? { text: 'Baixo', class: 'warning' } :
                              { text: 'Crítico', class: 'danger' };
            const el = document.getElementById('metricSpO2Class');
            el.textContent = spo2Class.text;
            el.className = 'metric-classification ' + spo2Class.class;
        }

        // Glucose
        const glicemia = this.getLatestMetric('glicemia');
        if (glicemia) {
            const gClass = glicemia < 100 ? { text: 'Normal', class: 'normal' } :
                           glicemia < 126 ? { text: 'Pré-diabetes', class: 'warning' } :
                           { text: 'Alto', class: 'danger' };
            const el = document.getElementById('metricGlicemiaClass');
            el.textContent = gClass.text;
            el.className = 'metric-classification ' + gClass.class;
        }

        // Cholesterol
        const colTotal = this.getLatestMetric('colesterolTotal');
        if (colTotal) {
            const cClass = colTotal < 200 ? { text: 'Desejável', class: 'normal' } :
                           colTotal < 240 ? { text: 'Limítrofe', class: 'warning' } :
                           { text: 'Alto', class: 'danger' };
            const el = document.getElementById('metricColTotalClass');
            el.textContent = cClass.text;
            el.className = 'metric-classification ' + cClass.class;
        }

        // Triglycerides
        const trigl = this.getLatestMetric('triglicerideos');
        if (trigl) {
            const tClass = trigl < 150 ? { text: 'Normal', class: 'normal' } :
                           trigl < 200 ? { text: 'Limítrofe', class: 'warning' } :
                           { text: 'Alto', class: 'danger' };
            const el = document.getElementById('metricTriglClass');
            el.textContent = tClass.text;
            el.className = 'metric-classification ' + tClass.class;
        }

        // HbA1c
        const hba1c = this.getLatestMetric('hba1c');
        if (hba1c) {
            const hClass = hba1c < 5.7 ? { text: 'Normal', class: 'normal' } :
                           hba1c < 6.5 ? { text: 'Pré-diabetes', class: 'warning' } :
                           { text: 'Diabetes', class: 'danger' };
            const el = document.getElementById('metricHbA1cClass');
            el.textContent = hClass.text;
            el.className = 'metric-classification ' + hClass.class;
        }

        // Cooper Test
        const cooper = this.getLatestMetric('cooper');
        if (cooper) {
            const cClass = cooper >= 2400 ? { text: 'Excelente', class: 'normal' } :
                           cooper >= 2000 ? { text: 'Bom', class: 'normal' } :
                           cooper >= 1600 ? { text: 'Regular', class: 'warning' } :
                           { text: 'Fraco', class: 'danger' };
            const el = document.getElementById('metricCooperClass');
            el.textContent = cClass.text;
            el.className = 'metric-classification ' + cClass.class;
        }

        // Flexibility
        const flex = this.getLatestMetric('flexibilidade');
        if (flex !== null && flex !== undefined) {
            const fClass = flex >= 30 ? { text: 'Excelente', class: 'normal' } :
                           flex >= 20 ? { text: 'Bom', class: 'normal' } :
                           flex >= 10 ? { text: 'Regular', class: 'warning' } :
                           { text: 'Abaixo', class: 'danger' };
            const el = document.getElementById('metricFlexClass');
            el.textContent = fClass.text;
            el.className = 'metric-classification ' + fClass.class;
        }

        // Update metric histories
        this.updateMetricHistories();
    },

    updateMetricHistories() {
        const metrics = ['peso', 'gordura', 'massaMuscular', 'fcRepouso', 'sonoHoras', 'passos',
                         'peitoral', 'bracoD', 'bracoE', 'medCintura', 'abdomen', 'medQuadril',
                         'coxaD', 'panturrilhaD', 'rm_supino', 'rm_agachamento', 'rm_terra', 'prancha', 'glicemia'];

        metrics.forEach(key => {
            const el = document.getElementById('hist' + key.charAt(0).toUpperCase() + key.slice(1));
            if (!el) return;
            const entries = (this.currentUser.metrics && this.currentUser.metrics[key]) || [];
            const recent = entries.slice(-3).reverse();
            if (recent.length === 0) {
                el.innerHTML = '';
                return;
            }
            el.innerHTML = recent.map(e => `
                <div class="history-item">
                    <span>${new Date(e.date).toLocaleDateString('pt-BR')}</span>
                    <span>${e.value}</span>
                </div>
            `).join('');
        });

        // PA History separate handling
        const paEl = document.getElementById('histPA');
        if (paEl) {
            const paEntries = (this.currentUser.metrics && this.currentUser.metrics['pressaoArterial']) || [];
            const paRecent = paEntries.slice(-3).reverse();
            paEl.innerHTML = paRecent.map(e => `
                <div class="history-item">
                    <span>${new Date(e.date).toLocaleDateString('pt-BR')}</span>
                    <span>${e.sistolica}/${e.diastolica} mmHg</span>
                </div>
            `).join('');
        }
    },

    showMetricTab(tab) {
        document.querySelectorAll('.metric-content').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.metric-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
        event.target.classList.add('active');
    },

    // Classifications
    getIMCClassification(imc) {
        if (imc < 18.5) return { text: 'Abaixo do peso', class: 'warning' };
        if (imc < 25) return { text: 'Normal', class: 'normal' };
        if (imc < 30) return { text: 'Sobrepeso', class: 'warning' };
        return { text: 'Obesidade', class: 'danger' };
    },

    getGorduraClassification(val, sexo) {
        if (sexo === 'F') {
            if (val < 14) return { text: 'Essencial', class: 'warning' };
            if (val < 21) return { text: 'Atleta', class: 'normal' };
            if (val < 25) return { text: 'Fitness', class: 'normal' };
            if (val < 32) return { text: 'Aceitável', class: 'warning' };
            return { text: 'Excesso', class: 'danger' };
        }
        if (val < 6) return { text: 'Essencial', class: 'warning' };
        if (val < 14) return { text: 'Atleta', class: 'normal' };
        if (val < 18) return { text: 'Fitness', class: 'normal' };
        if (val < 25) return { text: 'Aceitável', class: 'warning' };
        return { text: 'Excesso', class: 'danger' };
    },

    getPAClassification(s, d) {
        if (s < 120 && d < 80) return { text: 'Normal', class: 'normal' };
        if (s < 130 && d < 80) return { text: 'Elevada', class: 'warning' };
        if (s < 140 || d < 90) return { text: 'Hipertensão Estágio 1', class: 'warning' };
        return { text: 'Hipertensão Estágio 2', class: 'danger' };
    },

    getVO2Classification(val, sexo) {
        if (sexo === 'F') {
            if (val >= 41) return { text: 'Excelente', class: 'normal' };
            if (val >= 33) return { text: 'Bom', class: 'normal' };
            if (val >= 24) return { text: 'Regular', class: 'warning' };
            return { text: 'Fraco', class: 'danger' };
        }
        if (val >= 52) return { text: 'Excelente', class: 'normal' };
        if (val >= 42) return { text: 'Bom', class: 'normal' };
        if (val >= 33) return { text: 'Regular', class: 'warning' };
        return { text: 'Fraco', class: 'danger' };
    },

    // ==========================================
    // WORKOUTS
    // ==========================================
    addDefaultWorkouts() {
        const defaults = [
            {
                id: 'w1', name: 'Treino A - Peito e Tríceps', category: 'musculacao',
                duration: 60, days: ['seg', 'qui'],
                exercises: [
                    { name: 'Supino Reto', sets: 4, reps: '10-12', rest: 60, weight: '' },
                    { name: 'Supino Inclinado Halteres', sets: 3, reps: '10-12', rest: 60, weight: '' },
                    { name: 'Crucifixo', sets: 3, reps: '12-15', rest: 45, weight: '' },
                    { name: 'Crossover', sets: 3, reps: '12-15', rest: 45, weight: '' },
                    { name: 'Tríceps Pulley', sets: 4, reps: '10-12', rest: 45, weight: '' },
                    { name: 'Tríceps Francês', sets: 3, reps: '10-12', rest: 45, weight: '' },
                    { name: 'Tríceps Testa', sets: 3, reps: '10-12', rest: 45, weight: '' }
                ]
            },
            {
                id: 'w2', name: 'Treino B - Costas e Bíceps', category: 'musculacao',
                duration: 60, days: ['ter', 'sex'],
                exercises: [
                    { name: 'Puxada Frontal', sets: 4, reps: '10-12', rest: 60, weight: '' },
                    { name: 'Remada Curvada', sets: 4, reps: '10-12', rest: 60, weight: '' },
                    { name: 'Remada Unilateral', sets: 3, reps: '12', rest: 45, weight: '' },
                    { name: 'Pulldown', sets: 3, reps: '12-15', rest: 45, weight: '' },
                    { name: 'Rosca Direta', sets: 4, reps: '10-12', rest: 45, weight: '' },
                    { name: 'Rosca Martelo', sets: 3, reps: '12', rest: 45, weight: '' },
                    { name: 'Rosca Concentrada', sets: 3, reps: '12', rest: 45, weight: '' }
                ]
            },
            {
                id: 'w3', name: 'Treino C - Perna e Glúteos', category: 'musculacao',
                duration: 70, days: ['qua', 'sab'],
                exercises: [
                    { name: 'Agachamento Livre', sets: 4, reps: '10-12', rest: 90, weight: '' },
                    { name: 'Leg Press 45°', sets: 4, reps: '12-15', rest: 60, weight: '' },
                    { name: 'Cadeira Extensora', sets: 3, reps: '12-15', rest: 45, weight: '' },
                    { name: 'Cadeira Flexora', sets: 3, reps: '12-15', rest: 45, weight: '' },
                    { name: 'Stiff', sets: 3, reps: '12', rest: 60, weight: '' },
                    { name: 'Elevação Pélvica', sets: 4, reps: '15', rest: 45, weight: '' },
                    { name: 'Panturrilha em Pé', sets: 4, reps: '15-20', rest: 30, weight: '' }
                ]
            },
            {
                id: 'w4', name: 'Yoga - Vinyasa Flow', category: 'yoga',
                duration: 45, days: [],
                exercises: [
                    { name: 'Saudação ao Sol A', sets: 3, reps: 'ciclos', rest: 0, weight: '' },
                    { name: 'Saudação ao Sol B', sets: 3, reps: 'ciclos', rest: 0, weight: '' },
                    { name: 'Guerreiro I (Virabhadrasana I)', sets: 1, reps: '30s cada lado', rest: 0, weight: '' },
                    { name: 'Guerreiro II (Virabhadrasana II)', sets: 1, reps: '30s cada lado', rest: 0, weight: '' },
                    { name: 'Triângulo (Trikonasana)', sets: 1, reps: '30s cada lado', rest: 0, weight: '' },
                    { name: 'Árvore (Vrksasana)', sets: 1, reps: '30s cada lado', rest: 0, weight: '' },
                    { name: 'Cachorro olhando para baixo', sets: 1, reps: '1 min', rest: 0, weight: '' },
                    { name: 'Ponte (Setu Bandhasana)', sets: 3, reps: '30s', rest: 15, weight: '' },
                    { name: 'Savasana (Relaxamento)', sets: 1, reps: '5 min', rest: 0, weight: '' }
                ]
            },
            {
                id: 'w5', name: 'Pilates - Core e Postura', category: 'pilates',
                duration: 50, days: [],
                exercises: [
                    { name: 'The Hundred', sets: 1, reps: '100 pulsos', rest: 30, weight: '' },
                    { name: 'Roll Up', sets: 8, reps: 'reps', rest: 15, weight: '' },
                    { name: 'Single Leg Circle', sets: 1, reps: '10 cada lado', rest: 15, weight: '' },
                    { name: 'Rolling Like a Ball', sets: 8, reps: 'reps', rest: 15, weight: '' },
                    { name: 'Single Leg Stretch', sets: 1, reps: '10 cada lado', rest: 15, weight: '' },
                    { name: 'Double Leg Stretch', sets: 8, reps: 'reps', rest: 15, weight: '' },
                    { name: 'Spine Stretch Forward', sets: 5, reps: 'reps', rest: 15, weight: '' },
                    { name: 'Saw', sets: 1, reps: '5 cada lado', rest: 15, weight: '' },
                    { name: 'Swan Dive', sets: 5, reps: 'reps', rest: 15, weight: '' },
                    { name: 'Swimming', sets: 1, reps: '30s', rest: 15, weight: '' }
                ]
            },
            {
                id: 'w6', name: 'Funcional - HIIT', category: 'funcional',
                duration: 30, days: [],
                exercises: [
                    { name: 'Burpee', sets: 3, reps: '12', rest: 30, weight: '' },
                    { name: 'Mountain Climber', sets: 3, reps: '20 cada', rest: 30, weight: '' },
                    { name: 'Jump Squat', sets: 3, reps: '15', rest: 30, weight: '' },
                    { name: 'Prancha', sets: 3, reps: '45s', rest: 30, weight: '' },
                    { name: 'Box Jump', sets: 3, reps: '12', rest: 30, weight: '' },
                    { name: 'Kettlebell Swing', sets: 3, reps: '15', rest: 30, weight: '' },
                    { name: 'Abdominal Bicicleta', sets: 3, reps: '20 cada', rest: 30, weight: '' }
                ]
            },
            {
                id: 'w7', name: 'Cardio - Esteira & Bike', category: 'cardio',
                duration: 40, days: [],
                exercises: [
                    { name: 'Aquecimento (caminhada leve)', sets: 1, reps: '5 min', rest: 0, weight: '' },
                    { name: 'Corrida moderada', sets: 1, reps: '15 min', rest: 0, weight: '' },
                    { name: 'Intervalado (1min forte/1min leve)', sets: 6, reps: 'ciclos', rest: 0, weight: '' },
                    { name: 'Bike - Moderado', sets: 1, reps: '10 min', rest: 0, weight: '' },
                    { name: 'Volta à calma', sets: 1, reps: '5 min', rest: 0, weight: '' }
                ]
            },
            {
                id: 'w8', name: 'Alongamento Completo', category: 'alongamento',
                duration: 25, days: [],
                exercises: [
                    { name: 'Pescoço (rotação)', sets: 1, reps: '30s cada lado', rest: 0, weight: '' },
                    { name: 'Ombros (cross body)', sets: 1, reps: '30s cada lado', rest: 0, weight: '' },
                    { name: 'Peitoral (porta)', sets: 1, reps: '30s', rest: 0, weight: '' },
                    { name: 'Tríceps (overhead)', sets: 1, reps: '30s cada lado', rest: 0, weight: '' },
                    { name: 'Lombar (gato-vaca)', sets: 1, reps: '1 min', rest: 0, weight: '' },
                    { name: 'Glúteo (piriforme)', sets: 1, reps: '30s cada lado', rest: 0, weight: '' },
                    { name: 'Quadríceps (em pé)', sets: 1, reps: '30s cada lado', rest: 0, weight: '' },
                    { name: 'Isquiotibiais (sentado)', sets: 1, reps: '30s cada', rest: 0, weight: '' },
                    { name: 'Panturrilha (parede)', sets: 1, reps: '30s cada', rest: 0, weight: '' },
                    { name: 'Respiração profunda', sets: 3, reps: 'ciclos', rest: 0, weight: '' }
                ]
            }
        ];

        this.currentUser.workouts = defaults;
        this.saveUser();
    },

    loadWorkouts() {
        this.renderWorkouts(this.currentUser.workouts || []);
    },

    renderWorkouts(workouts) {
        const container = document.getElementById('workoutList');
        if (!workouts.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-dumbbell"></i>
                    <p>Nenhum treino cadastrado</p>
                    <button class="btn-small" onclick="App.showCreateWorkout()">Criar Treino</button>
                </div>`;
            return;
        }

        container.innerHTML = workouts.map(w => `
            <div class="workout-card">
                <div class="workout-icon ${w.category}" onclick="App.startWorkout('${w.id}')">
                    <i class="fas ${this.getCategoryIcon(w.category)}"></i>
                </div>
                <div class="workout-info" onclick="App.startWorkout('${w.id}')">
                    <div class="workout-name">${this.escapeHtml(w.name)}</div>
                    <div class="workout-meta">
                        <span><i class="fas fa-clock"></i> ${w.duration} min</span>
                        <span><i class="fas fa-list"></i> ${w.exercises.length} exercícios</span>
                        ${w.days && w.days.length ? '<span><i class="fas fa-calendar"></i> ' + w.days.join(', ') + '</span>' : ''}
                    </div>
                </div>
                <button class="workout-start" onclick="App.startWorkout('${w.id}')">
                    <i class="fas fa-play"></i>
                </button>
            </div>
        `).join('');
    },

    filterTreinos(cat) {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.cat-btn[data-cat="${cat}"]`).classList.add('active');

        const workouts = this.currentUser.workouts || [];
        if (cat === 'todos') {
            this.renderWorkouts(workouts);
        } else {
            this.renderWorkouts(workouts.filter(w => w.category === cat));
        }
    },

    getCategoryIcon(cat) {
        const icons = {
            musculacao: 'fa-dumbbell',
            yoga: 'fa-spa',
            pilates: 'fa-child-reaching',
            funcional: 'fa-person-running',
            cardio: 'fa-heart-pulse',
            alongamento: 'fa-person-praying'
        };
        return icons[cat] || 'fa-dumbbell';
    },

    // Create Workout
    showCreateWorkout() {
        document.getElementById('modalCriarTreino').style.display = 'flex';
        document.getElementById('exerciseInputList').innerHTML = '';
        document.getElementById('newWorkoutName').value = '';
        document.getElementById('newWorkoutDuration').value = '60';
        document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
        this.addExerciseInput();
    },

    addExerciseInput() {
        const list = document.getElementById('exerciseInputList');
        const idx = list.children.length;
        const div = document.createElement('div');
        div.className = 'exercise-input-item';
        div.innerHTML = `
            <button class="exercise-remove" onclick="this.parentElement.remove()">&times;</button>
            <input type="text" placeholder="Nome do exercício" class="ex-name">
            <div class="exercise-input-row">
                <input type="number" placeholder="Séries" class="ex-sets" value="3">
                <input type="text" placeholder="Reps" class="ex-reps" value="12">
                <input type="number" placeholder="Descanso(s)" class="ex-rest" value="60">
            </div>
        `;
        list.appendChild(div);
    },

    toggleDay(btn) {
        btn.classList.toggle('active');
    },

    saveWorkout() {
        const name = document.getElementById('newWorkoutName').value.trim();
        const category = document.getElementById('newWorkoutCategory').value;
        const duration = parseInt(document.getElementById('newWorkoutDuration').value) || 60;

        if (!name) {
            this.toast('Dê um nome ao treino', 'error');
            return;
        }

        const days = [];
        document.querySelectorAll('.day-btn.active').forEach(b => days.push(b.dataset.day));

        const exercises = [];
        document.querySelectorAll('.exercise-input-item').forEach(item => {
            const eName = item.querySelector('.ex-name').value.trim();
            if (eName) {
                exercises.push({
                    name: eName,
                    sets: parseInt(item.querySelector('.ex-sets').value) || 3,
                    reps: item.querySelector('.ex-reps').value || '12',
                    rest: parseInt(item.querySelector('.ex-rest').value) || 60,
                    weight: ''
                });
            }
        });

        if (!exercises.length) {
            this.toast('Adicione pelo menos um exercício', 'error');
            return;
        }

        const workout = {
            id: 'w' + Date.now(),
            name, category, duration, days, exercises
        };

        this.currentUser.workouts.push(workout);
        this.saveUser();
        this.loadWorkouts();
        this.closeModal('modalCriarTreino');
        this.toast('Treino criado!', 'success');
    },

    // Active Workout
    startWorkout(workoutId) {
        const workout = this.currentUser.workouts.find(w => w.id === workoutId);
        if (!workout) return;

        this.activeWorkoutData = {
            ...workout,
            startTime: Date.now(),
            completedExercises: [],
            completedSets: {}
        };

        document.getElementById('activeWorkoutName').textContent = workout.name;
        this.renderExercises(workout);

        // Navigate to active workout page
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('pageTreinoAtivo').classList.add('active');
        document.querySelector('.bottom-nav').style.display = 'none';

        // Start timer
        this.workoutSeconds = 0;
        this.workoutPaused = false;
        this.workoutTimer = setInterval(() => {
            if (!this.workoutPaused) {
                this.workoutSeconds++;
                const min = String(Math.floor(this.workoutSeconds / 60)).padStart(2, '0');
                const sec = String(this.workoutSeconds % 60).padStart(2, '0');
                document.getElementById('workoutTimer').textContent = min + ':' + sec;
            }
        }, 1000);
    },

    renderExercises(workout) {
        const container = document.getElementById('exerciseList');
        container.innerHTML = workout.exercises.map((ex, idx) => {
            const setsHtml = Array.from({ length: ex.sets }, (_, i) => {
                const key = idx + '_' + i;
                const done = this.activeWorkoutData.completedSets[key] ? 'done' : '';
                return `<span class="set-badge ${done}" onclick="App.toggleSet(${idx}, ${i})">${i + 1}ª ${ex.reps}</span>`;
            }).join('');

            return `
                <div class="exercise-item" id="exercise_${idx}">
                    <div class="exercise-item-header">
                        <span class="exercise-item-name">${this.escapeHtml(ex.name)}</span>
                        <button class="exercise-item-check" id="exCheck_${idx}" onclick="App.toggleExercise(${idx})">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                    <div class="exercise-item-details">
                        <span><i class="fas fa-layer-group"></i> ${ex.sets} séries</span>
                        <span><i class="fas fa-repeat"></i> ${ex.reps}</span>
                        ${ex.rest ? '<span><i class="fas fa-clock"></i> ' + ex.rest + 's descanso</span>' : ''}
                    </div>
                    <div class="exercise-sets">${setsHtml}</div>
                </div>
            `;
        }).join('');
    },

    toggleSet(exIdx, setIdx) {
        const key = exIdx + '_' + setIdx;
        this.activeWorkoutData.completedSets[key] = !this.activeWorkoutData.completedSets[key];
        this.renderExercises(this.activeWorkoutData);
        this.updateWorkoutProgress();
    },

    toggleExercise(idx) {
        const completed = this.activeWorkoutData.completedExercises;
        const pos = completed.indexOf(idx);
        if (pos === -1) {
            completed.push(idx);
            // Mark all sets
            const ex = this.activeWorkoutData.exercises[idx];
            for (let i = 0; i < ex.sets; i++) {
                this.activeWorkoutData.completedSets[idx + '_' + i] = true;
            }
        } else {
            completed.splice(pos, 1);
            const ex = this.activeWorkoutData.exercises[idx];
            for (let i = 0; i < ex.sets; i++) {
                this.activeWorkoutData.completedSets[idx + '_' + i] = false;
            }
        }
        this.renderExercises(this.activeWorkoutData);
        this.updateWorkoutProgress();
    },

    updateWorkoutProgress() {
        const total = this.activeWorkoutData.exercises.length;
        const done = this.activeWorkoutData.completedExercises.length;
        const pct = total > 0 ? (done / total) * 100 : 0;
        document.getElementById('workoutProgressFill').style.width = pct + '%';
    },

    togglePauseWorkout() {
        this.workoutPaused = !this.workoutPaused;
        const btn = document.getElementById('btnPauseWorkout');
        if (this.workoutPaused) {
            btn.innerHTML = '<i class="fas fa-play"></i> Continuar';
        } else {
            btn.innerHTML = '<i class="fas fa-pause"></i> Pausar';
        }
    },

    finishWorkout() {
        if (!confirm('Finalizar treino?')) return;

        clearInterval(this.workoutTimer);

        // Save to history
        const historyEntry = {
            workoutId: this.activeWorkoutData.id,
            workoutName: this.activeWorkoutData.name,
            category: this.activeWorkoutData.category,
            duration: this.workoutSeconds,
            completedExercises: this.activeWorkoutData.completedExercises.length,
            totalExercises: this.activeWorkoutData.exercises.length,
            date: new Date().toISOString(),
            caloriesEstimated: Math.round(this.workoutSeconds / 60 * 7) // rough estimate
        };

        if (!this.currentUser.workoutHistory) this.currentUser.workoutHistory = [];
        this.currentUser.workoutHistory.push(historyEntry);

        // Save calories burned
        const totalCal = this.getTodayMetric('caloriasGastas') || 0;
        this.addMetricEntry(this.currentUser, 'caloriasGastas', totalCal + historyEntry.caloriesEstimated);

        this.saveUser();
        this.activeWorkoutData = null;

        // Return to workouts
        document.querySelector('.bottom-nav').style.display = 'flex';
        this.navigate('dashboard');
        this.toast('Treino finalizado! ' + Math.floor(this.workoutSeconds / 60) + ' min', 'success');
    },

    exitWorkout() {
        if (confirm('Sair do treino? O progresso será perdido.')) {
            clearInterval(this.workoutTimer);
            this.activeWorkoutData = null;
            document.querySelector('.bottom-nav').style.display = 'flex';
            this.navigate('treinos');
        }
    },

    // ==========================================
    // HISTORY
    // ==========================================
    loadHistory() {
        const metricKey = document.getElementById('historyMetric').value;
        const days = parseInt(document.getElementById('historyPeriod').value);
        const user = this.currentUser;
        if (!user || !user.metrics) return;

        const entries = (user.metrics[metricKey] || []).filter(e => {
            const d = new Date(e.date);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            return d >= cutoff;
        });

        // Stats
        const statsEl = document.getElementById('historyStats');
        if (entries.length > 0) {
            const values = entries.map(e => typeof e.value === 'number' ? e.value : parseFloat(e.value)).filter(v => !isNaN(v));
            const min = Math.min(...values);
            const max = Math.max(...values);
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            const change = values.length >= 2 ? values[values.length - 1] - values[0] : 0;

            statsEl.innerHTML = `
                <div class="history-stat">
                    <span class="history-stat-value">${avg.toFixed(1)}</span>
                    <span class="history-stat-label">Média</span>
                </div>
                <div class="history-stat">
                    <span class="history-stat-value">${min} - ${max}</span>
                    <span class="history-stat-label">Min - Máx</span>
                </div>
                <div class="history-stat">
                    <span class="history-stat-value" style="color:${change >= 0 ? 'var(--success)' : 'var(--danger)'}">${change >= 0 ? '+' : ''}${change.toFixed(1)}</span>
                    <span class="history-stat-label">Variação</span>
                </div>
            `;
        } else {
            statsEl.innerHTML = '<div class="empty-state small"><p>Sem dados para este período</p></div>';
        }

        // Entries list
        const entriesEl = document.getElementById('historyEntries');
        const sorted = [...entries].reverse();
        entriesEl.innerHTML = sorted.slice(0, 20).map((e, i) => {
            let changeHtml = '';
            if (i < sorted.length - 1) {
                const prev = typeof sorted[i + 1].value === 'number' ? sorted[i + 1].value : parseFloat(sorted[i + 1].value);
                const curr = typeof e.value === 'number' ? e.value : parseFloat(e.value);
                if (!isNaN(prev) && !isNaN(curr)) {
                    const diff = curr - prev;
                    const cls = diff >= 0 ? 'up' : 'down';
                    changeHtml = `<span class="history-entry-change ${cls}">${diff >= 0 ? '+' : ''}${diff.toFixed(1)}</span>`;
                }
            }

            let displayValue;
            if (metricKey === 'pressaoArterial' && e.sistolica) {
                displayValue = e.sistolica + '/' + e.diastolica + ' mmHg';
            } else {
                displayValue = e.value;
            }

            return `
                <div class="history-entry">
                    <span class="history-entry-date">${new Date(e.date).toLocaleDateString('pt-BR')}</span>
                    <span class="history-entry-value">${displayValue}</span>
                    ${changeHtml}
                </div>
            `;
        }).join('');

        // Chart
        this.drawHistoryChart(entries, metricKey);
    },

    // ==========================================
    // CHARTS (Canvas)
    // ==========================================
    drawWeightChart() {
        const canvas = document.getElementById('weightChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const entries = (this.currentUser.metrics && this.currentUser.metrics.peso) || [];
        const recent = entries.slice(-10);

        canvas.width = canvas.parentElement.clientWidth - 30;
        canvas.height = 180;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (recent.length < 2) {
            ctx.fillStyle = '#6c7a9c';
            ctx.font = '14px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText('Registre seu peso para ver o gráfico', canvas.width / 2, canvas.height / 2);
            return;
        }

        this.drawLineChart(ctx, canvas, recent);
    },

    drawHistoryChart(entries, key) {
        const canvas = document.getElementById('historyChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        canvas.width = canvas.parentElement.clientWidth - 40;
        canvas.height = 220;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (entries.length < 2) {
            ctx.fillStyle = '#6c7a9c';
            ctx.font = '14px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText('Dados insuficientes para gráfico', canvas.width / 2, canvas.height / 2);
            return;
        }

        if (key === 'pressaoArterial') {
            // Draw two lines for systolic/diastolic
            const sysEntries = entries.map(e => ({ ...e, value: e.sistolica || parseFloat(e.value.split('/')[0]) }));
            const diaEntries = entries.map(e => ({ ...e, value: e.diastolica || parseFloat(e.value.split('/')[1]) }));
            this.drawLineChart(ctx, canvas, sysEntries, '#ff6b6b');
            this.drawLineChart(ctx, canvas, diaEntries, '#448aff', true);
        } else {
            this.drawLineChart(ctx, canvas, entries);
        }
    },

    drawLineChart(ctx, canvas, entries, color, overlay) {
        const values = entries.map(e => typeof e.value === 'number' ? e.value : parseFloat(e.value)).filter(v => !isNaN(v));
        if (values.length < 2) return;

        const padding = { top: 20, right: 15, bottom: 30, left: 45 };
        const w = canvas.width - padding.left - padding.right;
        const h = canvas.height - padding.top - padding.bottom;

        const minVal = Math.min(...values) * 0.98;
        const maxVal = Math.max(...values) * 1.02;
        const range = maxVal - minVal || 1;

        if (!overlay) {
            // Grid
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = padding.top + (h / 4) * i;
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(canvas.width - padding.right, y);
                ctx.stroke();

                const val = maxVal - (range / 4) * i;
                ctx.fillStyle = '#6c7a9c';
                ctx.font = '10px Poppins';
                ctx.textAlign = 'right';
                ctx.fillText(val.toFixed(1), padding.left - 5, y + 3);
            }

            // X Labels
            const step = Math.max(1, Math.floor(entries.length / 5));
            for (let i = 0; i < entries.length; i += step) {
                const x = padding.left + (w / (entries.length - 1)) * i;
                ctx.fillStyle = '#6c7a9c';
                ctx.font = '9px Poppins';
                ctx.textAlign = 'center';
                const d = new Date(entries[i].date);
                ctx.fillText(d.getDate() + '/' + (d.getMonth() + 1), x, canvas.height - 5);
            }
        }

        // Line
        const lineColor = color || '#FF6B6B';
        const points = values.map((v, i) => ({
            x: padding.left + (w / (values.length - 1)) * i,
            y: padding.top + h - ((v - minVal) / range) * h
        }));

        // Gradient fill
        const gradient = ctx.createLinearGradient(0, padding.top, 0, canvas.height - padding.bottom);
        gradient.addColorStop(0, lineColor + '40');
        gradient.addColorStop(1, lineColor + '00');

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            const xc = (points[i].x + points[i - 1].x) / 2;
            const yc = (points[i].y + points[i - 1].y) / 2;
            ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);

        // Fill area
        ctx.lineTo(points[points.length - 1].x, canvas.height - padding.bottom);
        ctx.lineTo(points[0].x, canvas.height - padding.bottom);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw line
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            const xc = (points[i].x + points[i - 1].x) / 2;
            const yc = (points[i].y + points[i - 1].y) / 2;
            ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Points
        points.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = lineColor;
            ctx.fill();
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    },

    // ==========================================
    // PROFILE
    // ==========================================
    loadProfile() {
        const user = this.currentUser;
        if (!user) return;

        const initials = user.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        document.getElementById('profileAvatar').textContent = initials;
        document.getElementById('profileName').textContent = user.nome;
        document.getElementById('profileEmail').textContent = user.email;

        document.getElementById('profileInputNome').value = user.nome || '';
        document.getElementById('profileInputTelefone').value = user.telefone || '';
        document.getElementById('profileInputNascimento').value = user.nascimento || '';
        document.getElementById('profileInputSexo').value = user.sexo || 'F';
        document.getElementById('profileInputObjetivo').value = user.objetivo || '';
        document.getElementById('profileInputPeso').value = user.peso || '';
        document.getElementById('profileInputAltura').value = user.altura || '';
        document.getElementById('profileInputMetaPeso').value = user.metaPeso || '';
        document.getElementById('profileInputRestricoes').value = user.restricoes || '';
    },

    saveProfile() {
        const user = this.currentUser;
        user.nome = document.getElementById('profileInputNome').value.trim();
        user.telefone = document.getElementById('profileInputTelefone').value.trim();
        user.nascimento = document.getElementById('profileInputNascimento').value;
        user.sexo = document.getElementById('profileInputSexo').value;
        user.objetivo = document.getElementById('profileInputObjetivo').value;

        const newPeso = parseFloat(document.getElementById('profileInputPeso').value);
        if (newPeso && newPeso !== user.peso) {
            user.peso = newPeso;
            this.addMetricEntry(user, 'peso', newPeso);
        }
        const newAltura = parseInt(document.getElementById('profileInputAltura').value);
        if (newAltura && newAltura !== user.altura) {
            user.altura = newAltura;
            this.addMetricEntry(user, 'altura', newAltura);
        }
        user.metaPeso = parseFloat(document.getElementById('profileInputMetaPeso').value) || null;
        user.restricoes = document.getElementById('profileInputRestricoes').value.trim();

        this.saveUser();
        this.updateHeader();
        this.loadProfile();
        this.toast('Perfil atualizado!', 'success');
    },

    // ==========================================
    // WATER TRACKER
    // ==========================================
    setupWaterTracker() {
        const container = document.getElementById('waterGlasses');
        if (!container) return;
        const meta = 8;
        this.waterCount = 0;
        this.renderWaterGlasses(meta);
    },

    renderWaterGlasses(meta) {
        const container = document.getElementById('waterGlasses');
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < meta; i++) {
            const btn = document.createElement('button');
            btn.className = 'water-glass' + (i < this.waterCount ? ' filled' : '');
            btn.textContent = '💧';
            btn.onclick = () => {
                this.waterCount = i + 1;
                this.renderWaterGlasses(meta);
                document.getElementById('dashAgua').textContent = this.waterCount;
            };
            container.appendChild(btn);
        }
        const countEl = document.getElementById('waterCount');
        if (countEl) countEl.textContent = this.waterCount + ' / ' + meta + ' copos';
    },

    addWater() {
        this.waterCount = Math.min(this.waterCount + 1, 12);
        document.getElementById('dashAgua').textContent = this.waterCount;
        this.renderWaterGlasses(8);
        this.toast('💧 +1 copo de água!', 'info');
    },

    // ==========================================
    // UI HELPERS
    // ==========================================
    setupSliders() {
        const sliders = [
            { id: 'inputEstresse', valueId: 'estresseValue' },
            { id: 'inputEnergia', valueId: 'energiaValue' },
            { id: 'inputDor', valueId: 'dorValue' }
        ];
        sliders.forEach(({ id, valueId }) => {
            const slider = document.getElementById(id);
            const val = document.getElementById(valueId);
            if (slider && val) {
                slider.addEventListener('input', () => val.textContent = slider.value);
            }
        });
    },

    setupStars() {
        const stars = document.querySelectorAll('#inputQualidadeSono i');
        stars.forEach(star => {
            star.addEventListener('click', () => {
                this.selectedSleepRating = parseInt(star.dataset.val);
                stars.forEach((s, i) => {
                    s.classList.toggle('active', i < this.selectedSleepRating);
                });
            });
        });
    },

    selectMood(mood) {
        this.selectedMood = mood;
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.mood-btn[data-mood="${mood}"]`).classList.add('active');
    },

    showQuickLog() {
        document.getElementById('modalQuickLog').style.display = 'flex';
        document.getElementById('quickLogInput').style.display = 'none';
    },

    quickLogWeight() {
        const input = document.getElementById('quickLogInput');
        input.style.display = 'block';
        input.innerHTML = `
            <div class="form-group">
                <label>Peso (kg)</label>
                <input type="number" id="qlPeso" step="0.1" placeholder="kg">
                <button class="btn-primary" style="margin-top:10px" onclick="App.saveQuickLog('peso')">Salvar</button>
            </div>
        `;
    },

    quickLogBP() {
        const input = document.getElementById('quickLogInput');
        input.style.display = 'block';
        input.innerHTML = `
            <div class="form-group">
                <label>Pressão Arterial</label>
                <div style="display:flex;gap:8px">
                    <input type="number" id="qlPAS" placeholder="Sistólica">
                    <span style="line-height:40px;color:#6c7a9c">/</span>
                    <input type="number" id="qlPAD" placeholder="Diastólica">
                </div>
                <button class="btn-primary" style="margin-top:10px" onclick="App.saveQuickLog('pa')">Salvar</button>
            </div>
        `;
    },

    quickLogHR() {
        const input = document.getElementById('quickLogInput');
        input.style.display = 'block';
        input.innerHTML = `
            <div class="form-group">
                <label>Frequência Cardíaca (bpm)</label>
                <input type="number" id="qlFC" placeholder="bpm">
                <button class="btn-primary" style="margin-top:10px" onclick="App.saveQuickLog('fc')">Salvar</button>
            </div>
        `;
    },

    quickLogCalories() {
        const input = document.getElementById('quickLogInput');
        input.style.display = 'block';
        input.innerHTML = `
            <div class="form-group">
                <label>Calorias Consumidas (kcal)</label>
                <input type="number" id="qlCal" placeholder="kcal">
                <button class="btn-primary" style="margin-top:10px" onclick="App.saveQuickLog('cal')">Salvar</button>
            </div>
        `;
    },

    quickLogSleep() {
        const input = document.getElementById('quickLogInput');
        input.style.display = 'block';
        input.innerHTML = `
            <div class="form-group">
                <label>Horas de Sono</label>
                <input type="number" id="qlSono" step="0.5" placeholder="horas">
                <button class="btn-primary" style="margin-top:10px" onclick="App.saveQuickLog('sono')">Salvar</button>
            </div>
        `;
    },

    quickLogSteps() {
        const input = document.getElementById('quickLogInput');
        input.style.display = 'block';
        input.innerHTML = `
            <div class="form-group">
                <label>Passos Hoje</label>
                <input type="number" id="qlPassos" placeholder="passos">
                <button class="btn-primary" style="margin-top:10px" onclick="App.saveQuickLog('passos')">Salvar</button>
            </div>
        `;
    },

    saveQuickLog(type) {
        const user = this.currentUser;
        switch (type) {
            case 'peso': {
                const v = parseFloat(document.getElementById('qlPeso').value);
                if (!v) return;
                this.addMetricEntry(user, 'peso', v);
                user.peso = v;
                break;
            }
            case 'pa': {
                const s = parseInt(document.getElementById('qlPAS').value);
                const d = parseInt(document.getElementById('qlPAD').value);
                if (!s || !d) return;
                this.addMetricEntry(user, 'pressaoArterial', s + '/' + d, { sistolica: s, diastolica: d });
                break;
            }
            case 'fc': {
                const v = parseInt(document.getElementById('qlFC').value);
                if (!v) return;
                this.addMetricEntry(user, 'fcRepouso', v);
                break;
            }
            case 'cal': {
                const v = parseInt(document.getElementById('qlCal').value);
                if (!v) return;
                this.addMetricEntry(user, 'caloriasConsumidas', v);
                break;
            }
            case 'sono': {
                const v = parseFloat(document.getElementById('qlSono').value);
                if (!v) return;
                this.addMetricEntry(user, 'sonoHoras', v);
                break;
            }
            case 'passos': {
                const v = parseInt(document.getElementById('qlPassos').value);
                if (!v) return;
                this.addMetricEntry(user, 'passos', v);
                break;
            }
        }
        this.saveUser();
        this.updateDashboard();
        this.closeModal('modalQuickLog');
        this.toast('Registrado!', 'success');
    },

    // Modals
    showNotifications() {
        document.getElementById('modalNotifications').style.display = 'flex';
    },

    showSettings() {
        document.getElementById('modalSettings').style.display = 'flex';
    },

    showAddMetric() {
        this.toast('Use as abas acima para adicionar métricas', 'info');
    },

    closeModal(id) {
        document.getElementById(id).style.display = 'none';
    },

    // Toast
    toast(message, type) {
        const toast = document.getElementById('appToast');
        toast.textContent = message;
        toast.className = 'app-toast show ' + (type || 'info');
        setTimeout(() => toast.classList.remove('show'), 3000);
    },

    // ==========================================
    // DATA MANAGEMENT
    // ==========================================
    saveUser() {
        const users = this.db.get('users') || {};
        users[this.currentUser.email] = this.currentUser;
        this.db.set('users', users);
        // Sync to server in background
        this.syncUserToServer(this.currentUser.email, this.currentUser);
    },

    exportData() {
        const data = JSON.stringify(this.currentUser, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tati_fitness_' + this.currentUser.nome.replace(/\s+/g, '_') + '_' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
        this.toast('Dados exportados!', 'success');
    },

    exportAllStudents() {
        const users = this.db.get('users') || {};
        const count = Object.keys(users).length;
        if (count === 0) {
            this.toast('Nenhum aluno cadastrado', 'error');
            return;
        }
        const exportObj = {
            appName: 'Tati Portela Fitness',
            exportDate: new Date().toISOString(),
            totalAlunos: count,
            alunos: users
        };
        const data = JSON.stringify(exportObj, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tati_fitness_alunos_' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
        this.toast(count + ' aluno(s) exportado(s) com sucesso!', 'success');
    },

    importStudents(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                let importedUsers;

                // Support both formats: {alunos: {...}} or direct {email: userObj}
                if (parsed.alunos && typeof parsed.alunos === 'object') {
                    importedUsers = parsed.alunos;
                } else if (parsed.email && parsed.nome) {
                    // Single user export
                    importedUsers = { [parsed.email]: parsed };
                } else {
                    importedUsers = parsed;
                }

                if (typeof importedUsers !== 'object' || Array.isArray(importedUsers)) {
                    this.toast('Formato de arquivo inválido', 'error');
                    return;
                }

                const currentUsers = this.db.get('users') || {};
                let added = 0;
                let updated = 0;

                for (const email in importedUsers) {
                    const user = importedUsers[email];
                    if (!user.email || !user.nome) continue;
                    if (currentUsers[email]) {
                        updated++;
                    } else {
                        added++;
                    }
                    currentUsers[email] = user;
                }

                this.db.set('users', currentUsers);

                // Sync all to server
                this.syncAllUsersToServer();

                // Refresh current user if updated
                if (this.currentUser && currentUsers[this.currentUser.email]) {
                    this.currentUser = currentUsers[this.currentUser.email];
                }

                this.loadProfile();
                this.loadStudentsSummary();
                this.toast(`Importado! ${added} novo(s), ${updated} atualizado(s)`, 'success');
            } catch (err) {
                this.toast('Erro ao ler arquivo: formato inválido', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    loadStudentsSummary() {
        const container = document.getElementById('studentsSummary');
        if (!container) return;

        // Try loading from server first for latest data
        const render = (users) => {
            const list = Object.values(users);
            if (list.length === 0) {
                container.innerHTML = '<p class="empty-hint">Nenhum aluno cadastrado ainda.</p>';
                return;
            }
            container.innerHTML = `
                <div class="summary-header">
                    <span><i class="fas fa-users"></i> ${list.length} aluno(s) cadastrado(s)</span>
                    <span class="server-status ${this.serverOnline ? 'online' : 'offline'}">
                        <i class="fas fa-${this.serverOnline ? 'cloud-check' : 'cloud-slash'}"></i>
                        ${this.serverOnline ? 'Servidor Online' : 'Modo Offline'}
                    </span>
                </div>
                <div class="students-list">
                    ${list.map(u => `
                        <div class="student-item">
                            <div class="student-avatar">${u.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</div>
                            <div class="student-info">
                                <span class="student-name">${this.escapeHtml(u.nome)}</span>
                                <span class="student-email">${this.escapeHtml(u.email)}</span>
                            </div>
                            <span class="student-date">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '--'}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        };

        // Render local data immediately
        const localUsers = this.db.get('users') || {};
        render(localUsers);

        // Then update from server if available
        if (this.serverOnline) {
            this.loadUsersFromServer().then(merged => {
                if (merged) render(merged);
            });
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Close modals on backdrop click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Initialize app
document.addEventListener('DOMContentLoaded', () => App.init());
