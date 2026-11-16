# FinAI NEXT-17A — isolated synthetic synchronization QA

The local/testing encrypted receipt API requires current company membership plus documents.write for POST; reads are limited to the logged-in user's own synthetic envelopes. Production remains disabled, including when a test feature flag is set. A disposable GitHub CI environment tests revoked roles, inactive members, unverified users, replay, tenant boundaries and version conflicts.

This is not an authorized production mobile deployment. No real data, host writes or changes to other projects.