package com.example.orderservice.service;

import com.example.common.events.InventoryUpdatedEvent;
import com.example.common.events.KafkaTopics;
import com.example.common.events.OrderCreatedEvent;
import com.example.common.events.PaymentResultEvent;
import com.example.orderservice.controller.CreateOrderRequest;
import com.example.orderservice.model.OrderRecord;
import com.example.orderservice.model.OrderStatus;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OrderService {
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final LogPublisher logPublisher;
    private final Map<String, OrderRecord> orders = new ConcurrentHashMap<>();
    private final Map<String, Boolean> processedEvents = new ConcurrentHashMap<>();

    public OrderService(KafkaTemplate<String, Object> kafkaTemplate, LogPublisher logPublisher) {
        this.kafkaTemplate = kafkaTemplate;
        this.logPublisher = logPublisher;
    }

    public OrderRecord createOrder(CreateOrderRequest request) {
        if (request.items() == null || request.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order must contain at least one item");
        }

        String orderId = UUID.randomUUID().toString();
        String correlationId = UUID.randomUUID().toString();
        OrderRecord order = new OrderRecord(orderId, correlationId, request.items(), request.amount());
        orders.put(orderId, order);

        OrderCreatedEvent event = new OrderCreatedEvent(
                UUID.randomUUID().toString(),
                correlationId,
                orderId,
                request.items(),
                request.amount(),
                Instant.now()
        );

        order.setStatus(OrderStatus.PROCESSING);
        kafkaTemplate.send(KafkaTopics.ORDER_TOPIC, orderId, event);
        logPublisher.info("Order created: " + orderId, correlationId);
        return order;
    }

    public OrderRecord getOrder(String orderId) {
        OrderRecord order = orders.get(orderId);
        if (order == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found");
        }
        return order;
    }

    public List<OrderRecord> listOrders() {
        return orders.values().stream()
                .sorted(Comparator.comparing(OrderRecord::getCreatedAt).reversed())
                .toList();
    }

    @KafkaListener(topics = KafkaTopics.PAYMENT_TOPIC, groupId = "order-service-payment")
    public void onPaymentResult(PaymentResultEvent event) {
        if (processedEvents.putIfAbsent(event.eventId(), true) != null) {
            return;
        }

        OrderRecord order = orders.get(event.orderId());
        if (order == null) {
            logPublisher.error("Payment result received for unknown order: " + event.orderId(), event.correlationId());
            return;
        }

        if (event.success()) {
            order.setPaymentSuccessful(true);
            completeIfReady(order);
            logPublisher.info("Payment completed for order: " + event.orderId(), event.correlationId());
        } else {
            fail(order, "Payment failed: " + event.reason());
            logPublisher.error("Payment failed for order: " + event.orderId(), event.correlationId());
        }
    }

    @KafkaListener(topics = KafkaTopics.INVENTORY_TOPIC, groupId = "order-service-inventory")
    public void onInventoryResult(InventoryUpdatedEvent event) {
        if (processedEvents.putIfAbsent(event.eventId(), true) != null) {
            return;
        }

        OrderRecord order = orders.get(event.orderId());
        if (order == null) {
            logPublisher.error("Inventory result received for unknown order: " + event.orderId(), event.correlationId());
            return;
        }

        if (event.success()) {
            order.setInventorySuccessful(true);
            completeIfReady(order);
            logPublisher.info("Inventory reserved for order: " + event.orderId(), event.correlationId());
        } else {
            fail(order, "Inventory failed: " + event.reason());
            logPublisher.error("Inventory failed for order: " + event.orderId(), event.correlationId());
        }
    }

    private void completeIfReady(OrderRecord order) {
        if (order.isPaymentSuccessful() && order.isInventorySuccessful()) {
            order.setStatus(OrderStatus.COMPLETED);
        }
    }

    private void fail(OrderRecord order, String reason) {
        order.setStatus(OrderStatus.FAILED);
        order.setFailureReason(reason);
    }
}
