// ============================================
// MÁSCARA TELEFONE COM SELEÇÃO DE PAÍS
// ============================================
const contactPhone = document.getElementById('contactPhone');
const countryCode = document.getElementById('countryCode');
if (contactPhone && countryCode) {
    function getMask() {
        const selected = countryCode.selectedOptions[0];
        return selected.getAttribute('data-mask') || 'XXXXX-XXXXX';
    }

    function formatWithMask(val, mask) {
        const digits = val.replace(/\D/g, '');
        let result = '';
        let di = 0;
        for (let i = 0; i < mask.length && di < digits.length; i++) {
            if (mask[i] === 'X') {
                result += digits[di++];
            } else {
                result += mask[i];
                // Se o próximo char da máscara não é X, não avança o dígito
            }
        }
        return result;
    }

    function getMaxDigits(mask) {
        return (mask.match(/X/g) || []).length;
    }

    function updatePlaceholder() {
        const mask = getMask();
        contactPhone.placeholder = mask.replace(/X/g, 'X');
        contactPhone.maxLength = mask.length;
    }

    countryCode.addEventListener('change', function() {
        contactPhone.value = '';
        updatePlaceholder();
        contactPhone.focus();
    });

    updatePlaceholder();

    contactPhone.addEventListener('input', function(e) {
        const mask = getMask();
        const maxDigits = getMaxDigits(mask);
        const pos = this.selectionStart;
        const oldLen = this.value.length;
        this.value = formatWithMask(this.value, mask);
        const newLen = this.value.length;
        const newPos = Math.max(0, pos + (newLen - oldLen));
        this.setSelectionRange(newPos, newPos);

        const digits = this.value.replace(/\D/g, '');
        if (digits.length < maxDigits) {
            this.setCustomValidity('Preencha o telefone completo');
        } else {
            this.setCustomValidity('');
        }
    });

    contactPhone.addEventListener('paste', function(e) {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text');
        const digits = pasted.replace(/\D/g, '');
        if (digits) {
            this.value = formatWithMask(digits, getMask());
            this.dispatchEvent(new Event('input'));
        }
    });

    contactPhone.addEventListener('keydown', function(e) {
        if (['Backspace','Delete','Tab','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)) return;
        if ((e.ctrlKey || e.metaKey) && ['a','c','v','x'].includes(e.key.toLowerCase())) return;
        if (!/^[0-9]$/.test(e.key)) {
            e.preventDefault();
        }
    });
}

// ============================================
// MENU MOBILE
// ============================================
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-links');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });
}

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
    });
});

