package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"home_proofolio/internal/db"
	"home_proofolio/internal/devreload"
	"home_proofolio/internal/handlers"
)

func main() {
	log.Println("Starting Proofolio Platform Server (Go + PostgreSQL + HTMX)...")

	// 1. Initialize PostgreSQL Connection, Migrations & Seeding
	_, err := db.InitDB()
	if err != nil {
		log.Fatalf("Fatal: Database initialization failed: %v", err)
	}

	mux := http.NewServeMux()

	// 2. Live Reload SSE Endpoint for instant Hot Reload
	mux.HandleFunc("/dev/live-reload", devreload.HandleSSE)

	// 3. Static Asset Server (CSS, JS, Generated Visuals)
	fs := http.FileServer(http.Dir("static"))
	mux.Handle("/static/", http.StripPrefix("/static/", fs))

	// 3. Page Routes
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/":
			handlers.HandleLanding(w, r)
		case "/about":
			handlers.HandleAbout(w, r)
		case "/dashboard":
			handlers.HandleDashboard(w, r)
		case "/portfolio":
			handlers.HandlePortfolio(w, r)
		case "/inquiries":
			handlers.HandleInquiries(w, r)
		case "/discover":
			handlers.HandleDiscover(w, r)
		case "/discussions":
			handlers.HandleDiscussions(w, r)
		case "/articles":
			handlers.HandleArticles(w, r)
		case "/opportunities":
			handlers.HandleOpportunities(w, r)
		case "/login":
			handlers.HandleLoginView(w, r)
		case "/register":
			handlers.HandleRegisterView(w, r)
		default:
			http.NotFound(w, r)
		}
	})

	// 4. Auth Routes
	mux.HandleFunc("/auth/login", handlers.HandleLogin)
	mux.HandleFunc("/auth/register", handlers.HandleRegister)
	mux.HandleFunc("/auth/logout", handlers.HandleLogout)

	// 5. API Routes (HTMX Hypermedia Actions)
	mux.HandleFunc("/api/inquiries", handlers.HandleCreateInquiry)
	mux.HandleFunc("/api/projects", handlers.HandleCreateProject)
	mux.HandleFunc("/api/problems", handlers.HandleCreateProblem)
	mux.HandleFunc("/api/discussions", handlers.HandleCreateDiscussion)
	mux.HandleFunc("/api/discussions/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/reply") {
			handlers.HandleReplyDiscussion(w, r)
			return
		}
		if strings.HasSuffix(r.URL.Path, "/upvote") {
			handlers.HandleUpvoteDiscussion(w, r)
			return
		}
		http.NotFound(w, r)
	})
	mux.HandleFunc("/api/articles", handlers.HandleCreateArticle)
	mux.HandleFunc("/api/articles/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/upvote") {
			handlers.HandleUpvoteArticle(w, r)
			return
		}
		http.NotFound(w, r)
	})
	mux.HandleFunc("/api/opportunities", handlers.HandlePostOpportunity)
	mux.HandleFunc("/api/opportunities/apply", handlers.HandleApplyOpportunity)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("Proofolio server live on http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Server exited: %v", err)
	}
}
