# Event-Driven Order and Log Processing System

Spring Boot + Apache Kafka microservices demo for asynchronous order processing and centralized log handling.

## Services

| Module | Responsibility |
| --- | --- |
| `order-service` | Exposes `POST /orders`, publishes `order-topic`, tracks order status in memory |
| `payment-service` | Consumes `order-topic`, publishes payment success/failure to `payment-topic` |
| `inventory-service` | Consumes `order-topic`, reserves stock, publishes result to `inventory-topic` |
| `notification-service` | Consumes payment/inventory result topics and simulates notifications through logs |
| `log-processing-service` | Consumes `logs-topic`, stores only `ERROR` logs in MySQL, retries failures, sends poison messages to `logs-dlq` |
| `common` | Shared event contracts and topic names |

## Kafka Topics

| Topic | Purpose |
| --- | --- |
| `order-topic` | Order created events |
| `payment-topic` | Payment result events |
| `inventory-topic` | Inventory result events |
| `logs-topic` | Centralized service logs |
| `logs-dlq` | Failed log-processing messages |

## Run

```bash
docker compose up --build
```

Open the visual dashboard:

```text
http://localhost:8080/
```

Create an order:

```bash
curl -X POST http://localhost:8080/orders \
  -H "Content-Type: application/json" \
  -d "{\"items\":[{\"sku\":\"BOOK\",\"quantity\":1}],\"amount\":499.00}"
```

Check the order status using the returned `orderId`:

```bash
curl http://localhost:8080/orders/<orderId>
```

Generate an error log by using invalid inventory:

```bash
curl -X POST http://localhost:8080/orders \
  -H "Content-Type: application/json" \
  -d "{\"items\":[{\"sku\":\"UNKNOWN\",\"quantity\":1}],\"amount\":499.00}"
```

The `inventory-service` emits an `ERROR` log. The `log-processing-service` stores it in MySQL.

## Build Locally

```bash
mvn clean package
```

## Design Notes

- Services communicate only through Kafka topics.
- Consumer idempotency is implemented with per-service processed event ID caches.
- Topic keys use `orderId` or `correlationId` to keep related records partition-aligned.
- `logs-topic` processing filters non-error logs before persistence.
- Log processing failures retry with exponential backoff and publish to `logs-dlq` after retries are exhausted.
