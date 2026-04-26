package com.example.orderservice.config;

import com.example.common.events.KafkaTopics;
import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaTopicConfig {
    @Bean
    NewTopic orderTopic() {
        return TopicBuilder.name(KafkaTopics.ORDER_TOPIC).partitions(3).replicas(1).build();
    }

    @Bean
    NewTopic paymentTopic() {
        return TopicBuilder.name(KafkaTopics.PAYMENT_TOPIC).partitions(3).replicas(1).build();
    }

    @Bean
    NewTopic inventoryTopic() {
        return TopicBuilder.name(KafkaTopics.INVENTORY_TOPIC).partitions(3).replicas(1).build();
    }

    @Bean
    NewTopic logsTopic() {
        return TopicBuilder.name(KafkaTopics.LOGS_TOPIC).partitions(3).replicas(1).build();
    }

    @Bean
    NewTopic logsDlq() {
        return TopicBuilder.name(KafkaTopics.LOGS_DLQ).partitions(3).replicas(1).build();
    }
}
