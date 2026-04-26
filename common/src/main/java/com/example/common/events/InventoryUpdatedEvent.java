package com.example.common.events;

import java.time.Instant;

public record InventoryUpdatedEvent(
        String eventId,
        String correlationId,
        String orderId,
        boolean success,
        String reason,
        Instant timestamp
) {
}
