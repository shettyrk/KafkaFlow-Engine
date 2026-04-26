package com.example.common.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderCreatedEvent(
        String eventId,
        String correlationId,
        String orderId,
        List<OrderItem> items,
        BigDecimal amount,
        Instant timestamp
) {
}
