# Marks this as a package so the sibling modules can use relative imports.
# Vercel's Python builder excludes any file/folder prefixed with "_" from
# being treated as its own serverless function entrypoint — see
# https://vercel.com/docs/functions/serverless-functions/runtimes/python —
# so everything in here is shared library code, only reachable through
# api/ai/assistant.py.
