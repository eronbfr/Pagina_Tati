# 💪 Site Profissional - Tati Portela Personal Trainer

Um website moderno, responsivo e profissional para personal trainer Tatiana Portela, desenvolvido com **HTML5**, **CSS3** e **JavaScript puro**.

## 🚀 Características Principais

✅ **Design Moderno e Responsivo**
- Layout totalmente adaptável (mobile, tablet, desktop)
- Gradientes elegantes e animações suaves
- Paleta de cores profissional (Coral, Turquesa, Amarelo)

✅ **Seções Completas**
- 🎯 **Hero Section** - Chamada principal impactante
- 👋 **Sobre** - Apresentação com estatísticas
- 💼 **Serviços** - 6 diferentes tipos de atendimento
- 📸 **Resultados** - Antes e depois dos clientes
- ⭐ **Depoimentos** - Reviews de clientes satisfeitos
- 📞 **Contato** - Formulário + informações + WhatsApp

✅ **Funcionalidades JavaScript**
- Menu mobile responsivo com hamburger
- Scroll suave entre seções
- Animações ao entrar em view
- Contadores de estatísticas com efeito
- Notificações de toast
- Botão WhatsApp flutuante
- Validação de formulário

✅ **SEO e Performance**
- Meta tags otimizadas
- Estrutura semântica HTML5
- Otimizado para buscadores
- Efeitos smooth sem lag

## 📁 Estrutura de Arquivos

```
TatianPortela_Site/
├── index.html          # Página principal
├── styles.css          # Estilos globais e responsivos
├── script.js           # Interatividade e animações
├── config.js           # Configurações personalizáveis (NOVO)
└── README.md           # Este arquivo
```

## 🎨 Cores Utilizadas

| Cor | Hex | Uso |
|-----|-----|-----|
| Primária (Coral) | #FF6B6B | Botões, destaques, ícones |
| Secundária (Turquesa) | #4ECDC4 | Acentos, hover states |
| Destaque (Amarelo) | #FFE66D | Ratings, badges |
| Escuro | #1a1a1a | Textos, backgrounds |
| Claro | #f8f9fa | Backgrounds alternativos |

## 🔧 Como Usar

### Opção 1: Abrir diretamente no navegador
1. Clique duas vezes em `index.html`
2. Ou arraste o arquivo para o navegador

### Opção 2: Usar um servidor local (recomendado)

**Com Python 3:**
```bash
cd TatianPortela_Site
python -m http.server 8000
# Acesse: http://localhost:8000
```

**Com Python 2:**
```bash
python -m SimpleHTTPServer 8000
```

**Com Node.js/NPM:**
```bash
npx http-server
```

**Com VS Code:**
- Instale a extensão "Live Server"
- Clique direito em `index.html` → "Open with Live Server"

## 📝 Personalizações

### 1. Dados de Contato
Editar em `index.html`:

```html
<!-- Telefone -->
<a href="tel:+5521987654321">(21) 98765-4321</a>

<!-- Email -->
<a href="mailto:tati@personaltraining.com">tati@personaltraining.com</a>

<!-- WhatsApp em script.js -->
whatsappButton.href = 'https://wa.me/5521987654321?text=...';
```

### 2. Textos e Descrições
- Abra `index.html` em um editor de texto
- Procure pelos textos a modificar
- Mantenha a estrutura HTML

### 3. Imagens e Ícones
- Use Firebase Storage ou Cloudinary (grátis)
- Substitua as divs `.image-placeholder` por tags `<img>`
- Os ícones usam Font Awesome (já incluído)

### 4. Cores Personalizadas
Editar em `styles.css`, línha 7-16:

```css
:root {
    --primary-color: #FF6B6B;    /* Coral */
    --secondary-color: #4ECDC4;  /* Turquesa */
    --accent-color: #FFE66D;     /* Amarelo */
    /* ... */
}
```

### 5. Redes Sociais
Editar links em `index.html`:

