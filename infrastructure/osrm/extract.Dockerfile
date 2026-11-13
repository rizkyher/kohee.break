FROM debian:bookworm-slim
USER root
RUN apt-get update && apt-get install -y --no-install-recommends osmium-tool && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["osmium"]
