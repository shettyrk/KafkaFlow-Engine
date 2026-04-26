package com.example.inventoryservice.service;

import com.example.common.events.KafkaTopics;
import com.example.common.events.ServiceLogEvent;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class LogPublisher {
    private static final String SERVICE_NAME = "inventory-service";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public LogPublisher(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void info(String message, String correlationId) {
        publish("INFO", message, correlationId);
    }

    public void error(String message, String correlationId) {
        publish("ERROR", message, correlationId);
    }

    private void publish(String level, String message, String correlationId) {
        kafkaTemplate.send(KafkaTopics.LOGS_TOPIC, correlationId, new ServiceLogEvent(
                SERVICE_NAME,
                level,
                message,
                correlationId,
                Instant.now()
        ));
    }
}
