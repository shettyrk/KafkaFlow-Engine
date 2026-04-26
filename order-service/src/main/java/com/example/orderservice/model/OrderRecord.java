package com.example.orderservice.model;

import com.example.common.events.OrderItem;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class OrderRecord {
    private final String orderId;
    private final String correlationId;
    private final List<OrderItem> items;
    private final BigDecimal amount;
    private final Instant createdAt;
    private OrderStatus status;
    private boolean paymentSuccessful;
    private boolean inventorySuccessful;
    private String failureReason;

    public OrderRecord(String orderId, String correlationId, List<OrderItem> items, BigDecimal amount) {
        this.orderId = orderId;
        this.correlationId = correlationId;
        this.items = items;
        this.amount = amount;
        this.createdAt = Instant.now();
        this.status = OrderStatus.CREATED;
    }

    public String getOrderId() {
        return orderId;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public List<OrderItem> getItems() {
        return items;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public boolean isPaymentSuccessful() {
        return paymentSuccessful;
    }

    public void setPaymentSuccessful(boolean paymentSuccessful) {
        this.paymentSuccessful = paymentSuccessful;
    }

    public boolean isInventorySuccessful() {
        return inventorySuccessful;
    }

    public void setInventorySuccessful(boolean inventorySuccessful) {
        this.inventorySuccessful = inventorySuccessful;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }
}
