# couples-collective — the customer-only store (production repo)

Created 2026-11-21 (Jack: "build it into a new repo but ALL the barcodes must still work as andy has printed it all
already"; "no added risk, also ensure we can revert"). Served by GitHub Pages at
https://centaur-01.github.io/couples-collective/ . Plan + gates: pokemon/backlog/PKM-031-customer-store-golive.md.

- Today: a placeholder page, robots `Disallow: /` and `noindex` until the cutover.
- Next: the vendorkit storefront, rebuilt after every live update **from the live public inventory only**
  (Pokemon_vendor origin/main), never from engine data.
- Stickers still point at Pokemon_vendor. They forward here only after the barcode gate (3,913/3,913 codes resolve)
  is green and Jack says go. Revert = restore the classic page in Pokemon_vendor (one commit).
- Andy's vendor app is NOT here and is not connected to live data (future: couples-collective-gym).
