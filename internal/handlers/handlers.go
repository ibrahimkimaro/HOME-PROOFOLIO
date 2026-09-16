package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"html/template"
	"net/http"
	"strings"
	"time"

	"home_proofolio/internal/auth"
	"home_proofolio/internal/db"
	"home_proofolio/internal/models"
)

type PageData struct {
	Title         string
	ActiveNav     string
	Redirect      string
	User          *models.User
	Profile       *models.Profile
	Profiles      []models.Profile
	Projects      []models.Project
	Problems      []models.ProblemCase
	Endorsements  []models.Endorsement
	Discussions   []models.DiscussionPost
	Articles      []models.ArticlePost
	Opportunities []models.Opportunity
	Inquiries     []models.Inquiry
	Roles         []models.UserRole
	Organizations []models.Organization
	CurrentOrg    *models.Organization
	Ideas         []models.Idea
	CurrentIdea   *models.Idea
	ActiveFilter  string
	RoleFilter    string
	SuccessMsg    string
	ErrMsg        string
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
		http.Redirect(w, r, "/login", http.StatusSeeOther)
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

	displayName := user.Username
	if profile != nil && profile.DisplayName != "" {
		displayName = profile.DisplayName
	}

	data := PageData{
		Title:         fmt.Sprintf("%s — Workspace & Multi-Role Console", displayName),
		ActiveNav:     "dashboard",
		User:          user,
		Profile:       profile,
		Projects:      projects,
		Problems:      problems,
		Endorsements:  endorsements,
		Inquiries:     inquiries,
		Roles:         roles,
		Organizations: orgs,
		Ideas:         ideas,
	}

	renderAppView(w, r, "dashboard.html", data)
}

// 4. Inquiries Inbox View (Authenticated)
func HandleInquiries(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	if user == nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
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
	} else if currentProfile != nil {
		profile = currentProfile
	} else {
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

	data := PageData{
		Title:         fmt.Sprintf("%s — Multi-Role Profile & Living Proofolio", displayName),
		ActiveNav:     "portfolio",
		User:          currentUser,
		Profile:       profile,
		Roles:         roles,
		Organizations: orgs,
		Ideas:         ideas,
		Projects:      projects,
		Problems:      problems,
		Endorsements:  endorsements,
		RoleFilter:    roleFilter,
	}

	if currentUser != nil {
		renderAppView(w, r, "portfolio.html", data)
	} else {
		renderLandingView(w, r, "portfolio.html", data)
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

	data := PageData{
		Title:       "Technical Discussions & Problem Solving",
		ActiveNav:   "discussions",
		User:        user,
		Profile:     profile,
		Discussions: discussions,
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

	data := PageData{
		Title:     "Articles, Case Studies & Whitepapers",
		ActiveNav: "articles",
		User:      user,
		Profile:   profile,
		Articles:  articles,
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

	data := PageData{
		Title:         "Contracts, Engagements & High-Impact Roles",
		ActiveNav:     "opportunities",
		User:          user,
		Profile:       profile,
		Opportunities: opportunities,
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

	prj := models.Project{
		ID:                generateID("prj"),
		UserID:            user.ID,
		Title:             strings.TrimSpace(r.FormValue("title")),
		Category:          strings.TrimSpace(r.FormValue("category")),
		Headline:          strings.TrimSpace(r.FormValue("headline")),
		ProblemSolved:     strings.TrimSpace(r.FormValue("problemSolved")),
		ArchitectureNotes: strings.TrimSpace(r.FormValue("architectureNotes")),
		LiveURL:           strings.TrimSpace(r.FormValue("liveUrl")),
		RepoURL:           strings.TrimSpace(r.FormValue("repoUrl")),
		TechStack:         stack,
		Metrics:           strings.TrimSpace(r.FormValue("metrics")),
		Status:            "completed",
		Featured:          true,
	}

	_ = db.CreateProject(&prj)
	HandlePortfolio(w, r)
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
		authorRole = profile.Headline
	}

	rawTags := r.FormValue("tags")
	var tags []string
	for _, t := range strings.Split(rawTags, ",") {
		t = strings.TrimSpace(t)
		if t != "" {
			tags = append(tags, t)
		}
	}

	a := models.ArticlePost{
		ID:             generateID("art"),
		UserID:         user.ID,
		AuthorName:     authorName,
		AuthorUsername: user.Username,
		AuthorRole:     authorRole,
		Title:          strings.TrimSpace(r.FormValue("title")),
		Category:       strings.TrimSpace(r.FormValue("category")),
		ReadTime:       "5 min read",
		Summary:        strings.TrimSpace(r.FormValue("summary")),
		Content:        strings.TrimSpace(r.FormValue("content")),
		Tags:           tags,
		ReadingTheme:   "paper",
		FontStyle:      "serif",
		Upvotes:        1,
		Upvoters:       []string{user.ID},
	}

	_ = db.CreateArticle(&a)
	HandleArticles(w, r)
}

func HandleUpvoteArticle(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}
	articleID := pathParts[3]

	user, _ := auth.GetUserFromRequest(r)
	voterID := "anon"
	if user != nil {
		voterID = user.ID
	}

	votes, err := db.UpvoteArticle(articleID, voterID)
	if err != nil {
		http.Error(w, "Error updating vote", http.StatusInternalServerError)
		return
	}

	fmt.Fprintf(w, "%d", votes)
}

// 17. Opportunities API
func HandleApplyOpportunity(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	app := models.OpportunityApplicant{
		ID:            generateID("app"),
		OpportunityID: r.FormValue("opportunityId"),
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
		fmt.Fprintf(w, `<div style="color:var(--color-terracotta); font-size:0.9rem;">Application error: %v</div>`, err)
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
		http.Error(w, "Authentication required", http.StatusUnauthorized)
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
	if user == nil {
		http.Redirect(w, r, "/login?redirect=/ideas", http.StatusSeeOther)
		return
	}

	ideas, _ := db.GetIdeasForUser(user.ID)
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

	renderAppView(w, r, "ideas.html", data)
}

func HandleIdeaDetail(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	if user == nil {
		http.Redirect(w, r, "/login?redirect=/ideas", http.StatusSeeOther)
		return
	}

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

	renderAppView(w, r, "idea_detail.html", data)
}

func HandleCreateIdea(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	if user == nil {
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

	http.Redirect(w, r, "/ideas", http.StatusSeeOther)
}

func HandleAddIdeaTimeline(w http.ResponseWriter, r *http.Request) {
	user, _ := auth.GetUserFromRequest(r)
	if user == nil {
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

