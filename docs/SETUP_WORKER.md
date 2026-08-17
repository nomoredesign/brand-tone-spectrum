# Setting up the submission worker

The worker is the only server side part of this project. It accepts a finished
set of answers, keeps a copy, and emails the studio. The app works without it:
with no endpoint configured, the send button and the inbox link do not appear,
and every other way of moving the answers still works.

Do these steps in order. At this volume every step is free, on both Cloudflare's
and Resend's free tiers. The notes below say what each one costs and where the
free allowance runs out.

## Before you start

You need a Cloudflare account and a Resend account. Both are free to open.

Log Wrangler in once:

```bash
npx wrangler login
```

## 1. Create the storage

Submissions are kept in Cloudflare KV for a year.

```bash
npx wrangler kv namespace create SUBMISSIONS
```

It prints an id. Put that id in `worker/wrangler.toml`, replacing
`replace-with-your-kv-namespace-id`:

```toml
[[kv_namespaces]]
binding = "SUBMISSIONS"
id = "the-id-it-printed"
```

**Cost:** free. The free tier covers 100,000 reads and 1,000 writes a day, and
1 GB of storage. One submission is one write.

## 2. Set the three secrets

Secrets live in the worker and are never written into `wrangler.toml` and never
reach the browser. Each command asks for the value and does not echo it.

```bash
npx wrangler secret put RESEND_API_KEY --config worker/wrangler.toml
```

```bash
npx wrangler secret put STUDIO_TOKEN --config worker/wrangler.toml
```

```bash
npx wrangler secret put NOTIFY_EMAIL --config worker/wrangler.toml
```

- `RESEND_API_KEY` comes from Resend, under API Keys. Sending permission is
  enough.
- `STUDIO_TOKEN` is a password you make up. It is the only thing standing
  between anyone and every submission, so make it long and random. This command
  prints one you can paste in:

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
  ```

- `NOTIFY_EMAIL` is the address that should be told when a client finishes.

**Cost:** free.

## 3. Set the three plain settings

These are not secret, so they live in `worker/wrangler.toml` under `[vars]`.
Edit them before deploying:

- `ALLOWED_ORIGINS` — a comma separated list. Only these may call the worker;
  anything else is refused rather than echoed back. Include the GitHub Pages
  address and `http://localhost:5173` for development, for example:

  ```toml
  ALLOWED_ORIGINS = "https://YOURNAME.github.io,http://localhost:5173,http://localhost:4319"
  ```

  Use the origin only: the scheme and the host, with no path and no trailing
  slash. A Pages project site is served from `https://YOURNAME.github.io`, so
  that is the origin even though the tool sits under a repository path.

- `FROM_EMAIL` — the address the notification is sent from. It must be on a
  domain you have verified in Resend, or the mail will not leave.

- `APP_URL` — where the tool lives, used to build the links in the email, for
  example `https://YOURNAME.github.io/YOUR-REPO/`.

## 4. Verify your domain in Resend

In Resend, add your domain and add the DNS records it gives you. Until the
domain shows as verified, `POST /submit` still stores the submission and still
returns success, but no email arrives. This is deliberate: an email that will
not send is not a reason to tell a client their work was lost.

Resend also allows sending to your own address from `onboarding@resend.dev`
without a domain, which is enough to try the whole path end to end before you
set DNS up.

**Cost:** free. Resend's free tier covers 3,000 emails a month and 100 a day.

## 5. Deploy

```bash
npm run worker:deploy
```

Wrangler prints the worker's URL, something like
`https://brand-tone-submit.YOURNAME.workers.dev`.

Check it answers:

```bash
curl -s -H "Origin: http://localhost:5173" https://brand-tone-submit.YOURNAME.workers.dev/health
```

You should get `{"ok":true,"schemaVersion":1}`. Without the `Origin` header you
get a 403, which is the origin check doing its job.

**Cost:** free. The free tier covers 100,000 requests a day.

## 6. Tell the site where the worker is

The app reads the endpoint from `VITE_SUBMIT_ENDPOINT` at build time.

For GitHub Pages, add it as a repository **variable**, not a secret, because it
ends up in the browser bundle either way and a secret would only make that
harder to see:

1. Repository settings, then Secrets and variables, then Actions.
2. The Variables tab, then New repository variable.
3. Name `VITE_SUBMIT_ENDPOINT`, value the worker URL with no trailing slash.

Push to `main`, and the workflow builds with it. The send button and the inbox
link appear on the next deployment.

For local development, put it in a `.env.local` file, which git ignores:

```
VITE_SUBMIT_ENDPOINT=https://brand-tone-submit.YOURNAME.workers.dev
```

## 7. Try it

Open a client page, fill something in, and press send. You should get an email,
and the submission should appear at `#/inbox` once you paste the studio token
in. The link at the bottom of the email opens the same answers in the tool.

## Running the worker locally

```bash
npm run worker:dev
```

That serves the worker on `http://localhost:8787` against a local copy of KV.
Put the secrets in `worker/.dev.vars`, which git ignores:

```
RESEND_API_KEY=re_...
STUDIO_TOKEN=any-value-for-development
NOTIFY_EMAIL=you@example.com
```

## What the worker will and will not do

- It accepts nothing but a submission that passes the shared schema, from an
  origin on the list, up to 256 KB, ten an hour from one address.
- It sets the received time and the submission id itself and ignores any the
  browser sends.
- It writes only the client slug, the submission id and the result to its logs.
  The notes are confidential client material and never appear there.
- The endpoint address is public, because everything in a browser bundle is.
  That is acceptable: the endpoint accepts only a validated submission and is
  rate limited. If spam ever arrives, the next step is Cloudflare Turnstile in
  front of `/submit`; `passesChallenge` in `worker/src/index.ts` is the single
  place that check goes.

## If something goes wrong

- **403 on every request.** The calling origin is not in `ALLOWED_ORIGINS`. It
  must match exactly, with no trailing slash.
- **The submission stores but no email arrives.** The domain is not verified in
  Resend, or `FROM_EMAIL` is on a domain you do not own. The response body has
  `"emailed": false` when this happens.
- **401 on the inbox.** The studio token in the browser does not match
  `STUDIO_TOKEN`. Clear it on the inbox page and paste it again.
- **429 while testing.** You have sent ten in an hour from one address. Wait, or
  raise `PER_HOUR` in `worker/src/index.ts`.
