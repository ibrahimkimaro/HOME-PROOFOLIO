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
	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, fmt.Sprintf("Template execute error: %v", err), http.StatusInternalServerError)
	}
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
	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, fmt.Sprintf("Template execute error: %v", err), http.StatusInternalServerError)
	}
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
		if err := tmpl.ExecuteTemplate(w, "content", data); err != nil {
			http.Error(w, fmt.Sprintf("Template execute error: %v", err), http.StatusInternalServerError)
		}
		return
	}

	tmpl, err := template.ParseFiles(layoutPath, pagePath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Template parse error: %v", err), http.StatusInternalServerError)
		return
	}
	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, fmt.Sprintf("Template execute error: %v", err), http.StatusInternalServerError)
	}
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

	data := PageData{
		Title:        "Engineering Console & Workspace",
		ActiveNav:    "dashboard",
		User:         user,
		Profile:      profile,
		Projects:     projects,
		Problems:     problems,
		Endorsements: endorsements,
		Inquiries:    inquiries,
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

// 5. Engineer Portfolio View
func HandlePortfolio(w http.ResponseWriter, r *http.Request) {
	user, currentProfile := auth.GetUserFromRequest(r)

	profile, _ := db.GetProfileByUsername("ibrahim")
	if profile == nil && currentProfile != nil {
		profile = currentProfile
	}

	projects, _ := db.GetAllProjects()
	problems, _ := db.GetAllProblems()
	endorsements, _ := db.GetEndorsementsByTargetUser("usr_ibrahim")

	data := PageData{
		Title:        "Ibrahim Kimaro — Verified Engineering Portfolio",
		ActiveNav:    "portfolio",
		User:         user,
		Profile:      profile,
		Projects:     projects,
		Problems:     problems,
		Endorsements: endorsements,
	}

	if user != nil {
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
		Title:     "Discover Verified Engineers & Specialists",
		ActiveNav: "discover",
		User:      user,
		Profile:   profile,
		Profiles:  profiles,
	}

	if user != nil {
		renderAppView(w, r, "discover.html", data)
	} else {
		renderLandingView(w, r, "discover.html", data)
	}
}

// 7. Discussions View
func HandleDiscussions(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	discussions, _ := db.GetAllDiscussions()

	data := PageData{
		Title:       "Technical Discussions & Architecture Dilemmas",
		ActiveNav:   "discussions",
		User:        user,
		Profile:     profile,
		Discussions: discussions,
	}

	if user != nil {
		renderAppView(w, r, "discussions.html", data)
	} else {
		renderLandingView(w, r, "discussions.html", data)
	}
}

// 8. Articles View
func HandleArticles(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	articles, _ := db.GetAllArticles()

	data := PageData{
		Title:     "Technical Articles & Whitepapers",
		ActiveNav: "articles",
		User:      user,
		Profile:   profile,
		Articles:  articles,
	}

	if user != nil {
		renderAppView(w, r, "articles.html", data)
	} else {
		renderLandingView(w, r, "articles.html", data)
	}
}

// 9. Opportunities View
func HandleOpportunities(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	opportunities, _ := db.GetAllOpportunities()

	data := PageData{
		Title:         "Engineering Contracts & High-Impact Roles",
		ActiveNav:     "opportunities",
		User:          user,
		Profile:       profile,
		Opportunities: opportunities,
	}

	if user != nil {
		renderAppView(w, r, "opportunities.html", data)
	} else {
		renderLandingView(w, r, "opportunities.html", data)
	}
}

// 10. Login View & Action
func HandleLoginView(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	if user != nil {
		http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
		return
	}

	data := PageData{
		Title:     "Sign In to Console",
		ActiveNav: "login",
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
		w.Header().Set("HX-Redirect", "/dashboard")
		w.WriteHeader(http.StatusOK)
		return
	}

	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
}

// 11. Register View & Action
func HandleRegisterView(w http.ResponseWriter, r *http.Request) {
	user, profile := auth.GetUserFromRequest(r)
	if user != nil {
		http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
		return
	}

	data := PageData{
		Title:     "Create Your Proofolio",
		ActiveNav: "register",
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

	if isHTMX(r) {
		w.Header().Set("HX-Redirect", "/dashboard")
		w.WriteHeader(http.StatusOK)
		return
	}

	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
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
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	authorName := user.Username
	authorRole := "Engineer"
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
	if user == nil {
		http.Error(w, "Authentication required", http.StatusUnauthorized)
		return
	}

	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}
	discussionID := pathParts[3]

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
