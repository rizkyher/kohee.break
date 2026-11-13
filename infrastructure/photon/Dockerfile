FROM eclipse-temurin:21-jre-jammy
RUN groupadd --gid 1000 photon && useradd --uid 1000 --gid photon --create-home photon
WORKDIR /opt/photon
COPY --chown=photon:photon data/photon.jar ./photon.jar
COPY --chown=photon:photon data/index/photon_data/ ./photon_data/
USER photon
EXPOSE 2322
CMD ["java", "-Xms256m", "-Xmx512m", "-jar", "photon.jar", "serve", "-listen-ip", "0.0.0.0", "-listen-port", "2322", "-max-results", "5"]
