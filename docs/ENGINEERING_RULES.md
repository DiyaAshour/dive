# Engineering Rules

1. **No patch architecture.** Fix root causes at the owning layer.
2. **No duplicated business rules.** Pricing, permissions, availability, cancellation, and commission rules have one source of truth.
3. **Route handlers stay thin.** Validate, authenticate, call a service, serialize the response.
4. **React components never access the database.**
5. **Database constraints back up application rules.** Unique keys and transactions are required where correctness depends on them.
6. **Every write is attributable.** Important hotel, inventory, booking, permission, and financial mutations must support audit logging.
7. **Money uses decimal database values.** Never rely on floating-point values for persisted money.
8. **Public contracts are versioned.** Breaking API changes require a new API version or an explicit migration plan.
9. **Secrets never enter source control.** Passwords are salted and hashed; session tokens are stored only as hashes.
10. **Mobile is a first-class future client.** Do not put shared rules only in web components.
11. **No silent fallback data in production paths.** Missing database/configuration should fail clearly rather than quietly switching to mocks.
12. **Build for deletion.** Modules should have clear boundaries so implementations can be replaced without rewriting the rest of the system.
