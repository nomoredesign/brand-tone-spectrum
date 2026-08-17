# Brand Tone Spectrum

A brand tone spectrum exercise from a studio presentation, made into something a
client can fill in.

Each row is a pair of opposites, from `Feminine` on the left to `Masculine` on
the right, with a dot on a dashed track marked 1 to 5. Beside each row is a
notes box. In the original slide the comments were sticky notes floating over
the chart; here they sit in a fixed column, so nothing overlaps.

One deployment serves every client. Each client is a JSON file in `clients/` and
gets their own URL.

## Running it

```bash
npm install
```

```bash
npm run dev
```

Then open `http://localhost:5173/#/c/carnot-ai`. The index at `#/` lists every
client.

## The commands

| Command                     | What it does                                         |
| --------------------------- | ---------------------------------------------------- |
| `npm run dev`               | The site, with reloading                             |
| `npm run build`             | Type check, then build to `dist/`                    |
| `npm test`                  | Unit tests, for the app and the worker               |
| `npm run e2e`               | The browser tests, including the accessibility check |
| `npm run lint`              | ESLint                                               |
| `npm run format`            | Prettier                                             |
| `npm run typecheck`         | TypeScript, both the app and the worker              |
| `npm run new-client <slug>` | Start a new client from the template                 |
| `npm run worker:dev`        | The submission worker, locally                       |
| `npm run worker:deploy`     | Deploy the worker                                    |

## How it fits together

```
src/
  app/            routes and page shells
  components/     presentational pieces
  features/
    spectrum/     the row, the track, the notes cell
    session/      state, saving, sharing, import and export
    submit/       the send dialog and the inbox
  lib/            encoding, scale maths, small helpers
  styles/         the sheet, the toolbar, the print rules
shared/
  schema.ts       Zod schemas used by the app and the worker alike
worker/           the submission endpoint
clients/          one JSON file per client
public/refs/      reference images, per client
docs/             adding a client, setting the worker up
```

`shared/schema.ts` is imported by both the app and the worker through a path
alias, so a change to the shape of a submission either type checks on both sides
or on neither.

Client configs are bundled at build time with `import.meta.glob`, so a missing
or broken file breaks the build rather than the page in front of a client.

## Four ways to move the answers around

1. **The browser.** Saved automatically after a short pause, and restored on
   return.
2. **A link.** The answers are compressed into the URL. Opening one on a browser
   that already holds different answers asks which set to keep.
3. **A file.** Download the JSON, or load one back in from the button or by
   dropping it anywhere on the page.
4. **Send to studio.** One button at the end, which emails the studio and keeps
   a copy. This is the only part that needs a server.

The first three work with no server at all. If `VITE_SUBMIT_ENDPOINT` is not
set, the send button and the inbox do not appear and everything else is
unchanged.

## Other things it does

- **Printing** puts the chart on one landscape page at slide proportions, with
  the notes as words and no toolbar. Export a PDF through the browser's own
  print dialog.
- **`?present=1`** hides the toolbar and stops anything being edited, for
  showing a finished chart in a meeting.
- **Committed answers.** A `clients/<slug>.answers.json` file becomes the
  starting point for that client, and what reset returns to.

## Accessibility

Every slider names both ends of its pair and reads its position in words, for
example "3 of 5, midway". The dot can be dragged, the track clicked, or the
value moved with the arrow keys, with Home and End for the ends. Every notes box
names its axis. Colours were chosen against measured contrast ratios, and
`npm run e2e` runs axe and fails on any violation.

## Deploying

Pushing to `main` builds and deploys to GitHub Pages. The Vite base path comes
from the repository name at build time, so nothing needs editing after a rename
or a fork.

The worker deploys from the same workflow, but only when something under
`worker/` or `shared/` has changed. It needs a `CLOUDFLARE_API_TOKEN`
repository secret.

## Documents

- [docs/ADDING_A_CLIENT.md](docs/ADDING_A_CLIENT.md) — the whole process for a
  new client, including changing the pairs and theming.
- [docs/SETUP_WORKER.md](docs/SETUP_WORKER.md) — the worker, step by step, with
  what each step costs.

## What is not built yet

The reference tray. Each end of each axis can already hold a list of images and
links, and the chart shows a count beside any label that has some. Opening them
in a tray along the bottom of the screen is phase two.
