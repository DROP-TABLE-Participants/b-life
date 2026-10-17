# Design Approach — How to Think, Decide and Work

A portable guide to how I design interfaces: the principles, preferred styles, recurring patterns and working habits. It's product-agnostic. Apply it to whatever you are designing, adapted to that product's own brand and component library.

---

## 1. Core beliefs

1. **Calm beats loud.** Neutral ink on white surfaces carries the content. Colour is a signal, never decoration. If most of the screen is coloured, the colour has stopped meaning anything.
2. **Hierarchy comes from structure, not containers.** Use alignment, spacing, type weight and size to group and rank. Avoid boxes inside boxes inside boxes. One level of card is usually enough; inside it, use dividers and whitespace.
3. **Show the essential first, reveal the rest on demand.** Content-rich screens shouldn't show everything at once. Collapse, toggle or defer secondary content (history, details panels, older comments, advanced options).
4. **Design every state.** Default, hover, focus, selected, disabled, loading, empty, no results, error, overflow ("+N more"), long text, many items, zero items. A screen is not done until its states are.
5. **Reuse before inventing.** First look for an existing component or pattern that solves the problem. Only create something new when nothing fits, and then build it as a proper reusable component in the same language as the rest.
6. **Readable contrast.** Labels must be readable; pale-on-pale is a common failure. Important values get more weight/size; secondary information goes grey, but stays legible.
7. **Meaningful over clever.** Icons, colours and metaphors must fit the domain and be understood at a glance. If it needs explaining, it's the wrong choice.
8. **If it can't be built, drop it.** When a requested detail is technically impossible (e.g. per-field match indicators the data can't support), say so and remove it rather than faking it.

---

## 2. Visual style preferences

### Overall look
- Clean, modern, slightly soft: white surfaces on a very light tinted background, thin hairline borders, modest corner radii (6–14 px), little to no shadow except on floating layers (menus, popovers, dialogs).
- Generous whitespace, consistent rhythm, everything aligned to a grid.
- Two brand colours at most, used sparingly. Strong brand colours are harsh over large areas: use them for chrome (nav bar, header row) or for small accents (active tab, primary action, page title), never for big fills.

### Colour system
Always work with **tokens/variables**, never raw hex. Organise them into roles:

| Role | What it's for | Typical tokens |
|---|---|---|
| **Ink** | Text and icons | default (dark), secondary (mid grey), muted/meta (light grey) |
| **Surface** | Backgrounds and cards | white, light tinted background, secondary surface |
| **Border** | Hairlines, dividers, card edges | one subtle border (dark ink at ~15–20% opacity, or a pale tint) |
| **Brand** | Identity, primary actions, active state | primary brand, plus a very light tint of it for selected/hover backgrounds |
| **Status** | Meaning only | good / warn / bad / info / idle (neutral), each with a **strong** (text/icon/border) and a **soft** (background) value |
| **Data viz** | Charts | primary series, secondary/"other", one accent for the item in focus |

Rules:
- **Status colours are the only colours that carry meaning.** At most one status colour per card or row. **Normal = neutral**: only exceptions get colour.
- Soft status fills always sit behind their own strong text, never alone.
- **Don't rely on colour alone.** Pair it with text, an icon or position.
- Red is for errors, overdue items and destructive actions. Keep the brand red (if there is one) separate from the error red when possible.
- Data text needs at least 4.5:1 contrast (7:1 for anything read from a distance).

### Reducing colour noise
When a table or screen feels "too colourful":
1. Decide which single column or element matters most and keep colour there.
2. Turn the others into **Plain** badges (white background, subtle border, dark text) or plain grey text.
3. Show a status **dot only when action is needed**; let "done/closed" states go grey so they recede.
4. Colour only the **icon** inside a badge rather than the whole badge, if the badge still needs to carry meaning.

### Typography
- One sans-serif family with Regular / Medium / DemiBold (or Semibold) weights.
- A small, named scale: heading 1–4, body, body small (the default UI size, ~14–16 px), body mini (badges, tags, meta). Bind text to styles; don't freestyle sizes.
- Sentence case for everything (titles, buttons, labels). No all-caps headings.
- Pattern **label above value**: small secondary label, stronger value under it, optional meta line under that.
- Pattern **big number + small unit**: the number in display size, the unit smaller and muted, bottom-aligned.
- Wall and TV displays use roughly 1.6× the web scale, with nothing under 18 px.

