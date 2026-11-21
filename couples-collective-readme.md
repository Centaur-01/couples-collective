# couples-collective — the customer-only store (production repo)

Created 2026-11-21 (Jack: "build it into a new repo but ALL the barcodes must still work as andy has printed it all
already"; "no added risk, also ensure we can revert"). Served by GitHub Pages at
https://centaur-01.github.io/couples-collective/ . Plan + gates: pokemon/backlog/PKM-031-customer-store-golive.md.

- What is here: the vendorkit storefront, rebuilt by `pokemon/pulse_qa.py store-sync` after every live update **from
  the live public inventory + the live classic page only** (Pokemon_vendor origin/main), never from engine data.
  Pushed only when the parity gate (same cards, prices, price-source boxes, Sold pages, sticker links, aliases) and
  the page check (requests wired, view counting on, searchable as configured) pass. Never edit files here by hand:
  the next sync overwrites them.
- Stickers: every printed code (…/Pokemon_vendor/#code) forwards here since 2026-11-21 (Pokemon_vendor 15350ef;
  sticker_scan 3,913/3,913 on both stores). The full classic store keeps running at …/Pokemon_vendor/classic.html.
  Revert = `python3 pokemon/switch_revert.py --push` + price_diff.SITE_PAGE = "index.html".
- Requests ("I want this card") post to the live store's own Google Form (read from classic.html at build time); the
  pulse's form-fixes intake emails Andy the lead. Card opens count in GoatCounter as /card/CC-#### (same as classic).
- Searchable since 2026-11-21 (Jack: "publish to make it searchable"): canonical links + sitemap.xml (2,467 card pages).
- Andy's vendor app is NOT here and is not connected to live data (future: couples-collective-gym).
