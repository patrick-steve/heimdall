# Lobster Trap reverse proxy — deployed as a second Render service.
#
# This image:
#   1. Clones veeainc/lobstertrap at build time (pinned ref via LT_REF arg).
#   2. Builds the static Go binary.
#   3. Bundles the Heimdall-tuned policy YAML.
#   4. Runs with --backend pointed at Google's OpenAI-compatible Gemini endpoint.
#
# The agent calls go: Heimdall backend -> Lobster Trap (this) -> Google Gemini.
# The proxy adds a _lobstertrap response header field with declared-vs-detected
# mismatches, which Heimdall reads to fire its intent_mismatch rule.

# ── builder ───────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder
RUN apk add --no-cache git make ca-certificates

ARG LT_REF=main
WORKDIR /src
RUN git clone https://github.com/veeainc/lobstertrap.git . \
 && git checkout ${LT_REF} \
 && CGO_ENABLED=0 GOOS=linux make build-static

# ── runtime ───────────────────────────────────────────────────────────
FROM alpine:3.20
RUN apk add --no-cache ca-certificates

COPY --from=builder /src/lobstertrap /usr/local/bin/lobstertrap
COPY policy.yaml /etc/lobstertrap/policy.yaml

# Render injects PORT at runtime; default 8080 for local docker run.
ENV PORT=8080

# Google's OpenAI-compatible Gemini endpoint. The proxy forwards each
# chat completion to this URL with the agent's Authorization header
# passed through unchanged (the API key lives on Heimdall's backend).
ENV LT_BACKEND="https://generativelanguage.googleapis.com/v1beta/openai"

EXPOSE 8080

# `sh -c` is needed so $PORT expands at runtime, not build time.
CMD ["sh", "-c", "lobstertrap serve --policy /etc/lobstertrap/policy.yaml --backend $LT_BACKEND --listen :$PORT --no-dashboard"]