// ============================================
// SMOOTH SCROLL
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && document.querySelector(href)) {
            e.preventDefault();
            document.querySelector(href).scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// ============================================
// FORM SUBMISSION
// ============================================
const contactForm = document.getElementById('contactForm');

if (contactForm) {
contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Coleta os dados do formulário
    const nome = this.querySelector('input[name="nome"]').value.trim();
    const email = this.querySelector('input[name="email"]').value.trim();
    const telefoneRaw = this.querySelector('input[name="telefone"]').value.trim();
    const codPais = this.querySelector('#countryCode').value;
    const telefone = codPais + ' ' + telefoneRaw;
    const selectEl = this.querySelector('select[name="interesse"]');
    const interesse = selectEl.selectedOptions[0].text;
    const mensagem = this.querySelector('textarea[name="mensagem"]').value.trim();

    // Validação básica
    if (!nome || !email || !telefone || !selectEl.value || !mensagem) {
        showToast('Por favor, preencha todos os campos!', 'error');
        return;
    }

    // Monta a mensagem para o WhatsApp
    const texto = `Olá Tati! Vim pelo site e gostaria de mais informações.\n\n` +
        `*Nome:* ${nome}\n` +
        `*Email:* ${email}\n` +
        `*Telefone:* ${telefone}\n` +
        `*Interesse:* ${interesse}\n` +
        `*Mensagem:* ${mensagem}`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=5541997786117&text=${encodeURIComponent(texto)}`;
    
    // Abre o WhatsApp via link (evita bloqueio de popup)
    const link = document.createElement('a');
    link.href = whatsappUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Mostra mensagem de sucesso
    showToast('Redirecionando para o WhatsApp...', 'success');
    
    // Reseta o formulário
    this.reset();
});
} // fim if contactForm

// ============================================
// TOAST NOTIFICATION
// ============================================
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// SCROLL ANIMATION
// ============================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observa os cards de serviços e depoimentos
document.querySelectorAll('.service-card, .testimonial-card, .result-card').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
});

// Adiciona a animação CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// ============================================
// NAVBAR SHADOW ON SCROLL
// ============================================
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 0) {
        navbar.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2)';
    } else {
        navbar.style.boxShadow = 'var(--shadow)';
    }
});

// ============================================
// ACTIVE NAV LINK
// ============================================
window.addEventListener('scroll', () => {
    let current = '';
    
    document.querySelectorAll('section').forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });
});

// CSS para active nav link
const navStyle = document.createElement('style');
navStyle.textContent = `
    .nav-links.active {
        color: var(--primary-color);
        font-weight: 700;
    }
`;
document.head.appendChild(navStyle);

// ============================================
// CONTADOR DE ESTATÍSTICAS
// ============================================
function animateCounters() {
    const stats = document.querySelectorAll('.stat h3');
    
    stats.forEach(stat => {
        const target = parseInt(stat.textContent);
        const increment = target / 100;
        let current = 0;

        const updateCount = () => {
            current += increment;
            if (current < target) {
                stat.textContent = Math.ceil(current) + '+';
                setTimeout(updateCount, 30);
            } else {
                stat.textContent = target + '+';
            }
        };

        // Inicia a animação quando a seção entra em view
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                updateCount();
                observer.unobserve(stat);
            }
        });
        
        observer.observe(stat);
    });
}

animateCounters();

// ============================================
// LAZY LOADING DE IMAGENS
// ============================================
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
}

// ============================================
// BOTÃO WHATSAPP
// ============================================
function criarBotaoWhatsApp() {
    const whatsappButton = document.createElement('a');
    whatsappButton.href = 'https://api.whatsapp.com/send?phone=5541997786117&text=Olá%20Tati%21%20Gostaria%20de%20mais%20informações%20sobre%20seus%20serviços%20de%20personal%20training.';
    whatsappButton.target = '_blank';
    whatsappButton.className = 'whatsapp-button';
    whatsappButton.innerHTML = '<i class="fab fa-whatsapp"></i>';
    whatsappButton.title = 'Chat com Tati no WhatsApp';
    
    document.body.appendChild(whatsappButton);
}

criarBotaoWhatsApp();

// CSS para botão WhatsApp flutuante
const whatsappStyle = document.createElement('style');
whatsappStyle.textContent = `
    .whatsapp-button {
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 60px;
        height: 60px;
        background: #25D366;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        color: white;
        font-size: 30px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 999;
        animation: pulse 2s infinite;
        transition: all 0.3s ease;
    }

    .whatsapp-button:hover {
        transform: scale(1.1);
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
    }

    @keyframes pulse {
        0%, 100% {
            box-shadow: 0 10px 30px rgba(37, 211, 102, 0.3);
        }
        50% {
            box-shadow: 0 10px 40px rgba(37, 211, 102, 0.5);
        }
    }

    @media screen and (max-width: 768px) {
        .whatsapp-button {
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            font-size: 25px;
        }
    }
`;
document.head.appendChild(whatsappStyle);

// ============================================
// ANALYTICS E EVENTOS
// ============================================
document.querySelectorAll('.cta-button').forEach(button => {
    button.addEventListener('click', () => {
        console.log('CTA Button clicado');
        // Aqui você pode adicionar rastreamento com Google Analytics ou similar
        // gtag('event', 'cta_click');
    });
});

// ============================================
// DARK MODE
// ============================================
try {
    const darkBtn = document.getElementById('darkModeBtn');
    if (darkBtn) {
        let dragged = false;

        // Click alterna modo (só se não arrastou)
        darkBtn.addEventListener('click', function() {
            if (dragged) { dragged = false; return; }
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark);
            darkBtn.innerHTML = isDark ? '\u2600\ufe0f' : '\ud83c\udf19';
        });

        // Drag logic
        let startX, startY, btnX, btnY;

        function onStart(e) {
            const ev = e.touches ? e.touches[0] : e;
            startX = ev.clientX;
            startY = ev.clientY;
            const rect = darkBtn.getBoundingClientRect();
            btnX = rect.left;
            btnY = rect.top;
            dragged = false;
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onEnd);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onEnd);
        }

        function onMove(e) {
            const ev = e.touches ? e.touches[0] : e;
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            if (!dragged && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) dragged = true;
            if (!dragged) return;
            if (e.cancelable) e.preventDefault();
            let x = Math.max(0, Math.min(window.innerWidth - 48, btnX + dx));
            let y = Math.max(0, Math.min(window.innerHeight - 48, btnY + dy));
            darkBtn.style.left = x + 'px';
            darkBtn.style.top = y + 'px';
        }

        function onEnd() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
            if (dragged) {
                const rect = darkBtn.getBoundingClientRect();
                localStorage.setItem('darkModePos', JSON.stringify({ left: rect.left, top: rect.top }));
            }
        }

        darkBtn.addEventListener('mousedown', onStart);
        darkBtn.addEventListener('touchstart', onStart, { passive: true });

        // Posição salva
        try {
            const savedPos = JSON.parse(localStorage.getItem('darkModePos') || 'null');
            if (savedPos && savedPos.left != null && savedPos.top != null) {
                darkBtn.style.left = savedPos.left + 'px';
                darkBtn.style.top = savedPos.top + 'px';
            }
        } catch(e) {}

        // Preferência salva
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            darkBtn.innerHTML = '☀️';
        }
    }
} catch(e) { console.error('Dark mode error:', e); }

console.log('Site Tati Portela carregado com sucesso! 💪');
