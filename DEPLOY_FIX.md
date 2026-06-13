# Critical Fix: Express Trust Proxy for Render

## Issue
Backend was returning "Resource not found" for all requests on Render because:
- Render uses a load balancer that sets `X-Forwarded-For` header
- Express rate limiter requires `trust proxy` to be enabled to read this header
- Without `trust proxy`, rate limiter threw ValidationError and blocked all requests

## Error in Logs
```
ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false (default).
```

## Fix
Added to `backend/src/app.js`:
```javascript
app.set('trust proxy', 1);
```

This tells Express to trust the first proxy (Render's load balancer) for:
- Rate limiting based on client IP
- HTTPS detection
- Host header handling

## Deployment
```bash
git add backend/src/app.js DEPLOY_FIX.md
git commit -m "fix: enable trust proxy for Render deployment (fixes rate limiter error)"
git push origin master
```

Wait for Render to redeploy, then test:
- https://compassionedu-api.onrender.com/api/health (should work)
- https://compassionedu-api.onrender.com/api/env-check (should show environment variables)
- https://compassionedu-api.onrender.com/api/auth/google (should redirect to Google)