### Spacing and layout
- Work on a 4/8 px rhythm (common steps: 4, 8, 12, 16, 20, 24, 28, 32).
- Card padding of about 20–24; gap between cards 16; gap between blocks inside a card 12–14.
- Equal heights for cards in the same row. Uneven heights read as a bug.
- Left-align text; right-align numbers in tables and lists; in card headers, title left and meta right.
- Use auto layout / flex for everything so content reflows; avoid absolute positioning except for overlays.

### Iconography
- One consistent outline icon set (e.g. Lucide-style: 24 grid, 1.5 stroke, round caps).
- Icons support labels; they rarely replace them. Icon-only buttons are fine for well-known actions (search, filter, close, more ⋯, download).
- For a family of states, prefer **one base shape with small, meaningful variations** (e.g. empty / dotted / filled / checked circles for a progress lifecycle; + / ⚡ / → for start / active / leaving), and make sure the metaphor fits the domain.
- Check icons at their real rendered size (often 14–18 px). Variants that differ only by a tiny detail may be indistinguishable.

---

## 3. Recurring UI patterns

### Data tables
- **Toolbar:** filter button and a collapsed search icon (expands on click) on the left; Columns / Export / ⋯ on the right.
- **Filter bar:** a row of chips `Label | value ⌄` (e.g. `Status | Active, Pending`, `Owner | [3] selected` with a small count badge), plus a "Clear filters" link.
- Dark or strong header row, light zebra or hairline rows, row checkboxes for bulk actions, a ⋯ menu per row for row actions.
- The most important column first (after the selection checkbox). Status as a badge; dates as relative reminders ("Tomorrow", "Overdue · 2 days"), with only urgent ones coloured.
- Shortcut columns (open attachment, open document) use small icon-only buttons; unavailable = disabled, not hidden.
- Footer: total count, page size, pagination.

### Filters
Types: autofill, free search, **combo box** (pick from known string values), date / date range, single value.

**Multi-select combo box filter:**
- The filter menu holds a label, a search field and Cancel / Apply.
- Selected values appear as **removable chips inside the field** (✕ on each; Backspace removes the last one).
- Typing opens a **separate results popup anchored under the field** (not inline in the menu): checkbox rows, the matched substring highlighted, a hovered-row tint, and a "Scroll for N more" hint.
- With an empty query, the selected values are pinned on top ("Selected"), then "All values".
- The field grows to about 2 rows, then collapses the rest into a "+N more" chip; there's a "N selected · Clear all" line.
- No-match state: "No values match '…'" plus a hint. Chips already chosen are never lost.
- The Apply button shows the count ("Apply (3)"); the closed filter chip shows "Label | [3] selected".

### Detail dialogs / large pop-ups
- Header: title, key tags (type, status, due), secondary actions (history toggle, previous/next record, close).
- Two columns: a **tabbed main area** (~70–80%) and a **details rail** (~20–30%) with the key facts as label/value stacks with small icons. Separate the rail visually from the main area (background tint or divider), and optionally let the user hide it.
- Sections: a small icon plus a title; content in cards with **label-left / value-right rows**.
- Footer: the context-specific action on the left (e.g. reject/stop); Cancel and the primary save on the right. Flag unsaved changes in the footer ("2 unsaved changes").
- Make the dialog fit its content height; nothing should clip.

### Confirmation dialogs
- Always the design system's Dialog component, never a hand-built box.
- **Unsaved changes:** title "You have unsaved changes", the list of changed fields (old → new), and the actions Discard changes / Save and close (closing with ✕ = keep editing).
- **Destructive action:** a question as the title ("Stop X for this item?"), any required input (e.g. end date), a short **"What happens next" bullet list** (not a warning banner), then a neutral "Keep …" button and a destructive "Stop …" button.

### Activity / audit log
- A side panel that can be toggled. Single-row toolbar: icon-only search (expands) on the left, Filter on the right.
- The filter is a flat list: All, Comments, then individual fields grouped by section (comments and fields are both "filters", not separate concepts).
- Each entry is two lines, never collapsible: what changed (field label + old → new) and who/when.

### Comments / "document your work"
- Order: any scheduling control (e.g. "Look at this again: 1 day · 2 days · 3 days · Pick date") → thread (2–3 newest shown, "Show N earlier comments" on top, newest nearest the input) → composer (avatar, input, Post).
- Edit your own comment in place (⋯ → Edit); show "edited". Make it airy, not packed.

### Matching / merge flows
- The source record on top (as label/value pairs) → candidate list as a compact secondary table with radio selection, using the same fields as the source → a **preview** of the result as a summary card → footer: reject / cancel / confirm ("Merge into X").
- Also design "nothing selected yet" (with a preview placeholder) and "no candidates" (with an explanation and the reject action).

