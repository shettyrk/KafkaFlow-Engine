package com.example.inventoryservice.service;

import com.example.common.events.InventoryUpdatedEvent;
import com.example.common.events.KafkaTopics;
import com.example.common.events.OrderCreatedEvent;
import com.example.common.events.OrderItem;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class InventoryProcessor {
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final LogPublisher logPublisher;
    private final Map<String, Boolean> processedEvents = new ConcurrentHashMap<>();
    private final Map<String, AtomicInteger> stock = new ConcurrentHashMap<>();

    public InventoryProcessor(KafkaTemplate<String, Object> kafkaTemplate, LogPublisher logPublisher) {
        this.kafkaTemplate = kafkaTemplate;
        this.logPublisher = logPublisher;
        stock.put("BOOK", new AtomicInteger(10));
        stock.put("PHONE", new AtomicInteger(5));
        stock.put("LAPTOP", new AtomicInteger(2));
    }

    @KafkaListener(topics = KafkaTopics.ORDER_TOPIC, groupId = "inventory-service")
    public void process(OrderCreatedEvent event) {
        if (processedEvents.putIfAbsent(event.eventId(), true) != null) {
            return;
        }

        String failureReason = validateStock(event);
        boolean success = failureReason == null;
        if (success) {
            reserveStock(event);
        }

        InventoryUpdatedEvent result = new InventoryUpdatedEvent(
                UUID.randomUUID().toString(),
                event.correlationId(),
                event.orderId(),
                success,
                success ? "Inventory reserved" : failureReason,
                Instant.now()
        );

        kafkaTemplate.send(KafkaTopics.INVENTORY_TOPIC, event.orderId(), result);
        if (success) {
            logPublisher.info("Inventory reserved for order: " + event.orderId(), event.correlationId());
        } else {
            logPublisher.error("Inventory reservation failed for order: " + event.orderId() + " - " + failureReason,
                    event.correlationId());
        }
    }

    private String validateStock(OrderCreatedEvent event) {
        for (OrderItem item : event.items()) {
            AtomicInteger available = stock.get(item.sku());
            if (available == null) {
                return "Unknown SKU: " + item.sku();
            }
            if (item.quantity() <= 0) {
                return "Invalid quantity for SKU: " + item.sku();
            }
            if (available.get() < item.quantity()) {
                return "Insufficient stock for SKU: " + item.sku();
            }
        }
        return null;
    }

    private void reserveStock(OrderCreatedEvent event) {
        for (OrderItem item : event.items()) {
            stock.get(item.sku()).addAndGet(-item.quantity());
        }
    }
}
