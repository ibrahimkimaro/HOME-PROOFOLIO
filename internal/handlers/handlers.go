package handlers

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"home_proofolio/internal/auth"
	"home_proofolio/internal/db"
	"home_proofolio/internal/models"

	goldmark "github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	goldmarkhtml "github.com/yuin/goldmark/renderer/html"
)

type PageData struct {
	Title              string
	ActiveNav          string
	Redirect           string
	User               *models.User
	Profile            *models.Profile
	Profiles           []models.Profile
	Projects           []models.Project
	Problems           []models.ProblemCase
	Endorsements       []models.Endorsement
	Discussions        []models.DiscussionPost
	Articles           []models.ArticlePost
	Article            *models.ArticlePost
	Opportunities      []models.Opportunity
	Inquiries          []models.Inquiry
	Roles              []models.UserRole
	Organizations      []models.Organization
	CurrentOrg         *models.Organization
	Ideas              []models.Idea
	CurrentIdea        *models.Idea
	DomainTemplates    []models.DomainTemplate
	PortfolioTemplates []models.PortfolioTemplate
	ActiveFilter       string
	RoleFilter         string
	SuccessMsg         string
	ErrMsg             string
	RenderedContent    template.HTML
}

func generateID(prefix string) string {
	b := make([]byte, 8)
	rand.Read(b)
	return fmt.Sprintf("%s_%s", prefix, hex.EncodeToString(b))
}

func isHTMX(r *http.Request) bool {
	return r.Header.Get("HX-Request") == "true"
}

