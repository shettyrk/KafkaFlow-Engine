package com.example.logprocessingservice.repository;

import com.example.logprocessingservice.model.ErrorLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ErrorLogRepository extends JpaRepository<ErrorLog, Long> {
}
