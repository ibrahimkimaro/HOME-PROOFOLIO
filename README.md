# Proofolio — Systems Engineering Portfolio & Proof-of-Work Platform

A hypermedia-driven engineering portfolio, verified proof-of-work showcase, and client contract engagement platform built with **Go (Golang)**, **PostgreSQL**, **HTML5**, and **HTMX**.

---

## Architecture Highlights

- **Backend**: Go (Go 1.26 standard library `net/http` router with high-throughput database connection pooling).
- **Database**: PostgreSQL (`home_proofolio_db`) with automatic table migrations and initial seed migration.
- **Frontend**: Pure HTML5 templates + **HTMX 2.x** with zero external JavaScript frameworks (no React, no Node.js runtime).
- **Aesthetics & UI**: Modern obsidian glassmorphism, responsive CSS grid/flexbox layouts, accessible `<dialog>` modals, and Google Fonts (`Plus Jakarta Sans`, `JetBrains Mono`).

---

## Database Configuration

- **Database**: `home_proofolio_db`
- **Username**: `ibrahim_kimaro`
- **Password**: `kimmy001`
- **Connection URL**: `postgres://ibrahim_kimaro:kimmy001@localhost:5432/home_proofolio_db?sslmode=disable`

---

## Running the Application

### 1. Build and Run
```bash
go run main.go
```
Or build the standalone binary:
```bash
go build -o proofolio main.go
./proofolio
```

Visit the application at [http://localhost:3000](http://localhost:3000).

---

## Platform Features

1. **Verified Engineering Portfolio**:
   - Production systems & projects with architecture highlights, performance metrics, and repository links.
   - 4-step proof-of-work case studies: *Observed Symptoms* &rarr; *Root Cause Analysis* &rarr; *Engineered Solution* &rarr; *Measured Outcome*.
   - Verified peer and client endorsements.

2. **Discover Specialists**:
   - Searchable ecosystem directory of vetted engineers and specialists.

3. **Technical Discussions**:
   - Low-latency forum with HTMX-powered upvoting, threaded replies, and real-time counter updates.

4. **Technical Articles & Whitepapers**:
   - Long-form deep dives with tags and reading estimates.

5. **Opportunities & Contracts**:
   - Job/contract board with direct application modal powered by HTMX.

6. **Client Contract Engagements**:
   - Instant proposal request dialog saving inquiries directly to PostgreSQL.
