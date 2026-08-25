# Phase 31 — Sticky booking overlap fix

Phase 31 fixes the desktop overlap between the sticky stay/date selector and the sticky live-rate booking rail on public hotel pages.

## Changes
- Keep the date selector sticky at the existing header offset.
- Move the booking rail below the full sticky selector footprint with a safe visual gap.
- Add anchor scroll margin so `#room-offers` does not land underneath the sticky selector.
- Disable rail stickiness on short-height viewports where the card would not fit comfortably.
- Existing tablet/mobile behavior remains non-sticky.