```html
<a href="https://instagram.com/tatiportela"><i class="fab fa-instagram"></i></a>
<a href="https://facebook.com/tatiportela"><i class="fab fa-facebook"></i></a>
<a href="https://youtube.com/@tatiportela"><i class="fab fa-youtube"></i></a>
```

## 🔗 Integração com Backend

### Envío de Emails (Formulário de Contato)

Se quiser que o formulário realmente envie emails, adicione em `script.js`:

```javascript
// Usar serviço como EmailJS, Formspree ou Sendgrid
fetch('https://api.formspree.io/f/YOUR_FORM_ID', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
})
.then(response => showToast('Mensagem enviada com sucesso!'))
.catch(error => showToast('Erro ao enviar'));
```

### Serviços Recomendados (Grátis):
- **Formspree** - formspree.io
- **EmailJS** - emailjs.com
- **Getform** - getform.io

## 📸 Adicionar Fotos de Antes e Depois

1. Crie pasta `assets/images/`
2. Salve fotos com nomes: `client1-before.jpg`, `client1-after.jpg`
3. Edite `index.html` - substitua `.image-placeholder` por:

```html
<div class="before-image">
    <img src="assets/images/client1-before.jpg" alt="Antes - João Silva">
</div>
```

## 🚀 Deployment (Publicar Online)

### GitHub Pages (Grátis)
1. Crie repositório no GitHub
2. Faça upload dos arquivos
3. Vá em Settings → Pages → Deploy from Branch
4. Acesse: `https://seu-usuario.github.io/TatianPortela_Site`

### Vercel (Recomendado - Grátis)
1. Vá para vercel.com
2. Import → selecione repositório GitHub
3. Deploy automático

### Netlify (Muito Fácil)
1. Acesse netlify.com
2. Drag & drop a pasta do projeto
3. Pronto! Seu site está online

### Hospedagem Paga
- HostGator
- Bluehost
- SiteGround
- Hostinger

## 🎯 SEO - Otimizações

O site já inclui:
- ✅ Meta tags (title, description, keywords)
- ✅ Estrutura semântica HTML5
- ✅ Open Graph (para compartilhar em redes)
- ✅ Sitemap ready

Para melhorar mais:
1. Registre no Google Search Console
2. Adicione Google Analytics
3. Crie Sitemap XML
4. Simplifique URLs

## 📊 Analytics

Adicione Google Analytics em `index.html` antes de `</head>`:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'SEU_GA_ID');
</script>
```

## 🎓 Tecnologias Utilizadas

- **HTML5** - Estrutura semântica
- **CSS3** - Grid, Flexbox, Gradientes, Animações
- **JavaScript Vanilla** - Sem dependências externas
- **Font Awesome 6** - Ícones profissionais
- **Google Fonts** - Tipografia premium

## 📱 Testes de Responsividade

- ✅ Testado em Chrome, Firefox, Safari, Edge
- ✅ Mobile: iPhone, Android
- ✅ Tablet: iPad, Galaxy Tab
- ✅ Desktop: 1920px até 360px

Use `F12` → Toggle Device Toolbar para testar

## 🐛 Troubleshooting

**Ícones não aparecem?**
- Verifique conexão com Font Awesome CDN

**Formulário não envia?**
- Integre com Formspree/EmailJS (ver seção acima)

**Imagens não carregam?**
- Verifique caminho relativo das imagens

**Menu mobile não funciona?**
- Limpe cache do navegador (Ctrl+Shift+Delete)

## 📞 Suporte

Para dúvidas de desenvolvimento, consulte:
- MDN Web Docs: mdn.org
- CSS-Tricks: css-tricks.com
- Stack Overflow: stackoverflow.com

## 📄 Licença

Este template é fornecido como está para uso pessoal e comercial.

---

**Desenvolvido com ❤️ para Tati Portela | Personal Trainer**

*Última atualização: Março 2026*
