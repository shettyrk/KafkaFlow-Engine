package com.example.logprocessingservice.service;

import com.example.common.events.KafkaTopics;
import com.example.common.events.ServiceLogEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class DeadLetterListener {
    private static final Logger log = LoggerFactory.getLogger(DeadLetterListener.class);

    @KafkaListener(topics = KafkaTopics.LOGS_DLQ, groupId = "log-processing-dlq-monitor")
    public void onDeadLetter(ServiceLogEvent event) {
        log.error("Log message moved to DLQ service={} level={} correlationId={} message={}",
                event.service(),
                event.level(),
                event.correlationId(),
                event.message());
    }
}
