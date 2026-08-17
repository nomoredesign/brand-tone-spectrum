# Build prompt: Brand Tone Spectrum tool

Paste everything below into a coding agent in an empty repository.

---

## What to build

Build a small web app that recreates a brand tone spectrum exercise from a studio
presentation. The screen shows a list of paired opposites, e.g., "Feminine" on the
left and "Masculine" on the right. Each pair has a horizontal track marked 1 to 5
with a draggable dot on it. Next to each track there is a notes area where a person
types comments about that pair. In the original presentation the comments were sticky
notes floating over the chart. In this tool the comments live in a fixed column on
the right of each row, so nothing overlaps.

The app serves several clients from one deployment. Each client is a JSON file in the
repository, and each client has its own URL.

Two kinds of people use it. A client fills it in on their own, then sends the results
back. The studio also opens it in a live workshop, fills it in while talking to the
client, and edits the client's answers afterwards.

The web app itself is static, with no server rendering and no login. The one exception
is a single small Cloudflare Worker. Its only job is to accept a finished set of
answers, email the studio and keep a copy so the studio can look at past submissions.
The app works without it. If the endpoint is not configured, hide the send button and
leave every other way of moving the answers in place.

## Fixed decisions

Do not substitute alternatives for these. If you think one is wrong, say so in your
plan and wait for an answer.

- Vite, React and TypeScript in strict mode.
- Tailwind CSS for styling, with the palette and fonts defined as CSS custom
  properties so a client config can override them.
- Zod for validating every client config and every file a person imports.
- Vitest and React Testing Library for unit tests. Playwright for one end to end test.
- ESLint and Prettier, both run in continuous integration.
- Hosting is GitHub Pages, built and deployed by a GitHub Actions workflow on every
  push to `main`.
- Routing uses `HashRouter` from React Router. GitHub Pages does not serve deep paths
  on a single page app without a workaround. With hash routes you do not have that
  problem.
- One Cloudflare Worker, written in TypeScript and deployed with Wrangler, handles
  submissions. It stores them in Cloudflare KV and sends email through Resend. It is
  the only server side code in the project.
- No login for clients, no content management system, no analytics and no third party
  drag and drop library.

## Repository layout

```
src/
  app/            routes and page shells
  components/     presentational components
  features/
    spectrum/     slider row, track, dot, notes panel
    session/      state, saving, import, export
    submit/       the send to studio dialog and the studio inbox
  lib/            encoding, small helpers
  styles/
shared/
  schema.ts       Zod schemas used by both the app and the worker
worker/
  src/index.ts    the submission endpoint
  wrangler.toml
clients/
  _template.json  copy this to add a client
  carnot-ai.json
public/
  refs/<slug>/    reference images for a client, committed to the repository
.github/workflows/
docs/
  ADDING_A_CLIENT.md
  SETUP_WORKER.md
```

Keep the schemas in `shared/` and import them from both sides through a TypeScript
path alias. The worker and the app then agree on the shape of a submission, and a
change to the schema cannot break one side without breaking the other's type check.

Load the client configs with `import.meta.glob('/clients/*.json', { eager: true })`.
If you bundle them at build time, a missing or broken file breaks the build instead
of breaking the page in front of a client.

## Data model

Write these as Zod schemas in `shared/schema.ts` and derive the TypeScript types
from them. Every schema has a `schemaVersion` number so you can migrate old saved
data later.

**Client config.** One file per client in `clients/`.

- `schemaVersion`, a number.
- `slug`, a string used in the URL, e.g., `carnot-ai`.
- `clientName`, e.g., `CARNOT AI`.
- `projectLine`, e.g., `STRATEGY & DESIGN DIRECTION`.
- `dateLine`, e.g., `MARCH 2026`.
- `studio`, an object holding the studio name, website, social handle and the strap
  line shown in the bottom right of the original slide.
- `theme`, an optional object of colour and font overrides.
- `scale`, an object with `min`, `max`, `step` and `snap`. Default to a minimum of 1,
  a maximum of 5, a step of 0.5 and snapping turned off. The dots in the original
  sit between the numbers as well as on them, so the value is not limited to whole
  numbers.
- `axes`, an ordered array. Each axis has an `id`, a `leftLabel`, a `rightLabel`, a
  `defaultValue` and an optional `notesPlaceholder`. Each axis also has a `refs`
  object described in the reference tray section below.

