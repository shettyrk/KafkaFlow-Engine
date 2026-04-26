package com.example.common.events;

public final class KafkaTopics {
    public static final String ORDER_TOPIC = "order-topic";
    public static final String PAYMENT_TOPIC = "payment-topic";
    public static final String INVENTORY_TOPIC = "inventory-topic";
    public static final String LOGS_TOPIC = "logs-topic";
    public static final String LOGS_DLQ = "logs-dlq";

    private KafkaTopics() {
    }
}
