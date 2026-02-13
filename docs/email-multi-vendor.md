# Email: Platform-Owned with Domain Verification

## How it works

- **Platform infrastructure**: The app uses one global Resend or SMTP config (`RESEND_API_KEY` or `SMTP_*`). Users do not add their own credentials.
- **Per-project from address**: Each project sets a "From" email in **Settings → Email** (e.g. `campaigns@clientcompany.com`).
- **Domain verification**: The domain must be verified in Resend (via DNS records). When the user saves a from address, they click "Verify domain" to register it and get DNS records. After adding the records, they click Verify again to confirm.
- **Fallback**: When the domain is not verified, emails send from `{projectId}@{EMAIL_FALLBACK_DOMAIN}` (e.g. `a1b2c3d4@send.habiv.com`). Emails still send; the user sees their branded address once they verify.

---

## Setup

1. **Platform Resend**: Set `RESEND_API_KEY` in env (or SMTP vars if using SMTP).
2. **Fallback domain**: Add and verify `EMAIL_FALLBACK_DOMAIN` (e.g. `send.habiv.com`) in the Resend dashboard. This is used when projects have not verified their own domain.
3. **Per-project**: In **Settings → Email** for each project, set the From email, click "Verify domain", add the DNS records to the domain, then click Verify again.

---

## Summary

| Question | Answer |
|----------|--------|
| Who owns Resend/SMTP? | The platform. Users cannot add their own keys. |
| Different "from" per project? | **Yes.** Set in Settings → Email. Domain must be verified. |
| What if domain not verified? | Fallback: `{projectId}@send.habiv.com`. Emails still send. |
| Can I send to a single contact? | **Yes.** Per-contact Send/Retry on campaign detail. |
| Are campaigns and subscribers isolated per project? | **Yes.** All email data is scoped by `project_id`. |
