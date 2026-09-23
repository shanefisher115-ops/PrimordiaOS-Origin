# Primordial Origin

Official production website for `primordialorigin.com`, built with Next.js 14 App Router, TailwindCSS, and Framer Motion.

## What is included

- Home page with cosmic PrimordiaOS hero
- PrimordiaOS overview page
- Features page with all Copilot artifact modules
- Downloads page
- Contact page
- API Integration Demo page for the OS -> Cloud -> OS feedback loop
- Reusable cosmic UI component library
- Cloud Run API utility: `postBrowserContext(context)`

## Local setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Docker workflow

This repo now includes a Docker-based workflow for isolated builds, source mounts, and artifact capture.

### Development container

```bash
docker compose up app
```

The app runs on `http://localhost:3000` with your source mounted into the container.

### Production build

```bash
docker compose run --rm build
```

Build logs are streamed to `./artifacts/build.log`, and the build cache is preserved in Docker volumes for faster rebuilds.

### Direct image build

```bash
docker build -t primordial-origin:latest .
```

### Notes for Unreal-side integration

If you later point this workflow at an Unreal Engine project, the same pattern works well with:

- a larger Unreal base image or a mounted engine install
- cached dependency layers for engine plugins and project prerequisites
- a headless build command in CI
- shared artifact volumes for packaged builds, logs, and cooked content

## Production build

```bash
npm run build
npm run start
```

## Vercel deployment

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In Vercel, choose **Add New Project**.
3. Import the repository.
4. Keep the defaults:
   - Framework Preset: `Next.js`
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Deploy.

CLI alternative:

```bash
npm i -g vercel
vercel
vercel --prod
```

## Connect `primordialorigin.com` to Vercel

1. Open the Vercel project.
2. Go to **Settings -> Domains**.
3. Add `primordialorigin.com`.
4. Add `www.primordialorigin.com` if you want the `www` alias.
5. In your DNS provider, set the apex record:
   - Type: `A`
   - Name: `@`
   - Value: `76.76.21.21`
6. Add the `www` record:
   - Type: `CNAME`
   - Name: `www`
   - Value: `cname.vercel-dns.com`
7. Wait for Vercel to issue SSL certificates and mark the domain as valid.

## Cloud Run API integration

The integration is implemented in `lib/api.ts`:

```ts
postBrowserContext(context)
```

The demo page posts to:

```txt
https://primordia-api-560206548182.us-central1.run.app/api/browser/context
```

The request intentionally sends only explicit website context:

```json
{
  "source": "primordialorigin.com",
  "page": "api-demo",
  "signal": "Visitor is exploring the PrimordiaOS public command surface.",
  "intent": "Recommend the next official action for the website operator.",
  "timestamp": "ISO timestamp"
}
```

No browser metadata or tab information is collected or transmitted by the site code.

The response is expected to include:

```json
{
  "nextAction": "..."
}
```

`CosmicActionFeed` displays the returned `nextAction` and a short local log of the loop.
