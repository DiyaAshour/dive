# HandMeKey Editorial Queue

Files in this directory are synced into the production Blog as **DRAFTS** during deployment.

- A `.json` file may contain one article object or an array of article objects for a batch.
- Files starting with `_` are ignored.
- The normal Blog schema is required: `locale`, `slug`, `title`, `excerpt`, `body`, `seoTitle`, `seoDescription`, `category`, `tags`, `authorName`, plus optional image/featured fields.
- `status` from the file is ignored and forced to `DRAFT` for safety.
- Existing drafts with the same locale + slug are updated only when content changed.
- Existing `PUBLISHED` or `ARCHIVED` articles are protected and never pushed back to draft by repository sync.
- The sync uses `PLATFORM_OWNER_USER_ID` or `PLATFORM_OWNER_EMAIL` when configured. If neither is configured, it may safely use the account only when exactly one `PLATFORM_ADMIN` exists; it never guesses between multiple admins.
- All writes go through the existing Blog service, so normal admin authorization and audit logging remain in place.

This queue is intended for editorial content prepared through ChatGPT or other human-reviewed workflows without requiring an AI API key in the website.
