# Escritório Júnior Contabilidade — Site

Site institucional estático (HTML/CSS/JS puro, sem build) do Escritório Júnior
de Contabilidade (Umuarama, PR), com uma seção de notícias alimentada
automaticamente por feeds RSS do setor.

## Estrutura

```
index.html         Página inicial
sobre.html          História, missão/visão/valores, sócios
servicos.html       Detalhamento dos serviços
noticias.html       Notícias agregadas (RSS)
contato.html        Endereço, WhatsApp, e-mail, mapa e formulário
assets/css/         Estilos (design system da marca)
assets/js/          Menu mobile e renderização de notícias
assets/img/         Logo recriada em SVG (emblema + wordmark) e favicon
data/news.json      Notícias agregadas (gerado automaticamente)
scripts/fetch-news.mjs           Script Node que busca e normaliza os feeds
.github/workflows/update-news.yml  Job agendado que atualiza data/news.json
```

## Notícias (RSS)

`scripts/fetch-news.mjs` busca os feeds abaixo, sem dependências externas
(usa `fetch` nativo do Node 18+ e um parser leve de RSS/Atom):

- Contábeis — https://www.contabeis.com.br/rss/
- Valor Econômico — https://pox.globo.com/rss/valor
- Banco Central do Brasil — https://www.bcb.gov.br/api/feed/sitebcb/sitefeeds/noticias?ano=2024

O resultado é salvo em `data/news.json`, lido pelo front-end em
`assets/js/news.js` (usado tanto na prévia da home quanto na página completa
de notícias, com filtro por fonte).

Para atualizar manualmente:

```bash
node scripts/fetch-news.mjs
```

O workflow `.github/workflows/update-news.yml` roda a cada 6 horas (e sob
demanda) e faz commit automático de `data/news.json` quando há notícias
novas.

## Identidade visual

A logomarca foi recriada em SVG (`assets/img/logo-mark.svg`,
`logo-full.svg` e `favicon.svg`) a partir da imagem enviada, mantendo a
paleta (fundo escuro + prata/dourado) e a composição (emblema geométrico +
"ESCRITÓRIO JÚNIOR" + "CONTABILIDADE"). Caso o arquivo original da logo
esteja disponível (PNG/SVG vetorizado), basta substituir os arquivos em
`assets/img/` mantendo os mesmos nomes.

## Conteúdo

O conteúdo institucional (história, sócios, serviços, endereço e contatos)
foi reconstruído a partir de informações públicas do escritório, já que o
acesso direto ao site atual não estava disponível neste ambiente. Recomenda-se
revisar textos, número de telefone fixo e redes sociais antes de publicar.

## Publicação

Site 100% estático — pode ser publicado em qualquer hospedagem estática
(GitHub Pages, Netlify, Vercel, etc.), sem passo de build.
