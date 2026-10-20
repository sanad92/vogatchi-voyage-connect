# Launch execution

- [x] Apply approved SafarERP name, original logo, palette and typography; preserve tenant identities; public home/login/pricing and navigation verified. Authenticated dashboard visual check remains unavailable without a session.
- [x] Fix queued email read/unread persistence; reproduce old denial and verify staff persistence, unchanged ownership/workflow and tenant isolation in isolated PostgreSQL.
- [ ] Verify queued email read/unread in the authenticated live UI (blocked: signed out; requesting user's account could not be matched for session restoration).
- [x] Check live Cloud health after the approved resize.
- [x] Run financial, booking, conversion and access regression tests; fix failures.
- [x] Check authenticated operational screens and real booking/customer/paid-invoice read-back.
- [x] Record verified results and remaining launch blockers without claiming 100% readiness.
- [ ] Execute a newly created full financial journey in an isolated test organization/environment (blocked: safe test scope and recipient not designated; current backend also serves production).