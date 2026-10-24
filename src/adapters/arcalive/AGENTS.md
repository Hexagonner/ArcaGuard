# ArcaLive adapter rules

- Phase 1 read-only investigation is approved. No live administration writes or later-phase
  implementation is approved. Reference-code selectors remain unverified until live evidence exists.
- Use only observed site structures. Document each selector's source and verification
  date in `docs/SITE_VERIFICATION.md` before adding it.
- Never infer report list structure, moderator authority or category-change endpoints.
- Separate public page reading from privileged reads and all administrative writes.
- Moderator menu presence does not establish category-change permission.
- Stop on permission failures or changed structure; do not retry guessed alternatives.
- Re-read current article state before and after every future approved action.
- Live site tests require explicit user approval; begin with read-only tests.
- Category-change testing additionally requires approval for one named test article.
- If trash-category semantics imply deletion, do not enable automated movement.
- No automatic deletion, comment deletion or account-ban code.
- Report-processing categories/buttons and article destination categories are separate site concepts.
  Report completion is not article movement. Any future optional report submission needs its own
  verified permissions, safe effects, background write interface and result read; never hardcode labels
  or infer that blank deletion/ban preview cells prove no side effects. See OP-11.
- Until administrative UI is verified, future integrations use fixtures and mocks.
- Automatic moves require a verified background request path and independent result reads.
  Never navigate/reload the active page, open a tab/window or drive visible moderator controls
  as an automatic fallback. Preserve focus, scroll and drafts; otherwise hold for review.
- Read the user's selected channel and destination from that channel's configuration;
  verify actual permissions, category ID and semantics. Never hardcode test channel/category values.
- Read target URL, reporter display name, reason and current site count from verified site fields.
  Use the site's one-report-per-account/target restriction; do not build a separate reporter registry.
  Missing stable account IDs alone must not block count use. Never invent IDs or treat text inside
  the reason as the reporter name. Re-read snapshots without adding their counts together.
- Re-read current category and respect moves by other moderators. Do not overwrite handled
  work, re-move an already handled target or infer old move history from arbitrary categories.
- Collect actual clickable-image destinations only from verified article content structures;
  distinguish href from image src and OCR/QR data. Do not click links or execute handlers to discover destinations.
