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
		path := r.URL.Path

		if strings.HasPrefix(path, "/organizations/") && len(path) > len("/organizations/") {
			handlers.HandleOrganizationDetail(w, r)
			return
		}
		if strings.HasPrefix(path, "/ideas/") && len(path) > len("/ideas/") {
			handlers.HandleIdeaDetail(w, r)
			return
		}

		switch path {
		case "/":
			handlers.HandleLanding(w, r)
		case "/about":
			handlers.HandleAbout(w, r)
		case "/dashboard":
			handlers.HandleDashboard(w, r)
		case "/portfolio", "/profile":
			handlers.HandlePortfolio(w, r)
		case "/organizations":
			handlers.HandleOrganizationsList(w, r)
		case "/ideas":
			handlers.HandleIdeas(w, r)
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

	// New Feature API Endpoints: Organizations, Ideas & Roles
	mux.HandleFunc("/api/organizations", handlers.HandleCreateOrganization)
	mux.HandleFunc("/api/organizations/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/updates") {
			handlers.HandleAddOrgUpdate(w, r)
			return
		}
		if strings.HasSuffix(r.URL.Path, "/members") {
			handlers.HandleAddOrgMember(w, r)
			return
		}
		if strings.HasSuffix(r.URL.Path, "/projects") {
			handlers.HandleAddOrgProject(w, r)
			return
		}
		if strings.HasSuffix(r.URL.Path, "/products") {
			handlers.HandleAddOrgProduct(w, r)
			return
		}
		http.NotFound(w, r)
	})

	mux.HandleFunc("/api/ideas", handlers.HandleCreateIdea)
	mux.HandleFunc("/api/ideas/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/timeline") {
			handlers.HandleAddIdeaTimeline(w, r)
			return
		}
		if strings.HasSuffix(r.URL.Path, "/stage") {
			handlers.HandleUpdateIdeaStage(w, r)
			return
		}
		if strings.HasSuffix(r.URL.Path, "/promote") {
			handlers.HandlePromoteIdeaToProject(w, r)
			return
		}
		http.NotFound(w, r)
	})

	mux.HandleFunc("/api/roles", handlers.HandleAddRole)
	mux.HandleFunc("/api/roles/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/delete") {
			handlers.HandleDeleteRole(w, r)
			return
		}
		http.NotFound(w, r)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("Proofolio server live on http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Server exited: %v", err)
	}
}