**Answers.** This is the data a person creates by using the tool.

- `schemaVersion` and `slug`, so an imported file cannot be applied to the wrong
  client.
- `savedAt`, an ISO date string.
- `author`, an optional free text name so the studio knows whose file it is.
- `values`, a map from axis id to a number.
- `notes`, a map from axis id to a string.

Ignore any axis id in an imported file that the current config does not contain, and
fall back to `defaultValue` for any axis the file does not mention. Report both cases
to the person in a small message rather than failing.

**Submission.** This is what the app sends to the worker.

- `answers`, one whole answers object as described above.
- `author`, the name the person typed in the send dialog. This one is required.
- `message`, an optional short note to the studio.
- `clientName` and `axisLabels`, copied from the config, so the email can read
  properly without the worker needing the client files.
- `sentFrom`, the page URL the person sent from.

The worker adds the received time and a submission id itself. Do not trust either of
those from the browser.

## Screens

**Index route, `#/`.** A plain list of every client found in `clients/`, each linking
to that client's page. This page is only for the studio, so keep it simple.

**Client route, `#/c/:slug`.** The tool itself. An unknown slug shows a short "no such
client" page with a link back to the index.

**Inbox route, `#/inbox`.** A studio only page that lists submissions received by the
worker. It asks for the studio token, keeps it in `localStorage`, and shows the client
name, the author, the time and the message for each submission. Each row has a button
that opens those answers in the tool. Hide this route from the index page when no
endpoint is configured.

## Layout of the client page

Reproduce the composition of the original slide. Read the reference image if one is
supplied, and otherwise follow this description.

- The page is a wide sheet on a cream background with a lot of white space.
- Top left holds a small two line label, e.g., `02 BRAND FOUNDATIONS` above
  `BRAND TONE`. Both are set in small upper case letters with wide spacing.
- A larger heading sits at the top centre, e.g., `BRAND TONE`, and the word
  `Spectrum` sits below the top left label in a larger size.
- The numbers 1 to 5 run across the top of the chart area as column markers.
- Each row has three parts. The left label is right aligned against the track. The
  track is a horizontal dashed line with a solid round dot on it. The right label is
  left aligned after the track. Use a CSS grid so every row shares the same column
  widths and all the dashes line up.
- The notes column sits to the right of the right hand label, at a fixed width. Each
  cell is a small text area with a soft filled background, in the salmon pink used by
  the sticky notes in the original. The cell gets taller as a person types, and every
  row keeps the same height as the tallest one so the grid stays even.
- The footer has four blocks across the bottom. They hold the client and project
  lines, the studio details, the studio logo mark and the strap line.

Make the whole thing work down to a tablet width. Below that, stack each row so the
labels sit above the track and the notes sit under it. Do not attempt a phone
optimised drag interaction beyond making the native slider usable.

## Behaviour

- A person sets a value by dragging the dot, by clicking anywhere on the track or by
  focusing the track and using the arrow keys. Home and End jump to the ends.
- Build the track on a native `<input type="range">` with its default appearance
  removed and the dashed line and dot drawn with CSS. A native range input already
  handles keyboard and touch input, and it already works with a screen reader.
- Show the current value near the dot, or in a tooltip on hover and focus. Keep it
  quiet so it does not spoil the look of the slide.
- Typing in a notes cell updates the saved answer after a short pause, so you are not
  writing to storage on every key press.
- A small toolbar sits in one corner and is hidden when printing. It holds these
  actions:
  - send to studio, described in its own section below
  - reset to the starting values
  - copy a share link
  - download the answers as JSON
  - load a JSON file
  - print
- Loading a JSON file works both from a file picker and by dropping the file anywhere
  on the page.
- Respect `prefers-reduced-motion` and drop the dot's movement animation when it is
  set.

## Saving and sharing

A person can move the answers around in four ways. The fourth one is the send button,
and it has its own section after this. Build the first three first, because they are
also what the app falls back to when a send fails.

1. **The browser.** Save the answers to `localStorage` under a key built from the
   slug and the schema version. Restore them when the page loads. Show a quiet
   "saved" indicator so a person knows their work is kept.