// Render pre-login Landing Views (with custom landing header & rich footer)
func renderLandingView(w http.ResponseWriter, r *http.Request, pageFile string, data PageData) {
	pagePath := "templates/landing/" + pageFile
	layoutPath := "templates/landing/layout.html"
	footerPath := "templates/landing/footer.html"

	tmpl, err := template.ParseFiles(layoutPath, footerPath, pagePath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Template parse error: %v", err), http.StatusInternalServerError)
		return
	}
	var buf strings.Builder
	if err := tmpl.Execute(&buf, data); err != nil {
		http.Error(w, fmt.Sprintf("Template execute error: %v", err), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(buf.String()))
}

// Render public content pages (discussions, discover, articles) with pre-login landing header & rich footer
func renderPublicContentView(w http.ResponseWriter, r *http.Request, appPageFile string, data PageData) {
	pagePath := "templates/app/" + appPageFile
	layoutPath := "templates/landing/layout.html"
	footerPath := "templates/landing/footer.html"

	tmpl, err := template.ParseFiles(layoutPath, footerPath, pagePath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Template parse error: %v", err), http.StatusInternalServerError)
		return
	}
	var buf strings.Builder
	if err := tmpl.Execute(&buf, data); err != nil {
		http.Error(w, fmt.Sprintf("Template execute error: %v", err), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(buf.String()))
}

// Render independent standalone Auth Views (clean distraction-free layout with return-to-home button & theme toggle)
func renderAuthView(w http.ResponseWriter, r *http.Request, pageFile string, data PageData) {
	pagePath := "templates/landing/" + pageFile
	layoutPath := "templates/landing/auth_layout.html"

	tmpl, err := template.ParseFiles(layoutPath, pagePath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Template parse error: %v", err), http.StatusInternalServerError)
		return
	}
	var buf strings.Builder
	if err := tmpl.Execute(&buf, data); err != nil {
		http.Error(w, fmt.Sprintf("Template execute error: %v", err), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(buf.String()))
}

// Render post-login App Console Views (with workspace header & console tools)
func renderAppView(w http.ResponseWriter, r *http.Request, pageFile string, data PageData) {
	pagePath := "templates/app/" + pageFile
	layoutPath := "templates/app/layout.html"

	if isHTMX(r) && r.Header.Get("HX-Boosted") != "true" && r.Header.Get("HX-Target") == "main-content" {
		tmpl, err := template.ParseFiles(pagePath)
		if err != nil {
			http.Error(w, fmt.Sprintf("Template parse error: %v", err), http.StatusInternalServerError)
			return
		}
		var buf strings.Builder
		if err := tmpl.ExecuteTemplate(&buf, "content", data); err != nil {
			http.Error(w, fmt.Sprintf("Template execute error: %v", err), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write([]byte(buf.String()))
		return
	}

	tmpl, err := template.ParseFiles(layoutPath, pagePath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Template parse error: %v", err), http.StatusInternalServerError)
		return
	}
	var buf strings.Builder
	if err := tmpl.Execute(&buf, data); err != nil {
		http.Error(w, fmt.Sprintf("Template execute error: %v", err), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(buf.String()))
}

// 1. Landing Page (Official Platform View)
func HandleLanding(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	profiles, _ := db.GetAllProfiles()
	problems, _ := db.GetAllProblems()

	data := PageData{
		Title:     "Build. Prove. Connect. — The AI Proof of Work Platform",
		ActiveNav: "home",
		User:      user,
		Profile:   profile,
		Profiles:  profiles,
		Problems:  problems,
	}

	renderLandingView(w, r, "index.html", data)
}

// 2. About Page (Differentiated: Authenticated App Protocol Specs vs Public Landing Mission)
func HandleAbout(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)

	data := PageData{
		Title:     "About Proofolio — Platform Architecture & Proof Protocol",
		ActiveNav: "about",
		User:      user,
		Profile:   profile,
	}

	if user != nil {
		renderAppView(w, r, "about.html", data)
		return
	}

	renderLandingView(w, r, "about.html", data)
}

// 3. Post-Login Console Dashboard
func HandleDashboard(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	if user == nil {
		if isHTMX(r) {
			w.Header().Set("HX-Redirect", "/login?redirect=/dashboard")
			w.WriteHeader(http.StatusOK)
			return
		}
		http.Redirect(w, r, "/login?redirect=/dashboard", http.StatusSeeOther)
		return
	}

	projects, _ := db.GetProjectsByUserID(user.ID)
	if len(projects) == 0 {
		projects, _ = db.GetAllProjects()
	}

	problems, _ := db.GetProblemsByUserID(user.ID)
	if len(problems) == 0 {
		problems, _ = db.GetAllProblems()
	}

	endorsements, _ := db.GetEndorsementsByTargetUser(user.ID)
	inquiries, _ := db.GetInquiriesForUser(user.ID)
	if len(inquiries) == 0 && user.ID == "usr_ibrahim" {
		inquiries, _ = db.GetInquiriesForUser("usr_ibrahim")
	}

	roles, _ := db.GetUserRoles(user.ID)
	orgs, _ := db.GetOrganizationsForUser(user.ID)
	ideas, _ := db.GetIdeasForUser(user.ID)
	articles, _ := db.GetAllArticles()

	displayName := user.Username
	if profile != nil && profile.DisplayName != "" {
		displayName = profile.DisplayName
	}

	domainTemplates, _ := db.GetAllDomainTemplates()
	portfolioTemplates, _ := db.GetAllPortfolioTemplates()

	data := PageData{
		Title:              fmt.Sprintf("%s — Workspace & Multi-Role Console", displayName),
		ActiveNav:          "dashboard",
		User:               user,
		Profile:            profile,
		Projects:           projects,
		Problems:           problems,
		Endorsements:       endorsements,
		Inquiries:          inquiries,
		Roles:              roles,
		Organizations:      orgs,
		Ideas:              ideas,
		Articles:           articles,
		DomainTemplates:    domainTemplates,
		PortfolioTemplates: portfolioTemplates,
	}

	renderAppView(w, r, "dashboard.html", data)
}

// 4. Inquiries Inbox View (Authenticated)
func HandleInquiries(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	if user == nil {
		if isHTMX(r) {
			w.Header().Set("HX-Redirect", "/login?redirect=/inquiries")
			w.WriteHeader(http.StatusOK)
			return
		}
		http.Redirect(w, r, "/login?redirect=/inquiries", http.StatusSeeOther)
		return
	}

	inquiries, _ := db.GetInquiriesForUser(user.ID)

	data := PageData{
		Title:     "Client Inquiries & Proposals Inbox",
		ActiveNav: "inquiries",
		User:      user,
		Profile:   profile,
		Inquiries: inquiries,
	}

	renderAppView(w, r, "inquiries.html", data)
}

// 5. Multi-Role Living Portfolio View
func HandlePortfolio(w http.ResponseWriter, r *http.Request) {
	currentUser, currentProfile := auth.GetUserFromRequest(r)

	targetUsername := r.URL.Query().Get("u")
	var profile *models.Profile
	if targetUsername != "" {
		profile, _ = db.GetProfileByUsername(targetUsername)
	}
	if profile == nil && currentProfile != nil {
		profile = currentProfile
	}
	if profile == nil {
		// Public fallback: showcase Amina or Ibrahim
		profile, _ = db.GetProfileByUsername("amina")
		if profile == nil {
			profile, _ = db.GetProfileByUsername("ibrahim")
		}
	}

	var targetUserID string
	if profile != nil {
		targetUserID = profile.UserID
	}

	roles, _ := db.GetUserRoles(targetUserID)
	orgs, _ := db.GetOrganizationsForUser(targetUserID)
	ideas, _ := db.GetIdeasForUser(targetUserID)
	endorsements, _ := db.GetEndorsementsByTargetUser(targetUserID)
	projects, _ := db.GetProjectsByUserID(targetUserID)
	if len(projects) == 0 {
		projects, _ = db.GetAllProjects()
	}
	problems, _ := db.GetProblemsByUserID(targetUserID)
	if len(problems) == 0 {
		problems, _ = db.GetAllProblems()
	}

	roleFilter := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("role")))

	displayName := "Professional"
	if profile != nil && profile.DisplayName != "" {
		displayName = profile.DisplayName
	}

	domainTemplates, _ := db.GetAllDomainTemplates()
	portfolioTemplates, _ := db.GetAllPortfolioTemplates()

	data := PageData{
		Title:              fmt.Sprintf("%s — Multi-Role Profile & Living Proofolio", displayName),
		ActiveNav:          "portfolio",
		User:               currentUser,
		Profile:            profile,
		Roles:              roles,
		Organizations:      orgs,
		Ideas:              ideas,
		Projects:           projects,
		Problems:           problems,
		Endorsements:       endorsements,
		RoleFilter:         roleFilter,
		DomainTemplates:    domainTemplates,
		PortfolioTemplates: portfolioTemplates,
	}

	if currentUser != nil {
		renderAppView(w, r, "portfolio.html", data)
	} else {
		renderPublicContentView(w, r, "portfolio.html", data)
	}
}

// 6. Discover View
func HandleDiscover(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	profiles, _ := db.GetAllProfiles()

	data := PageData{
		Title:     "Discover Verified Professionals & Specialists",
		ActiveNav: "discover",
		User:      user,
		Profile:   profile,
		Profiles:  profiles,
	}

	if user != nil {
		renderAppView(w, r, "discover.html", data)
	} else {
		renderPublicContentView(w, r, "discover.html", data)
	}
}

// 7. Discussions View
func HandleDiscussions(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	discussions, _ := db.GetAllDiscussions()

	var portfolioTemplates []models.PortfolioTemplate
	var roles []models.UserRole
	if user != nil {
		portfolioTemplates, _ = db.GetAllPortfolioTemplates()
		roles, _ = db.GetUserRoles(user.ID)
	}

	data := PageData{
		Title:              "Technical Discussions & Problem Solving",
		ActiveNav:          "discussions",
		User:               user,
		Profile:            profile,
		Discussions:        discussions,
		Roles:              roles,
		PortfolioTemplates: portfolioTemplates,
	}

	if user != nil {
		renderAppView(w, r, "discussions.html", data)
	} else {
		renderPublicContentView(w, r, "discussions.html", data)
	}
}

// 8. Articles View
func HandleArticles(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	articles, _ := db.GetAllArticles()

	var portfolioTemplates []models.PortfolioTemplate
	var roles []models.UserRole
	var projects []models.Project
	if user != nil {
		portfolioTemplates, _ = db.GetAllPortfolioTemplates()
		roles, _ = db.GetUserRoles(user.ID)
		projects, _ = db.GetProjectsByUserID(user.ID)
	}

	data := PageData{
		Title:              "Articles, Case Studies & Whitepapers",
		ActiveNav:          "articles",
		User:               user,
		Profile:            profile,
		Articles:           articles,
		Projects:           projects,
		Roles:              roles,
		PortfolioTemplates: portfolioTemplates,
	}

	if user != nil {
		renderAppView(w, r, "articles.html", data)
	} else {
		renderPublicContentView(w, r, "articles.html", data)
	}
}

// 9. Opportunities View
func HandleOpportunities(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	opportunities, _ := db.GetAllOpportunities()

	var portfolioTemplates []models.PortfolioTemplate
	var roles []models.UserRole
	if user != nil {
		portfolioTemplates, _ = db.GetAllPortfolioTemplates()
		roles, _ = db.GetUserRoles(user.ID)
	}

	data := PageData{
		Title:              "Contracts, Engagements & High-Impact Roles",
		ActiveNav:          "opportunities",
		User:               user,
		Profile:            profile,
		Opportunities:      opportunities,
		Roles:              roles,
		PortfolioTemplates: portfolioTemplates,
	}

	if user != nil {
		renderAppView(w, r, "opportunities.html", data)
	} else {
		renderPublicContentView(w, r, "opportunities.html", data)
	}
}

// 10. Login View & Action
func HandleLoginView(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	redirect := strings.TrimSpace(r.URL.Query().Get("redirect"))
	target := redirect
	if target == "" || !strings.HasPrefix(target, "/") {
		target = "/dashboard"
	}

	if user != nil {
		http.Redirect(w, r, target, http.StatusSeeOther)
		return
	}

	data := PageData{
		Title:     "Sign In to Console",
		ActiveNav: "login",
		Redirect:  redirect,
		User:      user,
		Profile:   profile,
	}

	renderAuthView(w, r, "login.html", data)
}

func HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	usernameOrEmail := strings.TrimSpace(r.FormValue("username"))
	password := r.FormValue("password")
	redirect := strings.TrimSpace(r.FormValue("redirect"))
	if redirect == "" || !strings.HasPrefix(redirect, "/") {
		redirect = "/dashboard"
	}

	var user *models.User
	var err error

	if strings.Contains(usernameOrEmail, "@") {
		user, err = db.GetUserByEmail(usernameOrEmail)
	} else {
		user, err = db.GetUserByUsername(usernameOrEmail)
	}

	if err != nil || user == nil || !auth.VerifyPassword(password, user.PasswordHash, user.PasswordSalt) {
		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(http.StatusUnauthorized)
		fmt.Fprintf(w, `<div style="color:var(--color-terracotta); font-size:0.85rem; margin-bottom:1rem; padding:0.6rem; background:var(--color-terracotta-bg); border:1px solid rgba(194,89,50,0.3); border-radius:4px;">Invalid username or password. Please verify credentials.</div>`)
		return
	}

	token := auth.GenerateSessionToken()
	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	_ = db.CreateSession(token, user.ID, expiresAt)
	auth.SetSessionCookie(w, token, expiresAt)

	if isHTMX(r) {
		w.Header().Set("HX-Redirect", redirect)
		w.WriteHeader(http.StatusOK)
		return
	}

	http.Redirect(w, r, redirect, http.StatusSeeOther)
}

// 11. Register View & Action
func HandleRegisterView(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	redirect := strings.TrimSpace(r.URL.Query().Get("redirect"))
	target := redirect
	if target == "" || !strings.HasPrefix(target, "/") {
		target = "/dashboard"
	}

	if user != nil {
		http.Redirect(w, r, target, http.StatusSeeOther)
		return
	}

	data := PageData{
		Title:     "Create Your Proofolio",
		ActiveNav: "register",
		Redirect:  redirect,
		User:      user,
		Profile:   profile,
	}

	renderAuthView(w, r, "register.html", data)
}

func HandleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	displayName := strings.TrimSpace(r.FormValue("displayName"))
	username := strings.ToLower(strings.TrimSpace(r.FormValue("username")))
	email := strings.ToLower(strings.TrimSpace(r.FormValue("email")))
	category := r.FormValue("category")
	password := r.FormValue("password")

	validUser, userErr := auth.ValidateUsername(username)
	if !validUser {
		w.Header().Set("Content-Type", "text/html")
		fmt.Fprintf(w, `<div style="color:var(--color-terracotta); font-size:0.85rem; margin-bottom:1rem; padding:0.6rem; background:var(--color-terracotta-bg); border-radius:4px;">%s</div>`, userErr)
		return
	}

	if !auth.ValidateEmail(email) {
		w.Header().Set("Content-Type", "text/html")
		fmt.Fprintf(w, `<div style="color:var(--color-terracotta); font-size:0.85rem; margin-bottom:1rem; padding:0.6rem; background:var(--color-terracotta-bg); border-radius:4px;">Please enter a valid email address.</div>`)
		return
	}

	validPass, passErr := auth.ValidatePassword(password)
	if !validPass {
		w.Header().Set("Content-Type", "text/html")
		fmt.Fprintf(w, `<div style="color:var(--color-terracotta); font-size:0.85rem; margin-bottom:1rem; padding:0.6rem; background:var(--color-terracotta-bg); border-radius:4px;">%s</div>`, passErr)
		return
	}

	if existing, _ := db.GetUserByUsername(username); existing != nil {
		w.Header().Set("Content-Type", "text/html")
		fmt.Fprintf(w, `<div style="color:var(--color-terracotta); font-size:0.85rem; margin-bottom:1rem; padding:0.6rem; background:var(--color-terracotta-bg); border-radius:4px;">Username already taken. Please pick another.</div>`)
		return
	}

	hash, salt, err := auth.HashPassword(password)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	userID := generateID("usr")
	newUser := models.User{
		ID:           userID,
		Email:        email,
		Username:     username,
		PasswordHash: hash,
		PasswordSalt: salt,
		Role:         "user",
		Status:       "active",
	}

	if err := db.CreateUser(&newUser); err != nil {
		w.Header().Set("Content-Type", "text/html")
		fmt.Fprintf(w, `<div style="color:var(--color-terracotta); font-size:0.85rem; margin-bottom:1rem; padding:0.6rem; background:var(--color-terracotta-bg); border-radius:4px;">Failed to create account: %v</div>`, err)
		return
	}

	newProfile := models.Profile{
		UserID:      userID,
		Username:    username,
		DisplayName: displayName,
		Headline:    fmt.Sprintf("%s Specialist", strings.Title(category)),
		Bio:         "Welcome to my verified engineering portfolio on Proofolio.",
		Location:    "Remote",
		Category:    category,
		Skills:      []string{"Architecture", "Engineering", "Proof of Work"},
		Visibility:  "public",
		Theme:       "editorial",
		FontStyle:   "sans",
		AccentColor: "terracotta",
	}
	_ = db.CreateOrUpdateProfile(&newProfile)

	token := auth.GenerateSessionToken()
	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	_ = db.CreateSession(token, userID, expiresAt)
	auth.SetSessionCookie(w, token, expiresAt)

	redirect := strings.TrimSpace(r.FormValue("redirect"))
	if redirect == "" || !strings.HasPrefix(redirect, "/") {
		redirect = "/dashboard"
	}

	if isHTMX(r) {
		w.Header().Set("HX-Redirect", redirect)
		w.WriteHeader(http.StatusOK)
		return
	}

	http.Redirect(w, r, redirect, http.StatusSeeOther)
}

func HandleLogout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("proofolio_session")
	if err == nil && cookie.Value != "" {
		_ = db.DeleteSession(cookie.Value)
	}
	auth.ClearSessionCookie(w)

	if isHTMX(r) {
		w.Header().Set("HX-Redirect", "/")
		w.WriteHeader(http.StatusOK)
		return
	}

	http.Redirect(w, r, "/", http.StatusSeeOther)
}

