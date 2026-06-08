# xwcz

Clone foundation for xwcz.org using the existing public API instead of creating a new backend.

## Structure

- `packages/api-client`: shared API client and media URL helpers.
- `apps/web`: browser prototype that clones the main content flows.
- `apps/weixin`: Weixin Mini Program skeleton using the same endpoint model.

## Existing API

Base URL:

```text
https://api.xwcz.org/api/v1/
```

Every GET request currently includes:

```text
client=h5
v=2
```

Media hosts:

```text
https://v.xwcz.org/
https://v2.xwcz.org/
https://live.xwcz.org/
```

## Run Web Prototype

```powershell
cd xwcz
npm install
npm run serve:web
```

## Publish Web Prototype to GitHub Pages

The repository includes a GitHub Actions workflow that publishes `apps/web` to GitHub Pages on every push to `main`.

In GitHub, open the repository settings and set:

```text
Pages -> Build and deployment -> Source -> GitHub Actions
```

Then push `main`. The site will be served at:

```text
https://<your-github-user>.github.io/xwcz/
```

## Weixin Setup Notes

Configure these legal domains in the Mini Program console:

```text
request:  https://api.xwcz.org
download: https://v.xwcz.org, https://v2.xwcz.org
media:    https://v.xwcz.org, https://v2.xwcz.org, https://live.xwcz.org
```

The Weixin app currently contains a minimal native shell. The next step is to fill in the same pages as the web prototype: home, category/album list, player, article detail, search, and live.
