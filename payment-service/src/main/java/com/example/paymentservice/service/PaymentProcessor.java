package com.example.paymentservice.service;

import com.example.common.events.KafkaTopics;
import com.example.common.events.OrderCreatedEvent;
import com.example.common.events.PaymentResultEvent;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PaymentProcessor {
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final LogPublisher logPublisher;
    private final Map<String, Boolean> processedEvents = new ConcurrentHashMap<>();

    public PaymentProcessor(KafkaTemplate<String, Object> kafkaTemplate, LogPublisher logPublisher) {
        this.kafkaTemplate = kafkaTemplate;
        this.logPublisher = logPublisher;
    }

    @KafkaListener(topics = KafkaTopics.ORDER_TOPIC, groupId = "payment-service")
    public void process(OrderCreatedEvent event) {
        if (processedEvents.putIfAbsent(event.eventId(), true) != null) {
            return;
        }

        boolean success = event.amount() != null && event.amount().compareTo(BigDecimal.ZERO) > 0;
        String reason = success ? "Payment authorized" : "Invalid payment amount";

        PaymentResultEvent result = new PaymentResultEvent(
                UUID.randomUUID().toString(),
                event.correlationId(),
                event.orderId(),
                success,
                reason,
                Instant.now()
        );

        kafkaTemplate.send(KafkaTopics.PAYMENT_TOPIC, event.orderId(), result);
        if (success) {
            logPublisher.info("Payment authorized for order: " + event.orderId(), event.correlationId());
        } else {
            logPublisher.error("Payment rejected for order: " + event.orderId(), event.correlationId());
        }
    }
}
