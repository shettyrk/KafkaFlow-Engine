package com.example.logprocessingservice.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "error_logs")
public class ErrorLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String service;

    @Column(nullable = false)
    private String level;

    @Column(nullable = false, length = 2000)
    private String message;

    private String correlationId;

    @Column(nullable = false)
    private Instant eventTimestamp;

    @Column(nullable = false)
    private Instant storedAt;

    protected ErrorLog() {
    }

    public ErrorLog(String service, String level, String message, String correlationId, Instant eventTimestamp) {
        this.service = service;
        this.level = level;
        this.message = message;
        this.correlationId = correlationId;
        this.eventTimestamp = eventTimestamp;
        this.storedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getService() {
        return service;
    }

    public String getLevel() {
        return level;
    }

    public String getMessage() {
        return message;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public Instant getEventTimestamp() {
        return eventTimestamp;
    }

    public Instant getStoredAt() {
        return storedAt;
    }
}
