package com.example.orderservice.controller;

import com.example.common.events.OrderItem;

import java.math.BigDecimal;
import java.util.List;

public record CreateOrderRequest(List<OrderItem> items, BigDecimal amount) {
}
