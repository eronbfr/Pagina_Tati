# Tati Portela · Personal Trainer

Site institucional da Tati Portela (CREF 022922-G/PR), Studio Corpo e Mente em Sintonia — Curitiba.
HTML, CSS e JavaScript puros: sem build, sem dependências e sem backend.

Produção: <https://personaltatiportela.com.br/>

## Estrutura

```
index.html            Página de boas-vindas (porta de entrada, com atalhos para cada especialidade)
site.html             Site completo (hero, sobre, serviços, objetivos, método, GLP-1, depoimentos, FAQ, contato)
privacidade.html      Política de privacidade (LGPD)
404.html              Página de erro (usada automaticamente pelo GitHub Pages)
sw.js                 Remove o service worker do antigo app dos navegadores que o instalaram
robots.txt            Regras para buscadores
sitemap.xml           Mapa do site
favicon.*             Ícones (SVG + ICO + Apple touch)
assets/
  css/styles.css      Design system (tokens, tema claro/escuro, componentes)
  js/main.js          Interações (menu, tema, formulário → WhatsApp, carrossel, cookies)
  img/                Fotos em AVIF/WebP/JPEG responsivos, logo vetorial, imagem de compartilhamento
  fonts/              Archivo e Instrument Serif auto-hospedadas (licença OFL)
```

## Como visualizar localmente

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Onde editar

| O quê | Onde |
|---|---|
| Número do WhatsApp | `assets/js/main.js` (`WHATSAPP`) e os `href="https://wa.me/..."` do `index.html` |
| Mensagem pronta de cada botão | atributo `data-wa="..."` do link (`index.html` e `site.html`) |
| Textos, serviços, depoimentos e FAQ | `site.html` (o FAQ também está no bloco JSON-LD `FAQPage` no `<head>` — mantenha os dois iguais) |
| Página de boas-vindas | `index.html` |
| Endereço, horário, e-mail e redes | seção `#contato`, rodapé e JSON-LD no `<head>` do `site.html` |
| Cores, fontes e espaçamentos | variáveis em `:root` no início de `assets/css/styles.css` (tema claro) e nos blocos `[data-theme="dark"]` (tema escuro) — todas as seções seguem o tema escolhido |
| Google Analytics | ID `G-W2JS8PE7WV` no `<head>` (só carrega no domínio oficial e só grava cookies após o aceite) |

Ao trocar CSS/JS, atualize o parâmetro `?v=` nos `<link>`/`<script>` para evitar cache antigo.

### Trocar ou adicionar fotos

Gere versões AVIF, WebP e JPEG em 2–3 larguras (ex.: 560, 840 e 1120 px) e referencie no `<picture>`
seguindo o padrão das fotos atuais. Sempre preencha `alt`, `width` e `height`.

## Boas práticas aplicadas

- **Performance:** sem frameworks; fontes auto-hospedadas com fallback de métricas ajustadas (sem CLS);
  imagens AVIF/WebP responsivas com `srcset`; ícones em sprite SVG inline; mapa do Google carregado só ao clicar.
  Lighthouse: 99–100 em todas as categorias.
- **SEO:** título e descrição otimizados, canonical, Open Graph/Twitter, dados estruturados
  (`HealthClub`, `Person`, `FAQPage`), sitemap e robots.
- **Acessibilidade:** HTML semântico, link "pular para o conteúdo", foco visível, contraste AA,
  navegação por teclado, `prefers-reduced-motion` e tema escuro automático.
- **Conversão:** CTAs de WhatsApp com mensagem pronta por serviço/objetivo; formulário curto que monta a mensagem.
- **Privacidade (LGPD):** Consent Mode v2 do Google, banner de cookies e política de privacidade.

## Publicação

O site é estático: basta enviar os arquivos para qualquer hospedagem (inclusive o servidor atual do domínio)
ou publicar pelo GitHub Pages a partir da raiz do repositório.
