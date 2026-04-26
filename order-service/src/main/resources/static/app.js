const form = document.getElementById("orderForm");
const submitState = document.getElementById("submitState");
const apiStatus = document.getElementById("apiStatus");
const apiStatusText = document.getElementById("apiStatusText");
const activeOrder = document.getElementById("activeOrder");
const orderList = document.getElementById("orderList");
const orderCount = document.getElementById("orderCount");
const eventFeed = document.getElementById("eventFeed");
const clearFeed = document.getElementById("clearFeed");
const replayButton = document.getElementById("replayButton");
const flowBoard = document.getElementById("flowBoard");
const packetLayer = document.getElementById("packetLayer");

let lastOrder = null;
let pollTimer = null;

const baseFlow = [
    ["client", "order-api", "POST", "success"],
    ["order-api", "order-topic", "order_created", "success"],
    ["order-topic", "payment-service", "consume", "success"],
    ["order-topic", "inventory-service", "consume", "success"],
    ["payment-service", "payment-topic", "payment result", "success"],
    ["inventory-service", "inventory-topic", "inventory result", "success"],
    ["payment-topic", "notification-service", "notify", "success"],
    ["inventory-topic", "notification-service", "notify", "success"],
    ["order-api", "logs-topic", "INFO log", "warn"],
    ["payment-service", "logs-topic", "payment log", "warn"],
    ["inventory-service", "logs-topic", "inventory log", "warn"],
    ["notification-service", "logs-topic", "notify log", "warn"]
];

const errorFlow = [
    ["logs-topic", "log-processor", "ERROR only", "error"],
    ["log-processor", "mysql", "persist", "error"]
];

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const sku = document.getElementById("sku").value;
    const quantity = Number(document.getElementById("quantity").value);
    const amount = Number(document.getElementById("amount").value);

    setSubmitting(true);
    try {
        const response = await fetch("/orders", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                items: [{sku, quantity}],
                amount
            })
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const order = await response.json();
        lastOrder = order;
        activeOrder.textContent = `Order ${shortId(order.orderId)} moving through Kafka`;
        addFeed("REST", `Created order ${shortId(order.orderId)} with correlation ${shortId(order.correlationId)}`);
        animateJourney(order, sku === "UNKNOWN" || amount <= 0);
        await refreshOrders();
    } catch (error) {
        addFeed("ERROR", readableError(error.message));
    } finally {
        setSubmitting(false);
    }
});

clearFeed.addEventListener("click", () => {
    eventFeed.innerHTML = "";
});

replayButton.addEventListener("click", () => {
    if (!lastOrder) {
        addFeed("Replay", "No order is available");
        return;
    }
    const hasFailure = lastOrder.status === "FAILED" || Boolean(lastOrder.failureReason);
    animateJourney(lastOrder, hasFailure);
});

window.addEventListener("resize", () => {
    packetLayer.innerHTML = "";
});

startPolling();

function setSubmitting(isSubmitting) {
    const button = form.querySelector("button");
    button.disabled = isSubmitting;
    submitState.textContent = isSubmitting ? "Sending" : "Ready";
}

function startPolling() {
    refreshOrders();
    pollTimer = window.setInterval(refreshOrders, 1800);
}

async function refreshOrders() {
    try {
        const response = await fetch("/orders");
        if (!response.ok) {
            throw new Error("API unavailable");
        }
        const orders = await response.json();
        apiStatus.className = "status-pill ok";
        apiStatusText.textContent = "API online";
        renderOrders(orders);
    } catch (error) {
        apiStatus.className = "status-pill fail";
        apiStatusText.textContent = "API offline";
        orderList.innerHTML = `<p class="empty">Order API unavailable</p>`;
    }
}

function renderOrders(orders) {
    orderCount.textContent = String(orders.length);
    if (!orders.length) {
        orderList.innerHTML = `<p class="empty">No orders yet</p>`;
        return;
    }

    orderList.innerHTML = orders.slice(0, 8).map((order) => {
        const statusClass = order.status.toLowerCase();
        const skuText = order.items.map((item) => `${item.sku} x${item.quantity}`).join(", ");
        const failure = order.failureReason ? `<div class="meta-row">${escapeHtml(order.failureReason)}</div>` : "";
        return `
            <article class="order-card ${statusClass}">
                <div class="meta-row">
                    <span class="badge ${statusClass}">${order.status}</span>
                    <span>${formatMoney(order.amount)}</span>
                </div>
                <strong>${shortId(order.orderId)}</strong>
                <div class="meta-row">
                    <span>${escapeHtml(skuText)}</span>
                    <span>${new Date(order.createdAt).toLocaleTimeString()}</span>
                </div>
                ${failure}
            </article>
        `;
    }).join("");
}

function animateJourney(order, hasFailure) {
    packetLayer.innerHTML = "";
    document.querySelectorAll(".node.active").forEach((node) => node.classList.remove("active"));

    const flow = hasFailure ? [...baseFlow, ...errorFlow] : baseFlow;
    flow.forEach(([from, to, label, type], index) => {
        window.setTimeout(() => {
            movePacket(from, to, label, type);
            addFeed(label, `${shortId(order.orderId)}: ${nodeLabel(from)} -> ${nodeLabel(to)}`);
        }, index * 360);
    });
}

function movePacket(fromKey, toKey, label, type) {
    const from = nodeCenter(fromKey);
    const to = nodeCenter(toKey);
    if (!from || !to) {
        return;
    }

    activateNode(fromKey);
    const packet = document.createElement("div");
    packet.className = `packet ${type}`;
    packet.textContent = label;
    packet.style.transform = `translate(${from.x}px, ${from.y}px) translate(-50%, -50%)`;
    packetLayer.appendChild(packet);

    window.requestAnimationFrame(() => {
        packet.style.transform = `translate(${to.x}px, ${to.y}px) translate(-50%, -50%)`;
    });

    window.setTimeout(() => {
        activateNode(toKey);
        packet.style.opacity = "0";
    }, 820);

    window.setTimeout(() => {
        packet.remove();
    }, 1050);
}

function nodeCenter(key) {
    const node = document.querySelector(`[data-node="${key}"]`);
    if (!node) {
        return null;
    }
    const boardRect = flowBoard.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    return {
        x: nodeRect.left - boardRect.left + nodeRect.width / 2,
        y: nodeRect.top - boardRect.top + nodeRect.height / 2
    };
}

function activateNode(key) {
    const node = document.querySelector(`[data-node="${key}"]`);
    if (!node) {
        return;
    }
    node.classList.add("active");
    window.setTimeout(() => node.classList.remove("active"), 950);
}

function addFeed(kind, message) {
    const row = document.createElement("div");
    row.className = "event-row";
    row.innerHTML = `<strong>${escapeHtml(kind)}</strong><span>${escapeHtml(message)}</span>`;
    eventFeed.prepend(row);
    while (eventFeed.children.length > 18) {
        eventFeed.lastChild.remove();
    }
}

function nodeLabel(key) {
    const node = document.querySelector(`[data-node="${key}"] strong`);
    return node ? node.textContent : key;
}

function shortId(value) {
    if (!value) {
        return "n/a";
    }
    return value.length > 8 ? value.substring(0, 8) : value;
}

function formatMoney(value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(amount);
}

function readableError(message) {
    if (!message) {
        return "Request failed";
    }
    return message.replaceAll("{", "").replaceAll("}", "");
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
