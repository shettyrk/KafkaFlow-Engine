package com.example.notificationservice.service;

import com.example.common.events.InventoryUpdatedEvent;
import com.example.common.events.KafkaTopics;
import com.example.common.events.PaymentResultEvent;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class NotificationListener {
    private final LogPublisher logPublisher;
    private final Map<String, Boolean> processedEvents = new ConcurrentHashMap<>();

    public NotificationListener(LogPublisher logPublisher) {
        this.logPublisher = logPublisher;
    }

    @KafkaListener(topics = KafkaTopics.PAYMENT_TOPIC, groupId = "notification-service-payment")
    public void onPayment(PaymentResultEvent event) {
        if (processedEvents.putIfAbsent(event.eventId(), true) != null) {
            return;
        }
        String result = event.success() ? "success" : "failure";
        logPublisher.info("Notification sent for payment " + result + ", order: " + event.orderId(),
                event.correlationId());
    }

    @KafkaListener(topics = KafkaTopics.INVENTORY_TOPIC, groupId = "notification-service-inventory")
    public void onInventory(InventoryUpdatedEvent event) {
        if (processedEvents.putIfAbsent(event.eventId(), true) != null) {
            return;
        }
        String result = event.success() ? "success" : "failure";
        logPublisher.info("Notification sent for inventory " + result + ", order: " + event.orderId(),
                event.correlationId());
    }
}
