# Deployment Notes

## Production branch

- Railway is connected to `main`.
- Pushes to `codex/*` branches do not deploy production unless they are merged into `main`.
- If a change is meant to reach Railway, merge it into `main` and push `main`.

## Sanity check

Before assuming deployment is broken:

1. Confirm the Railway service is still connected to this repository.
2. Confirm the production branch is still `main`.
3. Confirm auto-deploy is enabled.
4. Confirm the latest commit exists on `origin/main`.

## Historical note

Old deployment activity from Vercel may still appear in GitHub history. That is historical and does not control the current Railway deployment target.
