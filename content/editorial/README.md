# HandMeKey Editorial Queue

Files in this directory are synced into the production Blog as **DRAFTS** during deployment.

- Use one `.json` file per article.
- Files starting with `_` are ignored.
- The normal Blog schema is required: `locale`, `slug`, `title`, `excerpt`, `body`, `seoTitle`, `seoDescription`, `category`, `tags`, `authorName`, plus optional image/featured fields.
- `status` from the file is ignored and forced to `DRAFT` for safety.
- Existing articles with the same locale + slug are updated only when content changed.
- The sync uses `PLATFORM_OWNER_USER_ID` or `PLATFORM_OWNER_EMAIL` and the existing Blog service, so normal admin authorization and audit logging remain in place.

This queue is intended for editorial content prepared through ChatGPT or other human-reviewed workflows without requiring an AI API key in the website.
