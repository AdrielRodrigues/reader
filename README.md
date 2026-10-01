# reader

Leitor de código de barras que roda no navegador e valida se o código lido está em uma lista.
Site estático (sem build), pensado para o GitHub Pages.

## Uso

1. Edite a lista padrão em [codes.js](codes.js) (ou edite pela própria página; fica salva só no navegador).
2. Abra a página, toque em **Iniciar câmera** e aponte para o código de barras.
3. O resultado aparece em verde (válido) ou vermelho (não encontrado). Também há campo para digitar o código.

Formatos: EAN-13/8, UPC-A/E, Code 128/39/93, ITF, Codabar e QR.

## Publicar no GitHub Pages

Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)`.
A câmera exige HTTPS, que o GitHub Pages já fornece.

## Testar localmente

```
python3 -m http.server 8000
```
Abra `http://localhost:8000` (localhost conta como contexto seguro).

## Dependências

[html5-qrcode](https://github.com/mebjas/html5-qrcode) 2.3.8, copiada em `vendor/` (não depende de CDN).
