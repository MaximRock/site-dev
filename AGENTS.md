## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Design doctrine (ux-ui-agent-skills)

The design rules live in the UX/UI kit at `~/projects/ux-ui-agent-skills`
(cloned OUTSIDE this repo, branch `nixos`). Its full brief is
`~/projects/ux-ui-agent-skills/AGENTS.md`; the rules that apply here:

### Running gates

Gates read this repo's files from the kit's dev shell (built pages live in
`dist/client/`):

```
cd ~/projects/ux-ui-agent-skills && DS_REQUIRE_BROWSER=1 nix develop -c \
  node scripts/verify_states.mjs /home/max/projects/site-dev/dist/client/index.html
```

- Browser gates MUST run with `DS_REQUIRE_BROWSER=1`. A `SKIPPED` print with
  exit 0 measured nothing — it is not a pass.
- Python gates run directly: `python3 scripts/validate_tokens.py <tokens.json>`,
  `python3 scripts/lint_hardcodes.py <src dir>`.
- Or use the `ux-ui-gates` MCP server configured in this repo's `opencode.json`
  (tools: `list_gates`, `run_gate`, `review_ui`, `get_doctrine`,
  `get_design_system`, `get_tokens`).

### Rules that do not bend

1. Never state a contrast ratio, a WCAG verdict or a pass rate that a gate did
   not just print. "Not verified yet" is always acceptable.
2. Zero emoji — UI, code, copy, comments, commit messages.
3. Token by intent; one source of truth for tokens: `src/styles/global.css`
   (`@theme`). No hardcoded hex, px or ms in components.
4. Every interactive element renders default, hover, focus, active, disabled,
   loading, error and selected states.
5. Mobile is the base: base styles ARE the phone layout; wider screens layer on
   with `min-width`.
6. Every screen has one first place for the eye; display type is at least 2.5x
   the body size.
7. Never a native `<select>`; never a colored border on one side only of a
   card, alert, toast or callout.
8. Write the taste block (Domain / Audience & tone / Mood / Motion depth /
   Layout family / Reference anchor) in the reply BEFORE generating markup.
9. Run the gates before saying done, screenshot it and click every control. A
   passing gate is not evidence of taste — argue against your own work.

<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->
