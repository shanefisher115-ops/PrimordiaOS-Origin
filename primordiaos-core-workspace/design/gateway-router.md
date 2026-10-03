# Gateway Router

## Purpose
Handle ingress from Cloudflare/HTTP and route into PrimordiaOS realms.

## Responsibilities
- Auth.
- Rate limiting.
- Request → realm routing.
- Mapping external endpoints to internal tasks.

## Interfaces
- API: handleRequest(req).
- Emits: gateway.request.routed, gateway.request.rejected.

## Constraints
- Must be stateless per request.
- Integrates with agents + scheduler.