// Session keepalive and rolling timeout endpoint
func HandleSessionKeepalive(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	user, profile := auth.GetUserFromRequest(r)
	if user == nil {
		auth.ClearSessionCookie(w)
		w.WriteHeader(http.StatusUnauthorized)
		target := strings.TrimSpace(r.URL.Query().Get("current"))
		if target == "" || !strings.HasPrefix(target, "/") {
			target = "/dashboard"
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"authenticated": false,
			"redirect":      "/login?redirect=" + url.QueryEscape(target),
		})
		return
	}

	// Active session! Renew token & cookie expiration for long uninterrupted session
	cookie, err := r.Cookie("proofolio_session")
	if err == nil && cookie.Value != "" {
		newExpiry := time.Now().Add(7 * 24 * time.Hour)
		_ = db.TouchSession(cookie.Value, newExpiry)
		auth.SetSessionCookie(w, cookie.Value, newExpiry)
	}

	displayName := user.Username
	if profile != nil && profile.DisplayName != "" {
		displayName = profile.DisplayName
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"authenticated": true,
		"username":      user.Username,
		"displayName":   displayName,
	})
}

// 12. Inquiries API
func HandleCreateInquiry(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	inq := models.Inquiry{
		ID:           generateID("inq"),
		TargetUserID: r.FormValue("targetUserId"),
		SenderName:   strings.TrimSpace(r.FormValue("senderName")),
		SenderEmail:  strings.TrimSpace(r.FormValue("senderEmail")),
		ProjectType:  r.FormValue("projectType"),
		BudgetRange:  r.FormValue("budgetRange"),
		Timeline:     r.FormValue("timeline"),
		Title:        r.FormValue("title"),
		Description:  r.FormValue("description"),
		Status:       "new",
	}

	user, _ := auth.GetUserFromRequest(r)
	if user != nil {
		inq.SenderUserID = user.ID
	}

	if err := db.CreateInquiry(&inq); err != nil {
		w.Header().Set("Content-Type", "text/html")
		fmt.Fprintf(w, `<div style="color:var(--color-terracotta); font-size:0.9rem;">Failed to record inquiry: %v</div>`, err)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	fmt.Fprintf(w, `<div style="padding:1.5rem; text-align:center; background:var(--emerald-proof-bg); border:1px solid rgba(6,95,70,0.3); border-radius:var(--radius-sm);">
		<div style="font-size:1.75rem; margin-bottom:0.5rem;">🎉</div>
		<h4 style="font-size:1.1rem; color:var(--emerald-proof-text); margin-bottom:0.5rem;">Contract Proposal Sent</h4>
		<p style="font-size:0.85rem; color:var(--text-body); margin-bottom:1rem;">
			Thank you, <strong>%s</strong>. Your proposal is securely stored in PostgreSQL and the engineer has been notified directly.
		</p>
		<button class="btn btn-secondary btn-sm" onclick="document.getElementById('inquiry-dialog').close()">Close</button>
	</div>`, template.HTMLEscapeString(inq.SenderName))
}

// 13. Projects API
func HandleCreateProject(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, _ := auth.GetUserFromRequest(r)
	if user == nil {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	_ = r.ParseMultipartForm(10 << 20)

	rawStack := r.FormValue("techStack")
	if rawStack == "" {
		rawStack = r.FormValue("tags")
	}
	var stack []string
	for _, s := range strings.Split(rawStack, ",") {
		s = strings.TrimSpace(s)
		if s != "" {
			stack = append(stack, s)
		}
	}

	problemSolved := strings.TrimSpace(r.FormValue("problemSolved"))
	if problemSolved == "" {
		problemSolved = strings.TrimSpace(r.FormValue("description"))
	}

	liveUrl := strings.TrimSpace(r.FormValue("liveUrl"))
	if liveUrl == "" {
		liveUrl = strings.TrimSpace(r.FormValue("link"))
	}

	headline := strings.TrimSpace(r.FormValue("headline"))
	if headline == "" {
		headline = strings.TrimSpace(r.FormValue("title"))
	}

	category := strings.TrimSpace(r.FormValue("category"))
	if category == "" {
		category = "Proof of Work"
	}

	attributes := make(models.JSONB)

	// Parse polymorphic template attributes (attr_*)
	for k, vals := range r.Form {
		if strings.HasPrefix(k, "attr_") && len(vals) > 0 {
			fieldKey := strings.TrimPrefix(k, "attr_")
			val := strings.TrimSpace(vals[0])
			if val != "" {
				attributes[fieldKey] = val
			}
		}
	}

	// Parse custom dynamic key-values
	customKeys := r.Form["custom_key[]"]
	customVals := r.Form["custom_value[]"]
	for i, k := range customKeys {
		cleanKey := strings.ToLower(strings.TrimSpace(k))
		cleanKey = strings.ReplaceAll(cleanKey, " ", "_")
		if cleanKey != "" && i < len(customVals) {
			val := strings.TrimSpace(customVals[i])
			if val != "" {
				attributes[cleanKey] = val
			}
		}
	}

	prj := models.Project{
		ID:                generateID("prj"),
		UserID:            user.ID,
		Title:             strings.TrimSpace(r.FormValue("title")),
		Category:          category,
		Headline:          headline,
		ProblemSolved:     problemSolved,
		ArchitectureNotes: strings.TrimSpace(r.FormValue("architectureNotes")),
		LiveURL:           liveUrl,
		RepoURL:           strings.TrimSpace(r.FormValue("repoUrl")),
		TechStack:         stack,
		Metrics:           strings.TrimSpace(r.FormValue("metrics")),
		Status:            "completed",
		Featured:          true,
		Attributes:        attributes,
	}

	_ = db.CreateProject(&prj)

	redirectURL := "/portfolio?u=" + user.Username
	if isHTMX(r) {
		w.Header().Set("HX-Redirect", redirectURL)
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Redirect(w, r, redirectURL, http.StatusSeeOther)
}

// 13b. Update Profile & Skills API with Polymorphic Attributes & Avatar Upload
func HandleUpdateProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, profile := auth.GetUserFromRequest(r)
	if user == nil {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	if profile == nil {
		profile = &models.Profile{
			UserID:   user.ID,
			Username: user.Username,
		}
	}
	if profile.Attributes == nil {
		profile.Attributes = make(models.JSONB)
	}

	// 1. Support multipart form for avatar file upload
	_ = r.ParseMultipartForm(10 << 20)

	// Avatar file upload handling
	if file, header, err := r.FormFile("avatar_file"); err == nil && file != nil {
		defer file.Close()
		ext := strings.ToLower(filepath.Ext(header.Filename))
		if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" && ext != ".gif" {
			ext = ".jpg"
		}
		_ = os.MkdirAll("static/uploads/avatars", 0755)
		filename := fmt.Sprintf("avatar_%s_%d%s", user.ID, time.Now().Unix(), ext)
		dstPath := filepath.Join("static/uploads/avatars", filename)
		if dst, err := os.Create(dstPath); err == nil {
			if _, err := io.Copy(dst, file); err == nil {
				profile.AvatarURL = "/static/uploads/avatars/" + filename
			}
			dst.Close()
		}
	} else if aURL := strings.TrimSpace(r.FormValue("avatar_url")); aURL != "" {
		profile.AvatarURL = aURL
	}

	displayName := strings.TrimSpace(r.FormValue("displayName"))
	if displayName != "" {
		profile.DisplayName = displayName
	}

	headline := strings.TrimSpace(r.FormValue("headline"))
	if headline != "" {
		profile.Headline = headline
	}

	bio := strings.TrimSpace(r.FormValue("bio"))
	profile.Bio = bio

	location := strings.TrimSpace(r.FormValue("location"))
	if location != "" {
		profile.Location = location
	}

	category := strings.TrimSpace(r.FormValue("category"))
	if category != "" {
		profile.Category = category
	}

	rawSkills := r.FormValue("skills")
	var skills []string
	for _, s := range strings.Split(rawSkills, ",") {
		s = strings.TrimSpace(s)
		if s != "" {
			skills = append(skills, s)
		}
	}
	if len(skills) > 0 {
		profile.Skills = skills
	}

	// Record Domain Template Key if provided
	domainKey := strings.TrimSpace(r.FormValue("domain_key"))
	if domainKey != "" {
		profile.Attributes["_domain_key"] = domainKey
		if profile.Category == "" {
			if dt, err := db.GetDomainTemplateByKey(domainKey); err == nil && dt != nil {
				profile.Category = dt.DisplayName
			}
		}
	}

	// Dynamic Template Attributes (attr_*)
	for k, vals := range r.Form {
		if strings.HasPrefix(k, "attr_") && len(vals) > 0 {
			fieldKey := strings.TrimPrefix(k, "attr_")
			val := strings.TrimSpace(vals[0])
			if val != "" {
				profile.Attributes[fieldKey] = val
			} else {
				delete(profile.Attributes, fieldKey) // Sparse pruning: prevent DB bloat
			}
		}
	}

	// Custom Dynamic Fields (custom_key[] + custom_value[])
	customKeys := r.Form["custom_key[]"]
	customVals := r.Form["custom_value[]"]
	for i, k := range customKeys {
		cleanKey := strings.ToLower(strings.TrimSpace(k))
		cleanKey = strings.ReplaceAll(cleanKey, " ", "_")
		if cleanKey != "" && i < len(customVals) {
			val := strings.TrimSpace(customVals[i])
			if val != "" {
				profile.Attributes[cleanKey] = val
			} else {
				delete(profile.Attributes, cleanKey)
			}
		}
	}

	_ = db.CreateOrUpdateProfile(profile)

	redirectURL := "/portfolio?u=" + user.Username
	if isHTMX(r) {
		w.Header().Set("HX-Redirect", redirectURL)
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Redirect(w, r, redirectURL, http.StatusSeeOther)
}

// 13c. Polymorphic Template Fields API (HTMX Dynamic Swap)
func HandleGetTemplateFields(w http.ResponseWriter, r *http.Request) {
	domainKey := strings.TrimSpace(r.URL.Query().Get("domain"))
	tmplKey := strings.TrimSpace(r.URL.Query().Get("template"))
	typeParam := strings.TrimSpace(r.URL.Query().Get("type"))

	var fields []models.TemplateField
	var currentValues map[string]interface{}

	_, currentProfile := auth.GetUserFromRequest(r)
	if currentProfile != nil && currentProfile.Attributes != nil {
		currentValues = currentProfile.Attributes
	}

	if typeParam == "project" || tmplKey != "" {
		if tmplKey == "" {
			cat := strings.TrimSpace(r.URL.Query().Get("category"))
			switch strings.ToLower(cat) {
			case "software project", "software engineering project":
				tmplKey = "software_project"
			case "music release", "music release & audio performance":
				tmplKey = "music_release"
			case "match performance", "match performance & athletic record":
				tmplKey = "match_performance"
			case "design case study", "design case study & prototype":
				tmplKey = "design_case_study"
			case "research paper", "academic research paper & discovery":
				tmplKey = "research_paper"
			default:
				tmplKey = "general_work"
			}
		}
		pt, err := db.GetPortfolioTemplateByKey(tmplKey)
		if err == nil && pt != nil {
			fields = pt.Fields
		}
	} else if domainKey != "" {
		dt, err := db.GetDomainTemplateByKey(domainKey)
		if err == nil && dt != nil {
			fields = dt.Fields
		}
	}

	if len(fields) == 0 {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`<div style="padding:8px 0; color:var(--text-3); font-size:0.8rem; font-style:italic;">Standard profile fields will apply. Use "+ Add Custom Field" below to add tailored details.</div>`))
		return
	}

	var sb strings.Builder
	sb.WriteString(`<div class="template-fields-grid" style="display:flex; flex-direction:column; gap:12px; margin-top:8px;">`)

	for _, f := range fields {
		sb.WriteString(`<div class="form-group" style="margin-bottom:0;">`)
		sb.WriteString(fmt.Sprintf(`<label class="form-label" style="font-size:0.8rem; font-weight:600; margin-bottom:4px; display:block;">%s</label>`, template.HTMLEscapeString(f.Label)))

		valStr := ""
		if currentValues != nil {
			if v, ok := currentValues[f.Key]; ok && v != nil {
				valStr = fmt.Sprintf("%v", v)
			}
		}

		fieldName := "attr_" + f.Key
		escapedVal := template.HTMLEscapeString(valStr)
		escapedPlaceholder := template.HTMLEscapeString(f.Placeholder)

		switch f.InputType {
		case "select":
			sb.WriteString(fmt.Sprintf(`<select name="%s" class="form-input form-select" style="font-size:14px;">`, fieldName))
			sb.WriteString(`<option value="">-- Select Option --</option>`)
			for _, opt := range f.Options {
				selected := ""
				if opt == valStr {
					selected = " selected"
				}
				sb.WriteString(fmt.Sprintf(`<option value="%s"%s>%s</option>`, template.HTMLEscapeString(opt), selected, template.HTMLEscapeString(opt)))
			}
			sb.WriteString(`</select>`)
		case "textarea":
			sb.WriteString(fmt.Sprintf(`<textarea name="%s" rows="2" placeholder="%s" class="form-input form-textarea" style="font-size:14px;">%s</textarea>`, fieldName, escapedPlaceholder, escapedVal))
		case "number":
			sb.WriteString(fmt.Sprintf(`<input type="number" name="%s" value="%s" placeholder="%s" class="form-input" style="font-size:14px;">`, fieldName, escapedVal, escapedPlaceholder))
		case "url":
			sb.WriteString(fmt.Sprintf(`<input type="url" name="%s" value="%s" placeholder="%s" class="form-input" style="font-size:14px;">`, fieldName, escapedVal, escapedPlaceholder))
		default:
			sb.WriteString(fmt.Sprintf(`<input type="text" name="%s" value="%s" placeholder="%s" class="form-input" style="font-size:14px;">`, fieldName, escapedVal, escapedPlaceholder))
		}

		if f.HelpText != "" {
			sb.WriteString(fmt.Sprintf(`<span style="font-size:0.75rem; color:var(--text-3); margin-top:2px; display:block;">%s</span>`, template.HTMLEscapeString(f.HelpText)))
		}
		sb.WriteString(`</div>`)
	}
	sb.WriteString(`</div>`)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(sb.String()))
}

