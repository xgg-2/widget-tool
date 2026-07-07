# Discord Widget Identity Tool

A web-based alternative to the PowerShell/curl step in Discord widget setup guides.

This repo has two parts:

1. `worker.js` - a Cloudflare Worker that relays one fixed Discord API call. Browsers cannot call Discord's API directly because Discord does not send CORS headers, so this Worker exists to get around that.
2. `public/index.html` - a plain page with a form for Application ID, User ID and Bot Token.

## What it does

It sends the one-time PATCH request needed for the Application Identity step of Discord widget setup. It does not design your widget, and it does not update your widget's live data after this.

## Security

- The Worker does not store or log anything. No database, no KV.
- The Worker only accepts requests from the exact frontend domain set in ALLOWED_ORIGIN.
- The Worker can only call one fixed Discord endpoint with PATCH. Nothing else.
- Inputs are validated before anything is sent to Discord.
- The bot token is used once, in memory, for one request, and never stored.

## Deploying your own copy

### 1. Deploy the Worker

Install wrangler on a computer (not Termux/Android, it is not supported there):

```
npm install -g wrangler
wrangler login
```

Edit worker.js and set ALLOWED_ORIGIN to your Pages URL from step 2:

```
const ALLOWED_ORIGIN = "https://your-project.pages.dev";
```

Then deploy:

```
wrangler deploy
```

Copy the workers.dev URL it gives you.

Alternative without wrangler: create the Worker directly from the Cloudflare dashboard (Workers and Pages, Create Worker), paste the contents of worker.js into the editor, edit ALLOWED_ORIGIN, and deploy.

### 2. Deploy the frontend

Connect this repo to Cloudflare Pages. Set the build output directory to `public`. Leave the build command empty.

Edit public/index.html and set:

```
const WORKER_URL = "https://your-worker.your-subdomain.workers.dev";
```

Redeploy after editing.

### 3. Rate limiting

Add a Rate Limiting Rule on the Worker's route from the Cloudflare dashboard, for example 10 requests per minute per IP.

## Validation rules

| Input | Rule |
|---|---|
| applicationId | must match ^\d{15,25}$ |
| userId | must match ^\d{15,25}$ |
| botToken | 20-100 characters, no whitespace |
| Request origin | must exactly equal ALLOWED_ORIGIN |
| Payload size | rejected above 2KB |

## License

MIT
