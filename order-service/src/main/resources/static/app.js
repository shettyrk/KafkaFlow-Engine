/* ============================================================
   KafkaFlow Engine — Dashboard Logic
   Slow, cinematic data-flow animations with speed control
   ============================================================ */

// DOM references
const form          = document.getElementById("orderForm");
const submitState   = document.getElementById("submitState");
const submitBtn     = document.getElementById("submitBtn");
const apiStatus     = document.getElementById("apiStatus");
const apiStatusText = document.getElementById("apiStatusText");
const activeOrder   = document.getElementById("activeOrder");
const orderList     = document.getElementById("orderList");
const orderCount    = document.getElementById("orderCount");
const eventFeed     = document.getElementById("eventFeed");
const clearFeed     = document.getElementById("clearFeed");
const replayButton  = document.getElementById("replayButton");
const flowBoard     = document.getElementById("flowBoard");
const flowSvg       = document.getElementById("flowSvg");
const packetLayer   = document.getElementById("packetLayer");
const speedSlider   = document.getElementById("speedSlider");
const speedLabel    = document.getElementById("speedLabel");
const particleCanvas = document.getElementById("particleBg");

let lastOrder  = null;
let pollTimer  = null;
let isAnimating = false;

// ── Speed system ─────────────────────────────────────────────
const SPEED_PROFILES = {
    1: { name: "Slow",   stepDelay: 2400, travelMs: 1800, holdMs: 2000, fadeMs: 400 },
    2: { name: "Normal", stepDelay: 1600, travelMs: 1200, holdMs: 1400, fadeMs: 300 },
    3: { name: "Fast",   stepDelay: 1000, travelMs: 800,  holdMs: 1000, fadeMs: 250 },
    4: { name: "Faster", stepDelay: 600,  travelMs: 500,  holdMs: 650,  fadeMs: 200 },
    5: { name: "Turbo",  stepDelay: 360,  travelMs: 300,  holdMs: 400,  fadeMs: 160 }
};

function getSpeed() {
    return SPEED_PROFILES[Number(speedSlider.value)] || SPEED_PROFILES[2];
}

speedSlider.addEventListener("input", () => {
    speedLabel.textContent = getSpeed().name;
});
speedLabel.textContent = getSpeed().name;

// ── Connection edges (for SVG lines) ────────────────────────
const EDGES = [
    ["client",             "order-api"],
    ["order-api",          "order-topic"],
    ["order-topic",        "payment-service"],
    ["order-topic",        "inventory-service"],
    ["payment-service",    "payment-topic"],
    ["inventory-service",  "inventory-topic"],
    ["payment-topic",      "notification-service"],
    ["inventory-topic",    "notification-service"],
    ["order-api",          "logs-topic"],
    ["payment-service",    "logs-topic"],
    ["inventory-service",  "logs-topic"],
    ["notification-service","logs-topic"],
    ["logs-topic",         "log-processor"],
    ["log-processor",      "mysql"]
];

// ── Event flow definitions ───────────────────────────────────
const baseFlow = [
    ["client",              "order-api",           "POST",            "success"],
    ["order-api",           "order-topic",         "order_created",   "success"],
    ["order-topic",         "payment-service",     "consume",         "success"],
    ["order-topic",         "inventory-service",   "consume",         "success"],
    ["payment-service",     "payment-topic",       "payment result",  "success"],
    ["inventory-service",   "inventory-topic",     "inventory result", "success"],
    ["payment-topic",       "notification-service","notify",          "success"],
    ["inventory-topic",     "notification-service","notify",          "success"],
    ["order-api",           "logs-topic",          "INFO log",        "warn"],
    ["payment-service",     "logs-topic",          "payment log",     "warn"],
    ["inventory-service",   "logs-topic",          "inventory log",   "warn"],
    ["notification-service","logs-topic",          "notify log",      "warn"]
];

const errorFlow = [
    ["logs-topic",    "log-processor", "ERROR only", "error"],
    ["log-processor", "mysql",         "persist",    "error"]
];