// 13d. Custom Field Inline Row Partial API
func HandleCustomFieldRow(w http.ResponseWriter, r *http.Request) {
	rowHTML := `
    <div class="custom-field-row" style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
      <input type="text" name="custom_key[]" placeholder="Attribute Name (e.g. Favorite Genre, Booking Agent)" class="form-input" style="flex:1; font-size:14px;" required>
      <input type="text" name="custom_value[]" placeholder="Value (e.g. R&B, Hip-Hop)" class="form-input" style="flex:1.4; font-size:14px;" required>
      <button type="button" onclick="this.closest('.custom-field-row').remove()" style="background:transparent; border:none; color:var(--text-3); font-size:1.1rem; cursor:pointer; padding:6px 8px; border-radius:4px;" title="Remove field">✕</button>
    </div>`
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(rowHTML))
}

// 13e. Direct Avatar Upload API
func HandleUploadAvatar(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	user, profile := auth.GetUserFromRequest(r)
	if user == nil {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}
	if profile == nil {
		profile = &models.Profile{
			UserID:   user.ID,
			Username: user.Username,
		}
	}

	_ = r.ParseMultipartForm(10 << 20)
	file, header, err := r.FormFile("avatar_file")
	if err != nil {
		http.Error(w, "No avatar file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" && ext != ".gif" {
		ext = ".jpg"
	}

	_ = os.MkdirAll("static/uploads/avatars", 0755)
	filename := fmt.Sprintf("avatar_%s_%d%s", user.ID, time.Now().Unix(), ext)
	dstPath := filepath.Join("static/uploads/avatars", filename)

	dst, err := os.Create(dstPath)
	if err != nil {
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, "Failed to write file", http.StatusInternalServerError)
		return
	}

	avatarURL := "/static/uploads/avatars/" + filename
	profile.AvatarURL = avatarURL
	_ = db.CreateOrUpdateProfile(profile)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":    "ok",
		"avatarUrl": avatarURL,
	})
}

