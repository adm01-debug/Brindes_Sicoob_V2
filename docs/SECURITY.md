# Security Best Practices

## Authentication
- Use 2FA for admin accounts
- Rotate secrets every 90 days
- Implement rate limiting

## Data Protection
- Encrypt sensitive data at rest
- Use HTTPS only
- Implement GDPR compliance

## API Security
- Validate all inputs
- Use prepared statements
- Implement CORS properly
- Rate limit API calls

## Browser Security Headers
- A Content Security Policy is emitted by both Cloudflare (`public/_headers`)
  and Vercel (`vercel.json`). Keep both policies identical; the scenario
  `tests/scenarios/csp-providers.mjs` rejects drift.
- Add a third-party origin only after confirming the browser feature that needs
  it and limiting it to the relevant CSP directive.

## Monitoring
- Enable Sentry error tracking
- Monitor failed login attempts
- Alert on suspicious activity