### Lists and empty states
- Cap long lists and summarise the rest ("14 further items · total").
- Keep the empty card and its header; body text in muted grey ("Nothing due this week").

---

## 4. Data visualisation

- Prefer **ranked horizontal bars**, single big numbers with a target, small trend columns or sparklines, and progress against a target.
- Avoid donuts and pies with colour keys, 3D, gradients, stacks with more than 3 segments, dual axes and heavy gridlines.
- **Three colours max:** primary series, secondary/"other"/past, one accent for the focus item. Rank and position encode category; hue doesn't.
- Label values directly; no legends where direct labels work.
- Past about 6 categories, group the tail into "Other".
- Show targets and comparisons as muted references (a thin line or ghost bar).

### Wall / TV dashboards (non-interactive)
- Fixed canvas (e.g. 1920×1080), one page, never scrolls, no hover/click affordances. Links become QR codes or plain text references.
- Fixed template with zones that every board shares: a hero KPI strip (3–6 numbers, the biggest type), a primary topic area, a "people/schedule" rail, and always a title, owner, data timestamp and live indicator.
- Grid-snapped cards (e.g. 12 columns, 16 px gutters), equal heights, an 18 px type minimum.

---

## 5. Copy

- Short, sentence case, factual. Buttons are verbs ("Save changes", "Merge into 4711", "Keep delivering").
- Labels are nouns. Units are always visible.
- Relative time for recency and reminders ("2 days ago", "in 3 days", "Overdue · 2 days"); absolute dates where precision matters.
- Separate meta parts with " · ".
- When translating a design: change only the copy, keep data (names, IDs, emails, dates) untouched, use the domain's established terminology (from the client's documents), and re-apply any mixed styling (highlights) the text replacement removed.

---

## 6. How I work

### Before designing
1. Read the brief and pull out the **hard requirements** vs the **ideas** ("Idea: use icons…" is a suggestion, not a requirement).
2. Look at existing screens and the component library first. Identify what can be reused.
3. Check references (pattern libraries such as Mobbin) for interaction ideas, then express them in the product's own components and style; never copy a foreign look.
4. For bigger changes, state the plan briefly (what you'll build, in which states, with which components) before executing. Ask only for decisions that really belong to the owner (new components, naming, brand or icon direction).

### While designing
- **Never overwrite the original.** Duplicate the frame and change the copy; name variants clearly ("Table · calm colour", "Dialog · editing comment").
- Put new work in the right place: group related screens in rows/sections with short captions describing the state or interaction.
- Build with real components and bound tokens and text styles. If you need a missing capability (e.g. an icon-only badge), add it to the component properly (a new property or variant), mirroring how sibling components do it, and only after approval.
- Use auto layout everywhere. Overlays (menus, popovers, dialogs) are absolutely positioned above the layout.
- Avoid clipping: size frames to their content and don't hide overflow.
- Use realistic sample data (plausible names, IDs, dates, lengths), including long values, to stress the layout.

### Verifying
- Screenshot every change and actually look at it, cropping in to check details at real size.
- Check: alignment, equal heights, contrast, text overflow/truncation, icon legibility at rendered size, colour noise, that every state is present.
- If a screenshot looks unchanged, re-render a child node; renders can be stale.

### Handling feedback
- Feedback often states the symptom ("I don't like it", "too many colours", "looks packed"). Find the underlying principle (noise, hierarchy, density, metaphor) and fix that, not only the instance.
- When feedback rejects a direction, don't defend it. Offer 2–3 genuinely different alternatives side by side (a small comparison board) and recommend one.
- Apply an accepted change everywhere the same pattern appears, not just on the screen that was discussed.
- Keep track of what's been decided so you don't reintroduce rejected ideas.

### Reporting
- Say what changed, where (frame names/IDs), and what you verified.
- Call out assumptions, open questions and anything you couldn't do, plainly.
- Keep it short: a table for mappings or states, bullets for decisions, one line per open question.

---

## 7. Done checklist

- [ ] Uses existing components; anything new was approved and built as a reusable component
- [ ] Colours and type bound to tokens and styles; no raw values
- [ ] Only meaningful colour; normal states neutral; at most one status colour per row or card
- [ ] Clear hierarchy without nested boxes; aligned to the grid; equal heights per row
- [ ] Labels readable; contrast meets the minimum
- [ ] All states designed (empty, no results, error, loading, overflow, long text)
- [ ] Nothing clips; overlays sit above the layout
- [ ] Original frames untouched; variants named and captioned
- [ ] Verified by screenshot at real size
- [ ] Report lists changes, verification, assumptions and open questions
