# PrimordiaOS agent image — Docker (local) realm. Build from the agent root:
#   docker build -f runtime/Dockerfile -t primordia-agent-realmassetengineer:1.0.0 .
# Runs the agent as an HTTP service (runtime/http.js) so the kernel can deliver over HTTP.
# `node agent.js` (one-shot loop) still works inside the image for debugging:
#   docker run --rm primordia-agent-realmassetengineer:1.0.0 node agent.js
FROM node:18-alpine
WORKDIR /agent
COPY . .
ENV NODE_ENV=production \
    PRIMORDIA_REALM=local \
    AGENT_PORT=8080 \
    AGENT_HOST=0.0.0.0 \
    AUTORUN=1
# PRIMORDIA_TOKEN is injected at runtime (compose env / secret), never baked into the image.
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.AGENT_PORT||8080)+'/status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
RUN chown -R node:node /agent
USER node
CMD ["node", "runtime/http.js"]
