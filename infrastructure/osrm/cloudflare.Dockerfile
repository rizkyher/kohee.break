FROM ghcr.io/project-osrm/osrm-backend:v6.0.0
# Prepared, licensed regional MLD graph only; never copy tokens or the Java planet extract.
COPY data/bandung.osrm* /data/
EXPOSE 5000
CMD ["osrm-routed", "--algorithm", "mld", "/data/bandung.osrm", "--verbosity", "WARNING", "--threads", "1"]
