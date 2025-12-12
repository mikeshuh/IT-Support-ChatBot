# Scaling Strategy

This document outlines the architectural decisions and strategies for scaling the IT Support ChatBot to handle production workloads.

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Docker Compose                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐    │
│  │  Next.js    │     │    MCP      │     │    PostgreSQL       │    │
│  │    App      │────▶│   Server    │────▶│    + pgvector       │    │
│  │  (port 3000)│     │   (stdio)   │     │    (port 5433)      │    │
│  └─────────────┘     └─────────────┘     └─────────────────────┘    │
│        │                                        │                   │
│        │              ┌─────────────┐           │                   │
│        └─────────────▶│   Google    │◀──────────┘                   │
│                       │  Gemini API │                               │
│                       └─────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Role | Current State |
|-----------|------|---------------|
| **Next.js App** | UI + API Routes + Agent Orchestration | Single container |
| **MCP Server** | Ticket CRUD operations | Single container |
| **PostgreSQL + pgvector** | Tickets + Vector embeddings | Single container |
| **Google Gemini** | LLM inference | External API |

---

## Containerization Benefits

The Docker Compose setup provides several scaling advantages:

### 1. Environment Consistency
```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/it_support
      - GOOGLE_GENERATIVE_AI_API_KEY=${GOOGLE_GENERATIVE_AI_API_KEY}
```
- Identical environments across development, staging, and production
- No "works on my machine" issues
- Easy secrets management via environment variables

### 2. Service Isolation
- Each component runs in its own container
- Independent scaling and resource allocation
- Failure isolation (one service crash doesn't affect others)

### 3. Easy Deployment
```bash
# Deploy entire stack
docker compose up -d

# Rebuild after changes
docker compose up --build -d

# Scale specific service
docker compose up -d --scale app=3
```

---

## Scaling Strategies

### Horizontal Scaling (Multi-Instance)

#### Application Layer

```yaml
# docker-compose.scale.yml
services:
  app:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    depends_on:
      - app
    # Load balancer configuration
```

**Load Balancing Options:**
- **NGINX** - Reverse proxy with round-robin
- **Traefik** - Dynamic service discovery
- **Cloud LB** - AWS ALB, GCP Load Balancer

#### Database Layer

```yaml
# Primary-Replica setup
services:
  db-primary:
    image: pgvector/pgvector:pg16
    environment:
      - POSTGRES_REPLICATION_MODE=master
      
  db-replica:
    image: pgvector/pgvector:pg16
    environment:
      - POSTGRES_REPLICATION_MODE=slave
      - POSTGRES_MASTER_HOST=db-primary
```

---

### Vertical Scaling (Resource Increase)

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 8G
        reservations:
          cpus: '2.0'
          memory: 4G
```

---

## Kubernetes Deployment

For production-scale deployments, migrate to Kubernetes:

### Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: it-support-chatbot
spec:
  replicas: 3
  selector:
    matchLabels:
      app: it-support-chatbot
  template:
    metadata:
      labels:
        app: it-support-chatbot
    spec:
      containers:
      - name: app
        image: it-support-chatbot:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: GOOGLE_GENERATIVE_AI_API_KEY
          valueFrom:
            secretKeyRef:
              name: api-keys
              key: gemini
        resources:
          limits:
            cpu: "1"
            memory: "1Gi"
          requests:
            cpu: "500m"
            memory: "512Mi"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: it-support-chatbot-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: it-support-chatbot
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Service & Ingress

```yaml
apiVersion: v1
kind: Service
metadata:
  name: it-support-chatbot
spec:
  selector:
    app: it-support-chatbot
  ports:
  - port: 80
    targetPort: 3000
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: it-support-chatbot
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
  - host: support.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: it-support-chatbot
            port:
              number: 80
```

---

## Component-Specific Scaling

### 1. Vector Database (pgvector)

**Scaling Challenges:**
- Similarity search is CPU-intensive
- Large embedding tables require significant memory

**Solutions:**
| Scale Level | Solution |
|-------------|----------|
| Small (< 100K vectors) | Single PostgreSQL instance |
| Medium (100K - 1M) | Read replicas + connection pooling |
| Large (1M+) | Dedicated vector DB (Pinecone, Weaviate, Qdrant) |

**Connection Pooling:**
```yaml
services:
  pgbouncer:
    image: pgbouncer/pgbouncer
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/it_support
      - POOL_MODE=transaction
      - MAX_CLIENT_CONN=1000
```

### 2. LLM API (Google Gemini)

**Rate Limiting Considerations:**
- Implement request queuing
- Use exponential backoff for retries
- Consider caching common responses

```typescript
// Rate limiter example
const rateLimiter = new RateLimiter({
  tokensPerInterval: 100,
  interval: "minute"
});

async function callLLM(prompt: string) {
  await rateLimiter.removeTokens(1);
  return generateText({ model: google("gemini-2.5-flash"), prompt });
}
```

### 3. Session Management

For multi-instance deployments, use centralized session storage:

```yaml
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

---

## Caching Strategy

### Response Caching

```typescript
// Redis-based response cache
const cache = new Redis(process.env.REDIS_URL);

async function getCachedResponse(query: string): Promise<string | null> {
  const hash = createHash('sha256').update(query).digest('hex');
  return cache.get(`response:${hash}`);
}

async function cacheResponse(query: string, response: string): Promise<void> {
  const hash = createHash('sha256').update(query).digest('hex');
  await cache.setex(`response:${hash}`, 3600, response); // 1 hour TTL
}
```

### Embedding Cache

```typescript
// Cache embeddings to reduce API calls
async function getEmbedding(text: string): Promise<number[]> {
  const cacheKey = `embedding:${createHash('sha256').update(text).digest('hex')}`;
  const cached = await cache.get(cacheKey);
  
  if (cached) return JSON.parse(cached);
  
  const embedding = await generateEmbedding(text);
  await cache.setex(cacheKey, 86400, JSON.stringify(embedding)); // 24 hour TTL
  
  return embedding;
}
```

---

## Monitoring & Observability

### Metrics to Track

| Metric | Type | Alert Threshold |
|--------|------|-----------------|
| Request latency (p95) | Histogram | > 5s |
| Error rate | Counter | > 1% |
| Active connections | Gauge | > 80% capacity |
| LLM API latency | Histogram | > 3s |
| Vector search latency | Histogram | > 500ms |
| Memory usage | Gauge | > 85% |

### Prometheus + Grafana Stack

```yaml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    depends_on:
      - prometheus
```

---

## Cost Optimization

### LLM Cost Reduction
1. **Prompt optimization** - Shorter prompts = lower costs
2. **Response caching** - Cache common Q&A pairs
3. **Model selection** - Use cheaper models for classification

### Infrastructure Cost Reduction
1. **Auto-scaling** - Scale down during low traffic
2. **Spot instances** - Use for non-critical workloads
3. **Reserved capacity** - For predictable base load

---

## Production Checklist

- [ ] Load balancer configured with health checks
- [ ] Database connection pooling enabled
- [ ] Redis caching layer deployed
- [ ] Horizontal Pod Autoscaler configured
- [ ] Centralized logging (ELK/Loki)
- [ ] Monitoring dashboards created
- [ ] Alerting rules defined
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan documented
- [ ] Rate limiting configured for API endpoints
