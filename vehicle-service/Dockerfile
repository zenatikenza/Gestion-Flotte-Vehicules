# Stage 1: Build
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Copie du pom.xml et téléchargement des dépendances pour mettre en cache
COPY pom.xml .
RUN mvn dependency:go-offline

# Copie des sources et compilation
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Utilisation d'un wildcard pour éviter les erreurs de nom (vehicule vs vehicle)
COPY --from=build /app/target/*.jar app.jar

# Configuration de la mémoire Java
ENV JAVA_OPTS="-Xms256m -Xmx512m"

# Port exposé par le microservice
EXPOSE 8081

# Lancement de l'application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]