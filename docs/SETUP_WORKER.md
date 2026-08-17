# Setting up the submission worker

The worker is the only server side part of this project. It accepts a finished
set of answers, keeps a copy, and emails the studio. The app works without it:
with no endpoint configured, the send button and the inbox link do not appear,
and every other way of moving the answers still works.

The values in `worker/wrangler.toml` are already filled in for this repository:

- `ALLOWED_ORIGINS` includes `https://nomoredesign.github.io`
- `APP_URL` is `https://nomoredesign.github.io/brand-tone-spectrum/`
- `FROM_EMAIL` is `onboarding@resend.dev`, which Resend lets you send from
  without verifying a domain, as long as you send to your own address

So what is left is a Cloudflare account, three secrets, and a deploy. At this
volume every step is free on both Cloudflare's and Resend's free tiers.

## 1. Log in to Cloudflare

```bash
npx wrangler login
```

This opens a browser and asks you to authorise Wrangler. It cannot be done for
you, which is why the rest of this document exists.

## 2. Create the storage

Submissions are kept in Cloudflare KV for a year.

```bash
npm run worker:setup
```

That creates the namespace and writes its id into `worker/wrangler.toml` for
you. It refuses to run twice, and it never touches the secrets.

If you would rather do it by hand, `npx wrangler kv namespace create SUBMISSIONS`
prints an id to paste in yourself.

**Cost:** free. The free tier covers 100,000 reads and 1,000 writes a day, and
1 GB of storage. One submission is one write.

## 3. Set the three secrets

Run these yourself. Each asks for the value, does not echo it, and stores it in
the worker, so nothing lands in your shell history or in this repository.

```bash
npx wrangler secret put RESEND_API_KEY --config worker/wrangler.toml
```

```bash
npx wrangler secret put STUDIO_TOKEN --config worker/wrangler.toml
```

```bash
npx wrangler secret put NOTIFY_EMAIL --config worker/wrangler.toml
```

- **`RESEND_API_KEY`** comes from Resend, under API Keys. Sending permission is
  enough.
- **`STUDIO_TOKEN`** is a password you invent. It is the only thing between
  anyone and every submission, so make it long and random. This prints one:

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
  ```

- **`NOTIFY_EMAIL`** is the address to tell when a client finishes.

**Cost:** free.

## 4. Deploy

```bash
npm run worker:deploy
```

Wrangler prints the worker's URL, something like
`https://brand-tone-submit.<your-subdomain>.workers.dev`.

Check it answers, putting your own URL in:

```bash
curl -s -H "Origin: https://nomoredesign.github.io" https://brand-tone-submit.YOUR-SUBDOMAIN.workers.dev/health
```

You should get `{"ok":true,"schemaVersion":1}`. Without the `Origin` header you
get a 403, which is the origin check doing its job.

**Cost:** free. The free tier covers 100,000 requests a day.

## 5. Tell the site where the worker is

The app reads the endpoint at build time. Add it as a repository **variable**,
not a secret: it ends up in the browser bundle either way, and a secret would
only make that harder to see.

```bash
gh variable set VITE_SUBMIT_ENDPOINT --body "https://brand-tone-submit.YOUR-SUBDOMAIN.workers.dev"
```

Or through the web: repository settings, Secrets and variables, Actions, the
Variables tab, New repository variable.

No trailing slash. Push anything to `main` after that and the send button and
the inbox link appear on the next deployment.

For local development, put the same line in `.env.local`, which git ignores:

```
VITE_SUBMIT_ENDPOINT=https://brand-tone-submit.YOUR-SUBDOMAIN.workers.dev
```

Note that `.env.local` also affects `npm run e2e`, which builds the site before
running. One test checks that no send button appears without an endpoint, and it
will fail while that file exists.

## 6. Let continuous integration deploy the worker

The workflow has a job that deploys the worker whenever something under
`worker/` or `shared/` changes. It skips quietly until a token exists.

Make a token at **dash.cloudflare.com → My Profile → API Tokens**, using the
_Edit Cloudflare Workers_ template, then add it as a repository secret:

```bash
gh secret set CLOUDFLARE_API_TOKEN
```

That command asks for the value rather than taking it on the command line.

## 7. Verify the domain in Resend, when you want your own address

Until then, `onboarding@resend.dev` will only deliver to the address on your
Resend account. To send from `nomoredesign.co.uk`, add the domain in Resend, add
the DNS records it gives you, and change `FROM_EMAIL` in `worker/wrangler.toml`.

Until a domain is verified, `POST /submit` still stores the submission and still
returns success, but no email arrives. This is deliberate: an email that will not
send is not a reason to tell a client their work was lost. The response body says
`"emailed": false` when that happens.

**Cost:** free. Resend's free tier covers 3,000 emails a month and 100 a day.

## 8. Try it

Open a client page, fill something in, and press send. You should get an email,
and the submission should appear at
`https://nomoredesign.github.io/brand-tone-spectrum/#/inbox` once you paste the
studio token in. The link at the bottom of the email opens the same answers in
the tool.

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
  `STUDIO_TOKEN`. Press Forget token on the inbox page and paste it again.
- **429 while testing.** You have sent ten in an hour from one address. Wait, or
  raise `PER_HOUR` in `worker/src/index.ts`.
