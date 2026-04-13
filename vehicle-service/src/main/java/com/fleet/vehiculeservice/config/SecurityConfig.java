package com.fleet.vehiculeservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Configuration Spring Security — OAuth2 Resource Server JWT.
 *
 * Keycloak stocke les rôles du realm dans le claim realm_access.roles.
 * Le converter personnalisé les extrait et les préfixe avec ROLE_ pour
 * que hasRole("admin") fonctionne comme attendu.
 *
 * Règles :
 *   GET  /api/vehicles/**  → public
 *   POST /PUT /DELETE      → rôle admin ou manager requis
 *   /graphql, /graphiql/** → public (gateway GraphQL interne)
 *   /actuator/**           → public (Prometheus / health checks)
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Lecture véhicules — publique
                .requestMatchers(HttpMethod.GET, "/api/vehicles/**").permitAll()
                // GraphQL + GraphiQL — publique (accès via api-gateway)
                .requestMatchers("/graphql", "/graphiql/**").permitAll()
                // Health checks + métriques
                .requestMatchers("/actuator/**").permitAll()
                // Écriture véhicules — manager ou admin
                .requestMatchers(HttpMethod.POST, "/api/vehicles/**")
                    .hasAnyRole("admin", "manager")
                .requestMatchers(HttpMethod.PUT, "/api/vehicles/**")
                    .hasAnyRole("admin", "manager")
                .requestMatchers(HttpMethod.DELETE, "/api/vehicles/**")
                    .hasAnyRole("admin", "manager")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(keycloakJwtConverter()))
            );

        return http.build();
    }

    /**
     * Extrait les rôles du realm Keycloak depuis realm_access.roles
     * et les convertit en GrantedAuthority avec le préfixe ROLE_.
     */
    @Bean
    public JwtAuthenticationConverter keycloakJwtConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new KeycloakRealmRolesConverter());
        return converter;
    }

    static class KeycloakRealmRolesConverter
            implements Converter<Jwt, Collection<GrantedAuthority>> {

        @Override
        @SuppressWarnings("unchecked")
        public Collection<GrantedAuthority> convert(Jwt jwt) {
            Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
            if (realmAccess == null) {
                return List.of();
            }
            List<String> roles = (List<String>) realmAccess.get("roles");
            if (roles == null) {
                return List.of();
            }
            return roles.stream()
                    .map(role -> (GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + role))
                    .collect(Collectors.toList());
        }
    }
}
