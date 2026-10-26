# GCC V13.5 — production authentication email delivery

## Confirmed server limitation
The Supabase built-in email provider is limited to 2 email messages per hour for the entire project and is not suitable for international teacher signups. There is no safe front-end bypass for this. Do NOT turn off confirmation or manually mark unrelated teachers as verified.

To remove this limitation, set up a production email provider (e.g. SMTP with a verified sender domain, or Supabase Send Email hook) in the project's Supabase Dashboard at **Authentication → SMTP Settings**. Configure a legitimate provider account and sender identity there, not in Git or the browser. Review **Authentication → Rate Limits** for the configured provider and test real deliveries. Never commit SMTP passwords or service-role keys.

Recovery: an existing teacher should open the email confirmation link and return to **Sign in and continue** rather than sign up again; if no confirmation email arrived due to the provider limit, send a new confirmation only once mail delivery is restored.

Official docs:
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/rate-limits