// 14. Problems API
func HandleCreateProblem(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.GetUserFromRequest(r)
	if user == nil {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	rawStack := r.FormValue("techStack")
	var stack []string
	for _, s := range strings.Split(rawStack, ",") {
		s = strings.TrimSpace(s)
		if s != "" {
			stack = append(stack, s)
		}
	}

	pb := models.ProblemCase{
		ID:        generateID("prob"),
		UserID:    user.ID,
		Title:     strings.TrimSpace(r.FormValue("title")),
		Domain:    strings.TrimSpace(r.FormValue("domain")),
		Symptoms:  strings.TrimSpace(r.FormValue("symptoms")),
		RootCause: strings.TrimSpace(r.FormValue("rootCause")),
		Solution:  strings.TrimSpace(r.FormValue("solution")),
		Outcome:   strings.TrimSpace(r.FormValue("outcome")),
		TechStack: stack,
	}

	_ = db.CreateProblem(&pb)
	HandlePortfolio(w, r)
}

// 15. Discussions API
func HandleCreateDiscussion(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	if user == nil {
		if isHTMX(r) {
			w.Header().Set("HX-Redirect", "/login?redirect=/discussions")
			w.WriteHeader(http.StatusOK)
			return
		}
		http.Redirect(w, r, "/login?redirect=/discussions", http.StatusSeeOther)
		return
	}

	authorName := user.Username
	authorRole := "Professional Specialist"
	if profile != nil {
		authorName = profile.DisplayName
		authorRole = profile.Headline
	}

	d := models.DiscussionPost{
		ID:             generateID("disc"),
		UserID:         user.ID,
		AuthorName:     authorName,
		AuthorUsername: user.Username,
		AuthorRole:     authorRole,
		Title:          strings.TrimSpace(r.FormValue("title")),
		Category:       r.FormValue("category"),
		Content:        strings.TrimSpace(r.FormValue("content")),
		Upvotes:        1,
		Upvoters:       []string{user.ID},
	}

	_ = db.CreateDiscussion(&d)
	HandleDiscussions(w, r)
}

func HandleReplyDiscussion(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	pathParts := strings.Split(r.URL.Path, "/")
	discussionID := ""
	if len(pathParts) >= 4 {
		discussionID = pathParts[3]
	}

	if user == nil {
		target := "/login?redirect=/discussions"
		if discussionID != "" {
			target = fmt.Sprintf("/login?redirect=/discussions%%23disc-%s", discussionID)
		}
		if isHTMX(r) {
			w.Header().Set("HX-Redirect", target)
			w.WriteHeader(http.StatusOK)
			return
		}
		http.Redirect(w, r, target, http.StatusSeeOther)
		return
	}

	if discussionID == "" {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}

	authorName := user.Username
	authorRole := "Engineer"
	if profile != nil {
		authorName = profile.DisplayName
		authorRole = profile.Headline
	}

	reply := models.DiscussionReply{
		ID:             generateID("rep"),
		DiscussionID:   discussionID,
		AuthorUserID:   user.ID,
		AuthorName:     authorName,
		AuthorUsername: user.Username,
		AuthorRole:     authorRole,
		Content:        strings.TrimSpace(r.FormValue("content")),
	}

	_ = db.CreateDiscussionReply(&reply)
	HandleDiscussions(w, r)
}

func HandleUpvoteDiscussion(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}
	discussionID := pathParts[3]

	user, _ := auth.GetUserFromRequest(r)
	voterID := "anon"
	if user != nil {
		voterID = user.ID
	}

	votes, err := db.UpvoteDiscussion(discussionID, voterID)
	if err != nil {
		http.Error(w, "Error updating vote", http.StatusInternalServerError)
		return
	}

	fmt.Fprintf(w, "%d", votes)
}

// 16. Articles API
// renderMarkdown converts Markdown text to safe HTML using goldmark
func renderMarkdown(src string) template.HTML {
	md := goldmark.New(
		goldmark.WithExtensions(extension.GFM, extension.Table, extension.Strikethrough),
		goldmark.WithParserOptions(parser.WithAutoHeadingID()),
		goldmark.WithRendererOptions(goldmarkhtml.WithHardWraps(), goldmarkhtml.WithXHTML()),
	)
	var buf bytes.Buffer
	if err := md.Convert([]byte(src), &buf); err != nil {
		return template.HTML(template.HTMLEscapeString(src))
	}
	return template.HTML(buf.String())
}