2. **A link.** Encode the answers into the URL hash, compressed with `lz-string`, so
   a person can send their filled in version to someone else. When someone opens a
   link like this, do not overwrite what is already saved in their browser. Show a
   small message that offers to keep the current answers or to use the ones from the
   link, and wait for the answer.
3. **A file.** Download and upload the answers as JSON. This is how a client sends
   their version back to the studio.

The studio can also commit an agreed version to the repository as
`clients/<slug>.answers.json`. When that file exists, the page starts from it instead
of from the config defaults. The page still prefers anything saved in the browser over
that file. When a committed file exists, reset goes back to it rather than to the
config defaults.

Add a read only mode, turned on with `?present=1` in the URL, that hides the toolbar
and prevents editing. The studio uses it to show the finished chart in a meeting.

## Telling the studio when a client has finished

The client presses one button when they are done, and the studio gets an email. Do not
send anything while the client is still typing. One clear message at the end is what
the studio wants.

### In the app

- The send button opens a small dialog asking for the person's name and an optional
  message. The name is required, because the studio needs to know who filled it in.
- On confirm, POST the submission as JSON to the endpoint in
  `import.meta.env.VITE_SUBMIT_ENDPOINT`. Show a pending state, then either a success
  message or a failure message.
- When the send fails, say so plainly and offer the two fallbacks in the same message.
  These are downloading the JSON file and copying the share link. Never lose the
  client's work because a request failed.
- When the send succeeds, record the time in `localStorage` and show it, e.g., "Sent
  to the studio on 17 August at 14:20". Leave the button available so the client can
  send an updated version, and label it "send again" once one has gone.
- When `VITE_SUBMIT_ENDPOINT` is empty or missing, hide the send button and the inbox
  link. Every test that does not concern sending must pass with no endpoint set.

### In the worker

Write it as a single small module with no framework. Handle these routes:

- `POST /submit`. Validate the body against the shared submission schema. Reject a
  body over 256 KB. Store it in KV under a key of `sub:<slug>:<received time>:<id>`
  with a time to live of one year. Send the email. Return the submission id.
- `GET /submissions?slug=<slug>`. Require the studio token in an `Authorization`
  header. Return the stored submissions, newest first. This is what the inbox page
  calls.
- `GET /submissions/:id`. Same token rule. Returns one full submission.
- `OPTIONS` on all of the above, answered with the CORS headers and status 204.

Rules for the worker:

- Allow requests only from the origins listed in an `ALLOWED_ORIGINS` variable. Include
  the GitHub Pages address and `http://localhost:5173` for development. Reject any
  other origin rather than echoing it back.
- Rate limit `/submit` by IP address, e.g., ten submissions an hour, using a KV counter
  with a time to live. Return status 429 when a caller goes over.
- Keep every secret in the worker. These are the Resend API key, the studio token and
  the notification email address. Set them with `wrangler secret put`. Nothing secret
  goes in `wrangler.toml`, and nothing secret goes in the browser bundle.
- Do not write the note text into the worker logs. The answers are confidential client
  material, so log only the slug, the submission id and the result.
- The email says which client and which person, includes the message, lists each axis
  with its value and note as plain text, and ends with a link that opens the answers in
  the tool. Build that link with the same compression the share link uses, and put the
  inbox link next to it.

### Security note to keep in mind

Anything in the browser bundle is public, including the endpoint address. That is
acceptable, because the endpoint accepts nothing but a validated submission and is
rate limited. If spam ever arrives, the next step is Cloudflare Turnstile in front of
`/submit`. Write the handler so that check can be added in one place later.

### Setup document

Write `docs/SETUP_WORKER.md` with the exact steps in order. Create the KV namespace.
Set the three secrets. Deploy with Wrangler. Copy the worker URL into the
`VITE_SUBMIT_ENDPOINT` build variable for GitHub Pages. Verify the domain in Resend
before expecting email to arrive. State what each step costs, which at this volume is
nothing on either free tier.

## Printing

Write a print stylesheet that puts the chart on one landscape page at the same
proportions as a presentation slide. Notes appear as plain text rather than as text
areas, and the toolbar is hidden. A person exports a PDF through the browser's own
print dialog, so there is no PDF library to maintain.

## Reference tray, phase two

Build the data model and the types for this now. Leave the interface until phase one
is finished and reviewed.

