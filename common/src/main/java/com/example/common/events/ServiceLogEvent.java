package com.example.common.events;

import java.time.Instant;

public record ServiceLogEvent(
        String service,
        String level,
        String message,
        String correlationId,
        Instant timestamp
) {
}
