package com.fleet.vehiculeservice.config;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;

import java.util.HashMap;
import java.util.Map;

/**
 * Configuration Kafka supplémentaire.
 *
 * Le consumer global (auto-configuré par Spring Boot) utilise {@code JsonDeserializer}
 * et s'appuie sur les headers {@code __TypeId__} produits par Spring Kafka.
 * Les messages du conductor-service (NestJS) n'incluent PAS ces headers : il faut
 * donc une factory dédiée avec {@code StringDeserializer} pour le topic driver-events.
 *
 * Cette factory est référencée via {@code containerFactory = "driverEventContainerFactory"}
 * dans {@link com.fleet.vehiculeservice.service.DriverEventConsumer}.
 */
@Configuration
public class KafkaConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Bean
    public ConsumerFactory<String, String> driverEventConsumerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG,   bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG,            "fleet-driver-group");
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG,   "earliest");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,   StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        return new DefaultKafkaConsumerFactory<>(props);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, String> driverEventContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, String> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(driverEventConsumerFactory());
        return factory;
    }

    // ── Factory dédiée aux événements maintenance-service (NestJS) ─────────────
    // Même besoin que driver-events : pas de headers __TypeId__, on désérialise
    // en String puis on parse manuellement avec ObjectMapper dans le consumer.

    @Bean
    public ConsumerFactory<String, String> maintenanceEventConsumerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG,   bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG,            "fleet-maintenance-group");
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG,   "earliest");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,   StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        return new DefaultKafkaConsumerFactory<>(props);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, String> maintenanceEventContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, String> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(maintenanceEventConsumerFactory());
        return factory;
    }
}