// ── Particle background ──────────────────────────────────────
(function initParticles() {
    const ctx = particleCanvas.getContext("2d");
    let width, height;
    const particles = [];
    const PARTICLE_COUNT = 60;

    function resize() {
        width  = particleCanvas.width  = window.innerWidth;
        height = particleCanvas.height = window.innerHeight;
    }

    function createParticle() {
        return {
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            radius: Math.random() * 1.5 + 0.5,
            alpha: Math.random() * 0.3 + 0.05
        };
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(129, 140, 248, ${p.alpha})`;
            ctx.fill();
        }

        // Draw faint connection lines between nearby particles
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(129, 140, 248, ${0.04 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(draw);
    }

    resize();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(createParticle());
    }
    draw();
    window.addEventListener("resize", resize);
})();

// ── Draw SVG connection lines ────────────────────────────────
function drawLines() {
    flowSvg.innerHTML = "";
    const boardRect = flowBoard.getBoundingClientRect();
    flowSvg.setAttribute("viewBox", `0 0 ${boardRect.width} ${boardRect.height}`);

    for (const [fromKey, toKey] of EDGES) {
        const from = nodeCenter(fromKey);
        const to   = nodeCenter(toKey);
        if (!from || !to) continue;

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", from.x);
        line.setAttribute("y1", from.y);
        line.setAttribute("x2", to.x);
        line.setAttribute("y2", to.y);
        line.dataset.from = fromKey;
        line.dataset.to   = toKey;
        flowSvg.appendChild(line);
    }
}

function activateLine(fromKey, toKey) {
    const line = flowSvg.querySelector(`line[data-from="${fromKey}"][data-to="${toKey}"]`);
    if (line) {
        line.classList.add("active");
        const speed = getSpeed();
        setTimeout(() => line.classList.remove("active"), speed.holdMs);
    }
}

// ── Form submit ──────────────────────────────────────────────
form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isAnimating) return;

    const sku      = document.getElementById("sku").value;
    const quantity = Number(document.getElementById("quantity").value);
    const amount   = Number(document.getElementById("amount").value);

    setSubmitting(true);
    try {
        const response = await fetch("/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: [{ sku, quantity }], amount })
        });

        if (!response.ok) throw new Error(await response.text());

        const order = await response.json();
        lastOrder = order;
        activeOrder.textContent = `Order ${shortId(order.orderId)} traversing Kafka pipeline…`;
        addFeed("REST", `Created order ${shortId(order.orderId)} with correlation ${shortId(order.correlationId)}`);
        animateJourney(order, sku === "UNKNOWN" || amount <= 0);
        await refreshOrders();
    } catch (error) {
        addFeed("ERROR", readableError(error.message));
    } finally {
        setSubmitting(false);
    }
});

clearFeed.addEventListener("click", () => { eventFeed.innerHTML = ""; });

replayButton.addEventListener("click", () => {
    if (isAnimating) {
        addFeed("Replay", "Animation in progress — please wait");
        return;
    }
    if (!lastOrder) {
        addFeed("Replay", "No order to replay");
        return;
    }
    const hasFailure = lastOrder.status === "FAILED" || Boolean(lastOrder.failureReason);
    animateJourney(lastOrder, hasFailure);
});

// ── Resize handler ───────────────────────────────────────────
let resizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        packetLayer.innerHTML = "";
        drawLines();
    }, 200);
});

// ── Init ─────────────────────────────────────────────────────
startPolling();
requestAnimationFrame(drawLines);

// ── Helpers ──────────────────────────────────────────────────
function setSubmitting(on) {
    submitBtn.disabled = on;
    submitState.textContent = on ? "Sending…" : "Ready";
    submitState.className = "status-badge" + (on ? " sending" : "");
}

function startPolling() {
    refreshOrders();
    pollTimer = setInterval(refreshOrders, 3000);
}

async function refreshOrders() {
    try {
        const response = await fetch("/orders");
        if (!response.ok) throw new Error("API unavailable");
        const orders = await response.json();
        apiStatus.className = "status-pill ok";
        apiStatusText.textContent = "API Online";
        renderOrders(orders);
    } catch {
        apiStatus.className = "status-pill fail";
        apiStatusText.textContent = "API Offline";
        orderList.innerHTML = `<p class="empty">⚠ Order API unavailable</p>`;
    }
}

function renderOrders(orders) {
    orderCount.textContent = String(orders.length);
    if (!orders.length) {
        orderList.innerHTML = `<p class="empty">No orders yet — create one above</p>`;
        return;
    }

    orderList.innerHTML = orders.slice(0, 10).map((order) => {
        const statusClass = order.status.toLowerCase();
        const skuText = order.items.map((i) => `${i.sku} ×${i.quantity}`).join(", ");
        const failure = order.failureReason
            ? `<div class="meta-row" style="color:var(--red)">${escapeHtml(order.failureReason)}</div>`
            : "";
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

// ── Animation engine ─────────────────────────────────────────
function animateJourney(order, hasFailure) {
    packetLayer.innerHTML = "";
    document.querySelectorAll(".node.active").forEach(n => n.classList.remove("active"));
    isAnimating = true;

    const flow  = hasFailure ? [...baseFlow, ...errorFlow] : baseFlow;
    const speed = getSpeed();

    flow.forEach(([from, to, label, type], index) => {
        setTimeout(() => {
            movePacket(from, to, label, type);
            activateLine(from, to);
            addFeed(label, `${shortId(order.orderId)}: ${nodeLabel(from)} → ${nodeLabel(to)}`);
        }, index * speed.stepDelay);
    });

    // Clear animating flag after full flow completes
    setTimeout(() => {
        isAnimating = false;
        activeOrder.textContent = `Order ${shortId(order.orderId)} — flow complete ✓`;
    }, flow.length * speed.stepDelay + speed.travelMs + 200);
}

function movePacket(fromKey, toKey, label, type) {
    const from = nodeCenter(fromKey);
    const to   = nodeCenter(toKey);
    if (!from || !to) return;

    const speed = getSpeed();

    activateNode(fromKey);
    const packet = document.createElement("div");
    packet.className = `packet ${type}`;
    packet.textContent = label;

    // Start position (invisible)
    packet.style.left = from.x + "px";
    packet.style.top  = from.y + "px";
    packet.style.opacity = "0";
    packet.style.transition = `
        left ${speed.travelMs}ms cubic-bezier(0.25, 0.1, 0.25, 1),
        top ${speed.travelMs}ms cubic-bezier(0.25, 0.1, 0.25, 1),
        opacity ${speed.fadeMs}ms ease
    `;
    packetLayer.appendChild(packet);

    // Fade in at source
    requestAnimationFrame(() => {
        packet.style.opacity = "1";

        // Begin travel after a brief hold at source
        setTimeout(() => {
            packet.style.left = to.x + "px";
            packet.style.top  = to.y + "px";
        }, 150);
    });

    // Activate destination node
    setTimeout(() => {
        activateNode(toKey);
    }, speed.travelMs + 150);

    // Fade out
    setTimeout(() => {
        packet.style.opacity = "0";
    }, speed.travelMs + speed.holdMs);

    // Remove
    setTimeout(() => {
        packet.remove();
    }, speed.travelMs + speed.holdMs + speed.fadeMs);
}

function nodeCenter(key) {
    const node = document.querySelector(`[data-node="${key}"]`);
    if (!node) return null;
    const boardRect = flowBoard.getBoundingClientRect();
    const nodeRect  = node.getBoundingClientRect();
    return {
        x: nodeRect.left - boardRect.left + nodeRect.width / 2,
        y: nodeRect.top  - boardRect.top  + nodeRect.height / 2
    };
}

function activateNode(key) {
    const node = document.querySelector(`[data-node="${key}"]`);
    if (!node) return;
    node.classList.add("active");
    const speed = getSpeed();
    setTimeout(() => node.classList.remove("active"), speed.holdMs);
}

function addFeed(kind, message) {
    const row = document.createElement("div");
    row.className = "event-row";
    row.innerHTML = `<strong>${escapeHtml(kind)}</strong><span>${escapeHtml(message)}</span>`;
    eventFeed.prepend(row);
    while (eventFeed.children.length > 20) {
        eventFeed.lastChild.remove();
    }
}

function nodeLabel(key) {
    const node = document.querySelector(`[data-node="${key}"] strong`);
    return node ? node.textContent : key;
}

function shortId(value) {
    if (!value) return "n/a";
    return value.length > 8 ? value.substring(0, 8) : value;
}

function formatMoney(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(Number(value || 0));
}

function readableError(msg) {
    if (!msg) return "Request failed";
    return msg.replaceAll("{", "").replaceAll("}", "");
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