func HandleCreateArticle(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	if user == nil {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	authorName := user.Username
	authorRole := "Author"
	if profile != nil {
		authorName = profile.DisplayName
		if profile.Headline != "" {
			authorRole = profile.Headline
		}
	}

	// Parse tags
	var tags []string
	for _, t := range strings.Split(r.FormValue("tags"), ",") {
		t = strings.TrimSpace(t)
		if t != "" {
			tags = append(tags, t)
		}
	}

	// Parse key takeaways (newline or comma separated)
	var keyTakeaways []string
	rawTakeaways := strings.TrimSpace(r.FormValue("keyTakeaways"))
	for _, line := range strings.Split(rawTakeaways, "\n") {
		line = strings.TrimSpace(strings.TrimLeft(line, "-•*"))
		if line != "" {
			keyTakeaways = append(keyTakeaways, line)
		}
	}

	content := strings.TrimSpace(r.FormValue("content"))
	title := strings.TrimSpace(r.FormValue("title"))

	a := models.ArticlePost{
		ID:              generateID("art"),
		UserID:          user.ID,
		AuthorName:      authorName,
		AuthorUsername:  user.Username,
		AuthorRole:      authorRole,
		Title:           title,
		Excerpt:         strings.TrimSpace(r.FormValue("excerpt")),
		Category:        strings.TrimSpace(r.FormValue("category")),
		Summary:         strings.TrimSpace(r.FormValue("summary")),
		Content:         content,
		BannerImage:     strings.TrimSpace(r.FormValue("bannerImage")),
		LinkedProjectID: strings.TrimSpace(r.FormValue("linkedProjectId")),
		AuthorPrompt:    strings.TrimSpace(r.FormValue("authorPrompt")),
		HeaderStyle:     strings.TrimSpace(r.FormValue("headerStyle")),
		ReadingTheme:    strings.TrimSpace(r.FormValue("readingTheme")),
		FontStyle:       strings.TrimSpace(r.FormValue("fontStyle")),
		Tags:            tags,
		KeyTakeaways:    keyTakeaways,
		Upvotes:         1,
		Upvoters:        []string{user.ID},
		Attributes:      models.JSONB{},
	}
	a.Slug = a.GenerateSlug()
	a.ReadTime = a.CalcReadTime()
	if a.ReadingTheme == "" {
		a.ReadingTheme = "paper"
	}
	if a.FontStyle == "" {
		a.FontStyle = "serif"
	}
	if a.HeaderStyle == "" {
		a.HeaderStyle = "gradient"
	}
	if a.Category == "" {
		a.Category = "General"
	}

	_ = db.CreateArticle(&a)

	if isHTMX(r) {
		w.Header().Set("HX-Redirect", "/articles")
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Redirect(w, r, "/articles", http.StatusSeeOther)
}

func HandleUpvoteArticle(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}
	articleID := pathParts[3]

	user, _ := auth.GetUserFromRequest(r)
	voterID := "anon-" + r.RemoteAddr
	if user != nil {
		voterID = user.ID
	}

	votes, err := db.UpvoteArticle(articleID, voterID)
	if err != nil {
		http.Error(w, "Error updating vote", http.StatusInternalServerError)
		return
	}

	// Fetch article to get updated upvoters list for button state
	article, _ := db.GetArticleByID(articleID)
	isUpvoted := false
	if article != nil && user != nil {
		isUpvoted = article.IsUpvotedBy(user.ID)
	}

	// Return only the upvote button partial for HTMX swap
	w.Header().Set("Content-Type", "text/html")
	var upvotedClass, upvotedTitle string
	if isUpvoted {
		upvotedClass = "upvoted"
		upvotedTitle = "Remove upvote"
	} else {
		upvotedTitle = "Upvote this article"
	}
	fmt.Fprintf(w, `<div class="upvote-btn %s" title="%s"
		hx-post="/api/articles/%s/upvote"
		hx-swap="outerHTML"
		style="display:flex;align-items:center;gap:0.4rem;padding:0.35rem 0.75rem;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;transition:all 0.15s;">
		<span style="color:var(--accent);">&#9650;</span>
		<span style="font-family:var(--font-mono);font-weight:700;color:var(--text-1);font-size:0.85rem;">%d</span>
	</div>`, upvotedClass, upvotedTitle, articleID, votes)
}

// HandleArticleReader serves the full-screen immersive article reader
func HandleArticleReader(w http.ResponseWriter, r *http.Request) {
	slug := strings.TrimPrefix(r.URL.Path, "/articles/")
	slug = strings.TrimSuffix(slug, "/")
	if slug == "" {
		http.Redirect(w, r, "/articles", http.StatusSeeOther)
		return
	}

	article, err := db.GetArticleBySlug(slug)
	if err != nil || article == nil {
		http.Error(w, "Article not found", http.StatusNotFound)
		return
	}

	user, profile := auth.GetUserFromRequest(r)

	// Render markdown content to safe HTML
	renderedContent := renderMarkdown(article.Content)

	var portfolioTemplates []models.PortfolioTemplate
	var roles []models.UserRole
	if user != nil {
		portfolioTemplates, _ = db.GetAllPortfolioTemplates()
		roles, _ = db.GetUserRoles(user.ID)
	}

	data := PageData{
		Title:              article.Title + " — Proofolio Articles",
		ActiveNav:          "articles",
		User:               user,
		Profile:            profile,
		Article:            article,
		RenderedContent:    renderedContent,
		Roles:              roles,
		PortfolioTemplates: portfolioTemplates,
	}

	if user != nil {
		renderAppView(w, r, "article-reader.html", data)
	} else {
		renderPublicContentView(w, r, "article-reader.html", data)
	}
}

// 17. Opportunities API
func HandleApplyOpportunity(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	oppID := strings.TrimSpace(r.FormValue("opportunityId"))
	if oppID == "" {
		w.Header().Set("Content-Type", "text/html")
		fmt.Fprintf(w, `<div style="color:var(--color-terracotta); font-size:0.9rem; padding:1rem; text-align:center;">Opportunity ID is missing. Please close the modal and re-select the opportunity case.</div>`)
		return
	}

	app := models.OpportunityApplicant{
		ID:            generateID("app"),
		OpportunityID: oppID,
		DisplayName:   strings.TrimSpace(r.FormValue("displayName")),
		Headline:      strings.TrimSpace(r.FormValue("headline")),
		Email:         strings.TrimSpace(r.FormValue("email")),
		Message:       strings.TrimSpace(r.FormValue("message")),
	}

	user, _ := auth.GetUserFromRequest(r)
	if user != nil {
		app.UserID = user.ID
		app.Username = user.Username
	}

	if err := db.ApplyToOpportunity(&app); err != nil {
		w.Header().Set("Content-Type", "text/html")
		fmt.Fprintf(w, `<div style="color:var(--color-terracotta); font-size:0.9rem; padding:1rem; text-align:center;">Application submission note: %v</div>`, err)
		return
	}

	w.Header().Set("Content-Type", "text/html")
	fmt.Fprintf(w, `<div style="padding:1.5rem; text-align:center; background:var(--emerald-proof-bg); border:1px solid rgba(6,95,70,0.3); border-radius:var(--radius-sm);">
		<div style="font-size:1.75rem; margin-bottom:0.5rem;">✅</div>
		<h4 style="font-size:1.1rem; color:var(--emerald-proof-text); margin-bottom:0.5rem;">Application Transmitted</h4>
		<p style="font-size:0.85rem; color:var(--text-body); margin-bottom:1rem;">
			Your candidate profile and engineering proof were received. The opportunity creator will contact you directly via email.
		</p>
		<button class="btn btn-secondary btn-sm" onclick="document.getElementById('apply-opp-dialog').close()">Done</button>
	</div>`)
}

func HandlePostOpportunity(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	if user == nil {
		if isHTMX(r) {
			w.Header().Set("HX-Redirect", "/login?redirect=/opportunities")
			w.WriteHeader(http.StatusOK)
			return
		}
		http.Redirect(w, r, "/login?redirect=/opportunities", http.StatusSeeOther)
		return
	}

	creatorName := user.Username
	creatorRole := "Lead Systems Architect"
	if profile != nil {
		creatorName = profile.DisplayName
		creatorRole = profile.Headline
	}

	rawSkills := r.FormValue("skills")
	var skills []string
	for _, s := range strings.Split(rawSkills, ",") {
		s = strings.TrimSpace(s)
		if s != "" {
			skills = append(skills, s)
		}
	}

	opp := models.Opportunity{
		ID:                generateID("opp"),
		CreatorUserID:     user.ID,
		CreatorName:       creatorName,
		CreatorRole:       creatorRole,
		CreatorCompany:    strings.TrimSpace(r.FormValue("company")),
		Title:             strings.TrimSpace(r.FormValue("title")),
		Category:          r.FormValue("category"),
		BudgetOrSalary:    strings.TrimSpace(r.FormValue("budget")),
		Location:          strings.TrimSpace(r.FormValue("location")),
		Description:       strings.TrimSpace(r.FormValue("description")),
		RequiredSkills:    skills,
		ContactEmailOrUrl: strings.TrimSpace(r.FormValue("contact")),
		Status:            "open",
	}

	_ = db.CreateOpportunity(&opp)
	HandleOpportunities(w, r)
}

func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	var out []rune
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			out = append(out, r)
		} else if r == ' ' || r == '-' || r == '_' {
			if len(out) > 0 && out[len(out)-1] != '-' {
				out = append(out, '-')
			}
		}
	}
	res := strings.Trim(string(out), "-")
	if res == "" {
		res = "org-" + generateID("")
	}
	return res
}

// =========================================================================
// ORGANIZATIONS HANDLERS
// =========================================================================

func HandleOrganizationsList(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	orgs, _ := db.GetAllOrganizations()

	data := PageData{
		Title:         "Organizations & Businesses — Proof-Backed Directory",
		ActiveNav:     "organizations",
		User:          user,
		Profile:       profile,
		Organizations: orgs,
	}

	if user != nil {
		renderAppView(w, r, "organizations.html", data)
	} else {
		renderPublicContentView(w, r, "organizations.html", data)
	}
}

func HandleOrganizationDetail(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)

	// Extract slug from URL: /organizations/{slug}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 2 || parts[1] == "" {
		http.Redirect(w, r, "/organizations", http.StatusSeeOther)
		return
	}
	slug := parts[1]

	org, err := db.GetOrganizationBySlug(slug)
	if err != nil || org == nil {
		http.NotFound(w, r)
		return
	}

	activeTab := r.URL.Query().Get("tab")
	if activeTab == "" {
		activeTab = "about"
	}

	data := PageData{
		Title:        fmt.Sprintf("%s — Verified Organization Profile", org.Name),
		ActiveNav:    "organizations",
		User:         user,
		Profile:      profile,
		CurrentOrg:   org,
		ActiveFilter: activeTab,
	}

	if user != nil {
		renderAppView(w, r, "organization_detail.html", data)
	} else {
		renderPublicContentView(w, r, "organization_detail.html", data)
	}
}

