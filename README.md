# PropertyMatch Abu Dhabi — MVP

A deployable Node.js + Express + SQLite MVP for property requests, property submissions, automatic matching, and basic admin APIs.

## Run
1. Install Node.js 20+
2. Run `npm install`
3. Run `npm start`
4. Open http://localhost:3000

## API
- POST /api/requests
- POST /api/properties
- GET /api/matches/:requestId
- GET /api/admin/summary
- GET /api/admin/requests
- GET /api/admin/properties
- POST /api/admin/verify/:propertyId

## Production TODO
Use PostgreSQL or managed DB, real admin authentication, object storage for photos, HTTPS, rate limiting, CAPTCHA, email/WhatsApp integration, audit logs, backups, domain, hosting, and regulatory review before commercial launch.
