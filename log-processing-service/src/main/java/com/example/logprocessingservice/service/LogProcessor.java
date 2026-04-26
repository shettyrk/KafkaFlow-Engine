package com.example.logprocessingservice.service;

import com.example.common.events.KafkaTopics;
import com.example.common.events.ServiceLogEvent;
import com.example.logprocessingservice.model.ErrorLog;
import com.example.logprocessingservice.repository.ErrorLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class LogProcessor {
    private static final Logger log = LoggerFactory.getLogger(LogProcessor.class);

    private final ErrorLogRepository repository;

    public LogProcessor(ErrorLogRepository repository) {
        this.repository = repository;
    }

    @KafkaListener(topics = KafkaTopics.LOGS_TOPIC, groupId = "log-processing-service")
    public void process(ServiceLogEvent event) {
        if (!"ERROR".equalsIgnoreCase(event.level())) {
            return;
        }

        if (event.message() != null && event.message().contains("force-log-failure")) {
            throw new IllegalStateException("Forced log processor failure for DLQ verification");
        }

        ErrorLog saved = repository.save(new ErrorLog(
                event.service(),
                event.level(),
                event.message(),
                event.correlationId(),
                event.timestamp()
        ));
        log.info("Stored error log id={} service={} correlationId={}",
                saved.getId(),
                saved.getService(),
                saved.getCorrelationId());
    }
}