func HandleCreateOrganization(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	if user == nil {
		http.Redirect(w, r, "/login?redirect=/organizations", http.StatusSeeOther)
		return
	}

	name := strings.TrimSpace(r.FormValue("name"))
	if name == "" {
		http.Error(w, "Organization name is required", http.StatusBadRequest)
		return
	}

	slug := slugify(name)
	// Check existing slug
	if existing, _ := db.GetOrganizationBySlug(slug); existing != nil {
		slug = fmt.Sprintf("%s-%s", slug, generateID(""))
	}

	rawServices := r.FormValue("services")
	var services []string
	for _, s := range strings.Split(rawServices, ",") {
		s = strings.TrimSpace(s)
		if s != "" {
			services = append(services, s)
		}
	}

	rawProducts := r.FormValue("products")
	var products []models.OrgProduct
	for _, p := range strings.Split(rawProducts, "\n") {
		p = strings.TrimSpace(p)
		if p != "" {
			products = append(products, models.OrgProduct{
				Name:        p,
				Category:    "Commercial Solution",
				Description: "Verified inventory item or professional service offering",
				Status:      "Active",
			})
		}
	}

	org := models.Organization{
		ID:            generateID("org"),
		Name:          name,
		Slug:          slug,
		Tagline:       strings.TrimSpace(r.FormValue("tagline")),
		Industry:      strings.TrimSpace(r.FormValue("industry")),
		LogoURL:       "/static/images/home-profolio-logo.jpeg",
		About:         strings.TrimSpace(r.FormValue("about")),
		Services:      services,
		Products:      products,
		Location:      strings.TrimSpace(r.FormValue("location")),
		Website:       strings.TrimSpace(r.FormValue("website")),
		ContactEmail:  strings.TrimSpace(r.FormValue("contactEmail")),
		ContactPhone:  strings.TrimSpace(r.FormValue("contactPhone")),
		CreatorUserID: user.ID,
		Verified:      true,
		BusinessInfo: models.OrgBusinessInfo{
			RegistrationNo: strings.TrimSpace(r.FormValue("registrationNo")),
			TaxID:          strings.TrimSpace(r.FormValue("taxId")),
			FoundedYear:    strings.TrimSpace(r.FormValue("foundedYear")),
			Location:       strings.TrimSpace(r.FormValue("location")),
			Website:        strings.TrimSpace(r.FormValue("website")),
			Phone:          strings.TrimSpace(r.FormValue("contactPhone")),
			Email:          strings.TrimSpace(r.FormValue("contactEmail")),
			LicenseStatus:  strings.TrimSpace(r.FormValue("licenseStatus")),
		},
	}

	if err := db.CreateOrganization(&org); err != nil {
		http.Error(w, fmt.Sprintf("Failed to create organization: %v", err), http.StatusInternalServerError)
		return
	}

	// Add creator as founder / owner member
	member := models.OrgMember{
		ID:             generateID("orgmem"),
		OrganizationID: org.ID,
		UserID:         user.ID,
		Username:       user.Username,
		DisplayName:    user.Username,
		RoleTitle:      "Founder & Executive Director",
		RoleType:       "founder",
		IsPublic:       true,
	}
	if profile != nil && profile.DisplayName != "" {
		member.DisplayName = profile.DisplayName
	}
	_ = db.AddOrganizationMember(&member)

	// Automatically connect this role to the user's multi-role profile
	_ = db.CreateUserRole(&models.UserRole{
		ID:               generateID("role"),
		UserID:           user.ID,
		RoleType:         "founder",
		Title:            "Founder & Director",
		OrganizationName: org.Name,
		OrganizationID:   org.ID,
		Status:           "active",
		StartDate:        "2026",
		Description:      fmt.Sprintf("Founder and executive director of %s in %s.", org.Name, org.Location),
		Skills:           []string{"Executive Leadership", "Strategic Operations", org.Industry},
		Achievements:     []string{fmt.Sprintf("Established %s with full business compliance", org.Name)},
		IsPrimary:        true,
	})

	http.Redirect(w, r, "/organizations/"+slug, http.StatusSeeOther)
}

func HandleAddOrgUpdate(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	if user == nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	slug := r.FormValue("slug")
	org, err := db.GetOrganizationBySlug(slug)
	if err != nil || org == nil {
		http.NotFound(w, r)
		return
	}

	authorName := user.Username
	if profile != nil && profile.DisplayName != "" {
		authorName = profile.DisplayName
	}

	upd := models.OrgUpdate{
		ID:             generateID("upd"),
		OrganizationID: org.ID,
		AuthorUserID:   user.ID,
		AuthorName:     authorName,
		Title:          strings.TrimSpace(r.FormValue("title")),
		Content:        strings.TrimSpace(r.FormValue("content")),
		Category:       strings.TrimSpace(r.FormValue("category")),
	}

	_ = db.AddOrganizationUpdate(&upd)
	http.Redirect(w, r, "/organizations/"+slug+"?tab=updates", http.StatusSeeOther)
}

func HandleAddOrgMember(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.GetUserFromRequest(r)
	if user == nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	slug := r.FormValue("slug")
	org, err := db.GetOrganizationBySlug(slug)
	if err != nil || org == nil {
		http.NotFound(w, r)
		return
	}

	targetUsername := strings.TrimSpace(r.FormValue("username"))
	targetUser, err := db.GetUserByUsername(targetUsername)
	if err != nil || targetUser == nil {
		http.Error(w, "User not found with username: "+targetUsername, http.StatusBadRequest)
		return
	}

	targetProfile, _ := db.GetProfileByUserID(targetUser.ID)
	displayName := targetUser.Username
	if targetProfile != nil && targetProfile.DisplayName != "" {
		displayName = targetProfile.DisplayName
	}

	roleTitle := strings.TrimSpace(r.FormValue("roleTitle"))
	roleType := strings.TrimSpace(r.FormValue("roleType"))

	mem := models.OrgMember{
		ID:             generateID("orgmem"),
		OrganizationID: org.ID,
		UserID:         targetUser.ID,
		Username:       targetUser.Username,
		DisplayName:    displayName,
		RoleTitle:      roleTitle,
		RoleType:       roleType,
		IsPublic:       true,
	}

	_ = db.AddOrganizationMember(&mem)

	// Also add a corresponding UserRole for the member
	_ = db.CreateUserRole(&models.UserRole{
		ID:               generateID("role"),
		UserID:           targetUser.ID,
		RoleType:         roleType,
		Title:            roleTitle,
		OrganizationName: org.Name,
		OrganizationID:   org.ID,
		Status:           "active",
		StartDate:        "2026",
		Description:      fmt.Sprintf("%s at %s.", roleTitle, org.Name),
		IsPrimary:        false,
	})

	http.Redirect(w, r, "/organizations/"+slug+"?tab=team", http.StatusSeeOther)
}

func HandleAddOrgProject(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.GetUserFromRequest(r)
	if user == nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	slug := r.FormValue("slug")
	org, err := db.GetOrganizationBySlug(slug)
	if err != nil || org == nil {
		http.NotFound(w, r)
		return
	}

	proj := models.OrgProject{
		ID:             generateID("orgproj"),
		OrganizationID: org.ID,
		Title:          strings.TrimSpace(r.FormValue("title")),
		Description:    strings.TrimSpace(r.FormValue("description")),
		Status:         r.FormValue("status"),
		Metrics:        strings.TrimSpace(r.FormValue("metrics")),
	}

	_ = db.AddOrganizationProject(&proj)
	http.Redirect(w, r, "/organizations/"+slug+"?tab=projects", http.StatusSeeOther)
}

func HandleAddOrgProduct(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.GetUserFromRequest(r)
	if user == nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	slug := r.FormValue("slug")
	org, err := db.GetOrganizationBySlug(slug)
	if err != nil || org == nil {
		http.NotFound(w, r)
		return
	}

	prd := models.OrgProduct{
		Name:        strings.TrimSpace(r.FormValue("name")),
		Category:    strings.TrimSpace(r.FormValue("category")),
		Description: strings.TrimSpace(r.FormValue("description")),
		Status:      strings.TrimSpace(r.FormValue("status")),
	}

	_ = db.AddOrganizationProduct(org.ID, prd)
	http.Redirect(w, r, "/organizations/"+slug+"?tab=products", http.StatusSeeOther)
}

// =========================================================================
// IDEAS & LEARNING JOURNAL HANDLERS
// =========================================================================

func HandleIdeas(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	var ideas []models.Idea
	if user != nil {
		ideas, _ = db.GetIdeasForUser(user.ID)
	} else {
		// Public discovery fallback: show community and platform ideas
		ideas, _ = db.GetAllIdeas()
		if len(ideas) == 0 {
			ideas, _ = db.GetIdeasForUser("usr_amina")
		}
		if len(ideas) == 0 {
			ideas, _ = db.GetIdeasForUser("usr_ibrahim")
		}
	}

	stageFilter := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("stage")))

	var filteredIdeas []models.Idea
	if stageFilter != "" && stageFilter != "ALL" {
		for _, idea := range ideas {
			if strings.ToUpper(idea.Stage) == stageFilter {
				filteredIdeas = append(filteredIdeas, idea)
			}
		}
	} else {
		filteredIdeas = ideas
	}

	data := PageData{
		Title:        "Ideas & Learning Journal — Evolution of Thought",
		ActiveNav:    "ideas",
		User:         user,
		Profile:      profile,
		Ideas:        filteredIdeas,
		ActiveFilter: stageFilter,
	}

	if user != nil {
		renderAppView(w, r, "ideas.html", data)
	} else {
		renderPublicContentView(w, r, "ideas.html", data)
	}
}