Each end of each axis can hold a list of visual references, so a person can see what
"Playful" means as opposed to "Serious". Put this on the axis as a `refs` object with
a `left` array and a `right` array. Each reference has an `id`, a `kind` of either
`image` or `link`, a `src` path or URL, an optional `thumb`, a `caption` and an
optional `credit`.

In phase one, read this data and show a small count next to any label that has
references. In phase two, a person clicks the label and a tray opens along the bottom
of the screen, showing those references as a row of thumbnails. Clicking a thumbnail
shows it larger. Build the tray as one component that takes a list of references. In
phase two you then add that component and the state that opens and closes it, and you
change nothing else.

Images live in `public/refs/<slug>/` and are committed to the repository. There is no
upload feature. The worker accepts submissions only, and adding file storage is out of
scope.

## Accessibility

- Every slider has an accessible name that states both ends of the pair, e.g.,
  "Feminine to Masculine". Set `aria-valuetext` to something a person can understand,
  e.g., "3 of 5, midway".
- Every notes area has a visible or screen reader label naming its axis.
- Text and interface colours meet WCAG AA contrast. Check the pale lavender track and
  the pink notes background, and darken them if they fail.
- Every action works with a keyboard alone, and focus outlines are visible.
- Run `axe` in the Playwright test and fail the build on any violation.

## Quality bar

- TypeScript strict mode with no `any` and no non null assertions in application
  code.
- No component holds more than one concern. The row, the track, the notes cell and
  the toolbar are separate files.
- Keep the session state in one place, e.g., a small reducer with a context provider
  or a single Zustand store. Do not thread values through many layers of props.
- Unit tests cover the schema validation, the URL encoding and decoding, the saving
  and restoring, the merge of an imported file against a config, and the keyboard
  behaviour of the slider.
- Test the send path with a mocked `fetch`. Cover a success, a network failure and a
  rejected body, and check that the failure message offers both fallbacks.
- Test the worker with Vitest and `@cloudflare/vitest-pool-workers`. Cover a valid
  submission, an invalid body, a body over the size limit, a request from an origin
  that is not allowed, a request to `/submissions` with no token, and the rate limit.
- One Playwright test covers the main path. It loads a client, moves a slider, types
  a note, reloads the page, checks both survived, copies a share link and opens it in
  a fresh context. Intercept the send request in this test rather than calling the
  real endpoint.
- The GitHub Actions workflow runs the type check, the linter and the tests on every
  pull request, and builds and deploys to Pages on every push to `main`. Add a separate
  job that deploys the worker with Wrangler, triggered only when something under
  `worker/` or `shared/` has changed, using a `CLOUDFLARE_API_TOKEN` repository secret.
- Set the Vite `base` option from the repository name so the built assets resolve
  correctly on GitHub Pages.

## Adding a client

Write `docs/ADDING_A_CLIENT.md` covering the whole process. Copy
`clients/_template.json` to `clients/<slug>.json`. Fill in the names and the axes.
Add any reference images to `public/refs/<slug>/`. Commit and push, then send the
client the link `https://<user>.github.io/<repo>/#/c/<slug>`. Also write a script,
`npm run new-client <slug>`, that does the copying and the folder creation.

## Definition of done for phase one

- The chart matches the reference composition at a desktop width, and reads clearly
  at a tablet width.
- Both example clients load from `clients/` and each has its own URL.
- Values and notes survive a reload, a share link and a download followed by an
  upload.
- A send from the live site arrives as an email, appears in the inbox page, and the
  link in the email opens the same answers in the tool.
- With no endpoint configured, the app still works and no send button appears.
- The whole page can be operated with a keyboard, and the axe check passes.
- Printing produces one clean landscape page.
- Continuous integration is green and the site is live on GitHub Pages.

## How to work

Start by writing a short plan and a task list, then ask about anything in this brief
that is unclear before you write code. Build in this order.

1. The scaffold and the continuous integration workflow.
2. The shared schema and the client loading.
3. The chart layout with static data.
4. The interaction and the state.
5. The saving, the sharing and the file import and export.
6. The printing.
7. The worker, its tests and its setup document.
8. The send dialog and the inbox page.

Then stop and ask for a review before starting the reference tray.

Commit in small steps with a clear message for each one. After each step, say what
you built and what is left. Do not add features that are not in this brief.
