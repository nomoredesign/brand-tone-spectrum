# Adding a client

Every client is one JSON file in `clients/`. There is no database and no admin
screen: you add a file, push it, and the client has their own URL.

## The short version

```bash
npm run new-client acme-corp
```

Edit `clients/acme-corp.json`, commit, push, and send the client:

```
https://YOURNAME.github.io/YOUR-REPO/#/c/acme-corp
```

## The whole thing

### 1. Choose a slug

The slug is the part of the URL the client sees, so it should be their name in
lower case with hyphens: `acme-corp`, `carnot-ai`, `blue-harbour`. Lower case
letters, numbers and hyphens only.

The file must be named after the slug it declares. The app refuses to start if
they disagree, which is deliberate: a mismatch means answers could be saved
against the wrong client.

### 2. Make the file

```bash
npm run new-client acme-corp
```

That copies `clients/_template.json` to `clients/acme-corp.json`, fills in the
slug, and makes `public/refs/acme-corp/` for reference images. It refuses to
overwrite a client that already exists.

You can also copy the template by hand. The script only saves typing.

### 3. Fill it in

```json
{
  "schemaVersion": 1,
  "slug": "acme-corp",
  "clientName": "ACME CORP",
  "projectLine": "STRATEGY & DESIGN DIRECTION",
  "dateLine": "MARCH 2026",
  "studio": {
    "name": "NOMOREDESIGN",
    "website": "nomoredesign.co.uk",
    "social": "@nomoredesign",
    "strapline": "Great design, made simple."
  },
  "scale": { "min": 1, "max": 5, "step": 0.5, "snap": false },
  "axes": [
    {
      "id": "feminine-masculine",
      "leftLabel": "Feminine",
      "rightLabel": "Masculine",
      "defaultValue": 3,
      "refs": { "left": [], "right": [] }
    }
  ]
}
```

- **`clientName`, `projectLine`, `dateLine`** appear in the footer, in capitals.
- **`studio`** is the studio block in the footer. It is per client so a white
  label version needs no code change.
- **`scale`** sets the numbers across the top. `step` is how far one arrow key
  press moves the dot. `snap` decides whether dragging lands on those steps or
  runs smoothly between them; the original chart has dots sitting between the
  numbers, so it is off by default.
- **`axes`** are the pairs, in the order they appear.

### Changing the pairs

The eight pairs in the template are a starting point, not a fixed set. Rename
them, reorder them, drop some, add others. A chart can have anything from one
pair to forty.

Each axis needs:

- **`id`** — lower case with hyphens, unique within the file. This is what the
  saved answers are keyed on, so **do not change an id once a client has started
  filling the chart in**. Changing a label is safe at any time; changing an id
  means the answer against the old id is dropped and the pair goes back to its
  starting value. The tool says so in a small message rather than failing.
- **`leftLabel`** and **`rightLabel`** — the two ends.
- **`defaultValue`** — where the dot starts. It has to sit between `min` and
  `max`.
- **`notesPlaceholder`** — optional, the grey prompt inside the notes box.
- **`refs`** — visual references. Leave both lists empty unless you have some.

### 4. Colours and fonts, if the client needs their own

Add a `theme` block. Every key is optional and each one maps to one CSS custom
property, so anything you leave out keeps the studio default.

```json
"theme": {
  "paper": "#F1F0EC",
  "ink": "#171717",
  "muted": "#55564E",
  "track": "#6E7A9A",
  "dot": "#2E3A5C",
  "note": "#DDE7DC",
  "noteBorder": "#4E6B4C",
  "notePlaceholder": "#5A6459",
  "focus": "#2E3A5C",
  "fontDisplay": "'Some Face', Helvetica, sans-serif",
  "fontBody": "'Some Face', Helvetica, sans-serif"
}
```

`clients/demo-studio.json` has a worked example.

**Check the contrast if you change these.** Text has to reach 4.5:1 against what
sits behind it, and the dashed track and the notes border have to reach 3:1
against the paper. The defaults were measured; a new palette needs measuring
too. Any contrast checker will do it, and the axe check in `npm run e2e` catches
text that fails.

Fonts must be ones the client's machine already has, or a stack ending in a
system face. There is no web font loading, which is what keeps the tool working
offline and printing predictably.

### 5. Reference images, if you have them

Put them in `public/refs/acme-corp/` and commit them. Then point at them from
the axis:

```json
"refs": {
  "left": [
    {
      "id": "quiet-swatch",
      "kind": "image",
      "src": "refs/acme-corp/quiet.svg",
      "caption": "Restrained, low contrast, plenty of air",
      "credit": "Optional"
    }
  ],
  "right": []
}
```

`src` is relative to the site root, with no leading slash, so it keeps working
under the repository path on GitHub Pages. `kind` is `image` or `link`; a link
points at a URL instead of a committed file.

Today the chart shows a small count beside any label that has references. The
tray that opens them is phase two.

There is no upload. Images are committed to the repository like everything else.

### 6. Check it

```bash
npm run dev
```

Open `http://localhost:5173/#/c/acme-corp`.

If the file has a mistake in it, the page will say so and the tests will fail
with the reason. Run them before pushing:

```bash
npm test
```

A broken client file fails the build rather than the page, so a client never
sees it.

### 7. Push and send the link

```bash
git add clients/acme-corp.json public/refs/acme-corp
git commit -m "Add Acme Corp"
git push
```

GitHub Actions builds and deploys. When it finishes, send the client:

```
https://YOURNAME.github.io/YOUR-REPO/#/c/acme-corp
```

They fill it in on their own and press **Send to studio**, or download the JSON
file and email it back if you have not set the worker up.

## Keeping an agreed version

When a chart is settled, save the answers as
`clients/acme-corp.answers.json` and commit it.

Get the file from the **Download** button in the toolbar, then rename it. From
then on:

- The page opens on those answers rather than the config defaults.
- **Reset** goes back to them rather than to the defaults.
- Anything in a person's own browser still wins over the committed file, so a
  client's draft is never overwritten by one of yours.

The `slug` inside the answers file has to match the file name and an existing
client, or the build fails.

## Showing it in a meeting

Add `?present=1`:

```
https://YOURNAME.github.io/YOUR-REPO/#/c/acme-corp?present=1
```

That hides the toolbar and stops anything being changed by accident.

## Things worth knowing

- **Answers are kept per client in the browser**, so a client can close the tab
  and come back. They are keyed on the slug and the schema version.
- **A share link carries the answers inside it**, so it works with no server.
  Opening one on a browser that already holds different answers asks which set
  to keep rather than overwriting.
- **The index page at `#/` lists every client.** It is not linked from anywhere
  and is not secret. Do not treat a client's URL as private either: anyone with
  the link can open the chart. There is nothing in it beyond the pairs and
  whatever a person types.
- **Removing a client** is deleting the file. Anything already saved in someone
  else's browser stays there but has nowhere to load.