func HandleIdeaDetail(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)

	// Extract idea ID from URL: /ideas/{id}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 2 || parts[1] == "" {
		http.Redirect(w, r, "/ideas", http.StatusSeeOther)
		return
	}
	id := parts[1]

	idea, err := db.GetIdeaByID(id)
	if err != nil || idea == nil {
		http.NotFound(w, r)
		return
	}

	data := PageData{
		Title:       fmt.Sprintf("Idea: %s — Chronological Progression", idea.Title),
		ActiveNav:   "ideas",
		User:        user,
		Profile:     profile,
		CurrentIdea: idea,
	}

	if user != nil {
		renderAppView(w, r, "idea_detail.html", data)
	} else {
		renderPublicContentView(w, r, "idea_detail.html", data)
	}
}

func HandleCreateIdea(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	if user == nil {
		if isHTMX(r) {
			w.Header().Set("HX-Redirect", "/login")
			w.WriteHeader(http.StatusOK)
			return
		}
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	title := strings.TrimSpace(r.FormValue("title"))
	if title == "" {
		http.Error(w, "Idea title is required", http.StatusBadRequest)
		return
	}

	rawTags := r.FormValue("tags")
	var tags []string
	for _, t := range strings.Split(rawTags, ",") {
		t = strings.TrimSpace(t)
		if t != "" {
			tags = append(tags, t)
		}
	}

	stage := strings.ToUpper(strings.TrimSpace(r.FormValue("stage")))
	if stage == "" {
		stage = "NEW"
	}

	authorName := user.Username
	if profile != nil && profile.DisplayName != "" {
		authorName = profile.DisplayName
	}

	idea := models.Idea{
		ID:                   generateID("idea"),
		UserID:               user.ID,
		AuthorName:           authorName,
		AuthorUsername:       user.Username,
		Title:                title,
		WhatLearned:          strings.TrimSpace(r.FormValue("whatLearned")),
		Source:               strings.TrimSpace(r.FormValue("source")),
		ThoughtsQuestions:    strings.TrimSpace(r.FormValue("thoughtsQuestions")),
		CurrentUnderstanding: strings.TrimSpace(r.FormValue("currentUnderstanding")),
		Stage:                stage,
		Visibility:           r.FormValue("visibility"),
		Tags:                 tags,
	}
	if idea.Visibility == "" {
		idea.Visibility = "private"
	}

	if err := db.CreateIdea(&idea); err != nil {
		http.Error(w, fmt.Sprintf("Failed to record idea: %v", err), http.StatusInternalServerError)
		return
	}

	// Add initial timeline entry
	_ = db.AddIdeaTimelineEntry(&models.IdeaTimelineEntry{
		ID:           generateID("entry"),
		IdeaID:       idea.ID,
		UserID:       user.ID,
		Note:         fmt.Sprintf("Spark captured: %s", idea.WhatLearned),
		StageAtEntry: stage,
		Source:       idea.Source,
	})

	if isHTMX(r) {
		w.Header().Set("HX-Redirect", "/ideas")
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Redirect(w, r, "/ideas", http.StatusSeeOther)
}

func HandleAddIdeaTimeline(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.GetUserFromRequest(r)
	if user == nil {
		if isHTMX(r) {
			w.Header().Set("HX-Redirect", "/login")
			w.WriteHeader(http.StatusOK)
			return
		}
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	ideaID := r.FormValue("ideaId")
	note := strings.TrimSpace(r.FormValue("note"))
	newStage := strings.ToUpper(strings.TrimSpace(r.FormValue("stage")))
	source := strings.TrimSpace(r.FormValue("source"))

	if ideaID == "" || note == "" {
		http.Error(w, "Idea ID and note are required", http.StatusBadRequest)
		return
	}

	idea, err := db.GetIdeaByID(ideaID)
	if err != nil || idea == nil {
		http.NotFound(w, r)
		return
	}

	stageToRecord := idea.Stage
	if newStage != "" && newStage != idea.Stage {
		stageToRecord = newStage
		_ = db.UpdateIdeaStage(ideaID, user.ID, newStage, "")
	}

	_ = db.AddIdeaTimelineEntry(&models.IdeaTimelineEntry{
		ID:           generateID("entry"),
		IdeaID:       ideaID,
		UserID:       user.ID,
		Note:         note,
		StageAtEntry: stageToRecord,
		Source:       source,
	})

	if isHTMX(r) {
		w.Header().Set("HX-Redirect", "/ideas/"+ideaID)
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Redirect(w, r, "/ideas/"+ideaID, http.StatusSeeOther)
}

func HandleUpdateIdeaStage(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.GetUserFromRequest(r)
	if user == nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	ideaID := r.FormValue("ideaId")
	newStage := strings.ToUpper(strings.TrimSpace(r.FormValue("stage")))
	note := strings.TrimSpace(r.FormValue("note"))

	_ = db.UpdateIdeaStage(ideaID, user.ID, newStage, note)
	http.Redirect(w, r, "/ideas/"+ideaID, http.StatusSeeOther)
}

func HandlePromoteIdeaToProject(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.GetUserFromRequest(r)
	if user == nil {
		if isHTMX(r) {
			w.Header().Set("HX-Redirect", "/login")
			w.WriteHeader(http.StatusOK)
			return
		}
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	ideaID := r.FormValue("ideaId")
	idea, err := db.GetIdeaByID(ideaID)
	if err != nil || idea == nil {
		http.NotFound(w, r)
		return
	}

	projID := generateID("proj")
	proj := models.Project{
		ID:                projID,
		UserID:            user.ID,
		Title:             idea.Title,
		Headline:          fmt.Sprintf("Evolved from Idea: %s", idea.Title),
		Category:          "Verified Implementation",
		ProblemSolved:     idea.WhatLearned,
		ArchitectureNotes: idea.CurrentUnderstanding,
		Metrics:           "Validated from concept to proof",
		TechStack:         idea.Tags,
		LiveURL:           "",
		RepoURL:           "",
	}

	_ = db.CreateProject(&proj)
	_ = db.UpdateIdeaStage(idea.ID, user.ID, "PROJECT", fmt.Sprintf("Promoted idea to full verified portfolio project '%s'.", idea.Title))
	_, _ = db.DB.Exec("UPDATE ideas SET linked_project_id = $1 WHERE id = $2", projID, idea.ID)

	if isHTMX(r) {
		w.Header().Set("HX-Redirect", "/portfolio#projects")
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Redirect(w, r, "/portfolio#projects", http.StatusSeeOther)
}

// =========================================================================
// MULTI-ROLE HANDLERS
// =========================================================================

func HandleAddRole(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.GetUserFromRequest(r)
	if user == nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	rawSkills := r.FormValue("skills")
	var skills []string
	for _, s := range strings.Split(rawSkills, ",") {
		s = strings.TrimSpace(s)
		if s != "" {
			skills = append(skills, s)
		}
	}

	rawAchievements := r.FormValue("achievements")
	var achievements []string
	for _, a := range strings.Split(rawAchievements, "\n") {
		a = strings.TrimSpace(a)
		if a != "" {
			achievements = append(achievements, a)
		}
	}

	role := models.UserRole{
		ID:               generateID("role"),
		UserID:           user.ID,
		RoleType:         r.FormValue("roleType"),
		Title:            strings.TrimSpace(r.FormValue("title")),
		OrganizationName: strings.TrimSpace(r.FormValue("organizationName")),
		OrganizationID:   strings.TrimSpace(r.FormValue("organizationId")),
		Status:           r.FormValue("status"),
		StartDate:        strings.TrimSpace(r.FormValue("startDate")),
		EndDate:          strings.TrimSpace(r.FormValue("endDate")),
		Description:      strings.TrimSpace(r.FormValue("description")),
		Skills:           skills,
		Achievements:     achievements,
		IsPrimary:        r.FormValue("isPrimary") == "true",
	}

	if role.Status == "" {
		role.Status = "active"
	}

	_ = db.CreateUserRole(&role)
	if isHTMX(r) {
		w.Header().Set("HX-Redirect", "/portfolio")
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Redirect(w, r, "/portfolio", http.StatusSeeOther)
}

func HandleDeleteRole(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.GetUserFromRequest(r)
	if user == nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	roleID := r.FormValue("roleId")
	_ = db.DeleteUserRole(roleID, user.ID)
	http.Redirect(w, r, "/portfolio", http.StatusSeeOther)
}

