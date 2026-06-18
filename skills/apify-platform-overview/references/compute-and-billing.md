# Compute and billing

## Resource allocation

Every Actor run gets a Docker container with three resources determined by the memory setting:

| Memory | CPU | Disk |
|---|---|---|
| 128 MB | 0.03 cores | 256 MB |
| 256 MB | 0.06 cores | 512 MB |
| 512 MB | 0.13 cores | 1,024 MB |
| 1,024 MB | 0.25 cores | 2,048 MB |
| 2,048 MB | 0.50 cores | 4,096 MB |
| 4,096 MB | 1 core | 8,192 MB |
| 8,192 MB | 2 cores | 16,384 MB |
| 16,384 MB | 4 cores | 32,768 MB |
| 32,768 MB | 8 cores | 65,536 MB |

Memory must be a power of 2. CPU scales linearly: 1 full core per 4,096 MB. Disk is always 2x memory.

Actors receive a temporary CPU boost during startup to accelerate initialization.

## Compute units

The primary billing metric is **compute units (CU)**:

```
1 CU = 1 GB memory × 1 hour
```

Examples:
- 1,024 MB for 1 hour = 1 CU
- 4,096 MB for 15 minutes = 1 CU
- 512 MB for 30 minutes = 0.25 CU

## Total cost components

A run's total cost comprises:

1. **Compute units** — memory × time
2. **Data transfer** — egress charges for data leaving the platform
3. **Proxy costs** — datacenter (per request), residential (per GB transferred), SERP (per request)
4. **Storage operations** — API calls to datasets, KV stores, and request queues

## Recommendations for memory allocation

- **Crawlee-based Actors (HTTP/Cheerio):** Start with 4,096 MB for balanced cost/performance
- **Browser-based Actors (Playwright/Puppeteer):** Minimum 1,024 MB; use 4,096 MB+ for complex sites
- **Node.js single-threaded limitation:** Allocating beyond 4,096 MB provides no benefit unless the Actor uses multi-threaded libraries or subprocess parallelism
- **Python Actors:** Similar guidelines; memory-intensive libraries (pandas, ML models) may need 8,192 MB+

## Pay-per-event Actors (from the Store)

Some Store Actors charge per event (per result, per search, etc.) instead of per compute unit:
- The event price may or may not include platform compute costs
- You can set a `maxTotalChargeUsd` limit per run to cap spending
- Check the Actor's pricing page before use

## Cost optimization tips

- Use the smallest memory allocation that doesn't slow down the run
- Prefer CheerioCrawler over browser-based crawlers when possible (10x faster, lower resource usage)
- Use datacenter proxy instead of residential when the target site allows it
- Set timeouts to prevent runaway runs
- Use incremental crawling (named request queues) to avoid re-scraping
- Monitor costs per run with the platform's built-in monitoring
