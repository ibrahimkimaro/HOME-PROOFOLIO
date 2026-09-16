package db

import (
	"crypto/sha512"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"home_proofolio/internal/models"

	_ "github.com/lib/pq"
	"golang.org/x/crypto/pbkdf2"
)

var DB *sql.DB

func InitDB() (*sql.DB, error) {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://ibrahim_kimaro:kimmy001@localhost:5432/home_proofolio_db?sslmode=disable"
	}

	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)
	DB.SetConnMaxLifetime(5 * time.Minute)

	if err := DB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Connected to PostgreSQL successfully.")

	if err := migrateSchema(); err != nil {
		return nil, fmt.Errorf("migration failed: %w", err)
	}

	if err := seedIfEmpty(); err != nil {
		log.Printf("Seeding note: %v", err)
	}

	if err := seedNewFeatures(); err != nil {
		log.Printf("New features seeding note: %v", err)
	}

	return DB, nil
}

func migrateSchema() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id VARCHAR(64) PRIMARY KEY,
			email VARCHAR(255) UNIQUE NOT NULL,
			username VARCHAR(64) UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			password_salt TEXT NOT NULL,
			role VARCHAR(32) DEFAULT 'user',
			status VARCHAR(32) DEFAULT 'active',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS profiles (
			user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
			username VARCHAR(64) UNIQUE NOT NULL,
			display_name VARCHAR(255) NOT NULL,
			headline TEXT DEFAULT '',
			bio TEXT DEFAULT '',
			avatar_url TEXT DEFAULT '',
			location VARCHAR(255) DEFAULT '',
			category VARCHAR(64) DEFAULT 'developer',
			education_summary TEXT DEFAULT '',
			professional_summary TEXT DEFAULT '',
			skills JSONB DEFAULT '[]'::jsonb,
			social_links JSONB DEFAULT '{}'::jsonb,
			visibility VARCHAR(32) DEFAULT 'public',
			theme VARCHAR(64) DEFAULT 'editorial',
			font_style VARCHAR(64) DEFAULT 'serif',
			accent_color VARCHAR(64) DEFAULT 'emerald',
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS projects (
			id VARCHAR(64) PRIMARY KEY,
			user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			title VARCHAR(255) NOT NULL,
			category VARCHAR(64) DEFAULT '',
			headline TEXT DEFAULT '',
			problem_solved TEXT DEFAULT '',
			architecture_notes TEXT DEFAULT '',
			live_url TEXT DEFAULT '',
			repo_url TEXT DEFAULT '',
			tech_stack JSONB DEFAULT '[]'::jsonb,
			metrics TEXT DEFAULT '',
			status VARCHAR(32) DEFAULT 'completed',
			featured BOOLEAN DEFAULT false,
			accent_color VARCHAR(64) DEFAULT '',
			banner_gradient VARCHAR(64) DEFAULT '',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS problem_cases (
			id VARCHAR(64) PRIMARY KEY,
			user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			title VARCHAR(255) NOT NULL,
			domain VARCHAR(128) DEFAULT '',
			symptoms TEXT DEFAULT '',
			root_cause TEXT DEFAULT '',
			solution TEXT DEFAULT '',
			outcome TEXT DEFAULT '',
			tech_stack JSONB DEFAULT '[]'::jsonb,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS endorsements (
			id VARCHAR(64) PRIMARY KEY,
			target_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			author_user_id VARCHAR(64) DEFAULT '',
			author_name VARCHAR(255) NOT NULL,
			author_username VARCHAR(64) DEFAULT '',
			author_role VARCHAR(128) DEFAULT '',
			type VARCHAR(64) DEFAULT 'general',
			target_id VARCHAR(64) DEFAULT '',
			target_title VARCHAR(255) DEFAULT '',
			relationship VARCHAR(64) DEFAULT 'Colleague',
			content TEXT NOT NULL,
			verified BOOLEAN DEFAULT false,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS discussions (
			id VARCHAR(64) PRIMARY KEY,
			user_id VARCHAR(64) DEFAULT '',
			author_name VARCHAR(255) NOT NULL,
			author_username VARCHAR(64) DEFAULT '',
			author_role VARCHAR(128) DEFAULT '',
			title VARCHAR(255) NOT NULL,
			category VARCHAR(64) DEFAULT 'General',
			content TEXT NOT NULL,
			upvotes INT DEFAULT 0,
			upvoters JSONB DEFAULT '[]'::jsonb,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS discussion_replies (
			id VARCHAR(64) PRIMARY KEY,
			discussion_id VARCHAR(64) NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
			author_user_id VARCHAR(64) DEFAULT '',
			author_name VARCHAR(255) NOT NULL,
			author_username VARCHAR(64) DEFAULT '',
			author_role VARCHAR(128) DEFAULT '',
			content TEXT NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS articles (
			id VARCHAR(64) PRIMARY KEY,
			user_id VARCHAR(64) DEFAULT '',
			author_name VARCHAR(255) NOT NULL,
			author_username VARCHAR(64) DEFAULT '',
			author_role VARCHAR(128) DEFAULT '',
			title VARCHAR(255) NOT NULL,
			category VARCHAR(64) DEFAULT 'Architecture',
			read_time VARCHAR(32) DEFAULT '5 min read',
			summary TEXT DEFAULT '',
			content TEXT NOT NULL,
			upvotes INT DEFAULT 0,
			upvoters JSONB DEFAULT '[]'::jsonb,
			tags JSONB DEFAULT '[]'::jsonb,
			reading_theme VARCHAR(64) DEFAULT 'paper',
			font_style VARCHAR(64) DEFAULT 'serif',
			accent_color VARCHAR(64) DEFAULT '',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS inquiries (
			id VARCHAR(64) PRIMARY KEY,
			target_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			sender_user_id VARCHAR(64) DEFAULT '',
			sender_name VARCHAR(255) NOT NULL,
			sender_email VARCHAR(255) NOT NULL,
			sender_phone VARCHAR(64) DEFAULT '',
			project_type VARCHAR(128) DEFAULT '',
			budget_range VARCHAR(64) DEFAULT '',
			timeline VARCHAR(64) DEFAULT '',
			title VARCHAR(255) NOT NULL,
			description TEXT NOT NULL,
			status VARCHAR(64) DEFAULT 'new',
			notes TEXT DEFAULT '',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS opportunities (
			id VARCHAR(64) PRIMARY KEY,
			creator_user_id VARCHAR(64) DEFAULT '',
			creator_name VARCHAR(255) NOT NULL,
			creator_role VARCHAR(128) DEFAULT '',
			creator_company VARCHAR(128) DEFAULT '',
			title VARCHAR(255) NOT NULL,
			category VARCHAR(64) DEFAULT 'Contract',
			budget_or_salary VARCHAR(128) DEFAULT '',
			location VARCHAR(128) DEFAULT '',
			description TEXT NOT NULL,
			required_skills JSONB DEFAULT '[]'::jsonb,
			contact_email_or_url TEXT DEFAULT '',
			status VARCHAR(32) DEFAULT 'open',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS opportunity_applicants (
			id VARCHAR(64) PRIMARY KEY,
			opportunity_id VARCHAR(64) NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
			user_id VARCHAR(64) DEFAULT '',
			username VARCHAR(64) DEFAULT '',
			display_name VARCHAR(255) NOT NULL,
			headline TEXT DEFAULT '',
			email VARCHAR(255) DEFAULT '',
			message TEXT DEFAULT '',
			applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS sessions (
			token VARCHAR(128) PRIMARY KEY,
			user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			expires_at TIMESTAMP WITH TIME ZONE NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS user_roles (
			id VARCHAR(64) PRIMARY KEY,
			user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			role_type VARCHAR(64) NOT NULL,
			title VARCHAR(255) NOT NULL,
			organization_name VARCHAR(255) DEFAULT '',
			organization_id VARCHAR(64) DEFAULT '',
			status VARCHAR(64) DEFAULT 'active',
			start_date VARCHAR(64) DEFAULT '',
			end_date VARCHAR(64) DEFAULT '',
			description TEXT DEFAULT '',
			achievements JSONB DEFAULT '[]'::jsonb,
			skills JSONB DEFAULT '[]'::jsonb,
			is_primary BOOLEAN DEFAULT false,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS organizations (
			id VARCHAR(64) PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			slug VARCHAR(255) UNIQUE NOT NULL,
			tagline TEXT DEFAULT '',
			industry VARCHAR(128) DEFAULT '',
			logo_url TEXT DEFAULT '',
			about TEXT DEFAULT '',
			services JSONB DEFAULT '[]'::jsonb,
			products JSONB DEFAULT '[]'::jsonb,
			business_info JSONB DEFAULT '{}'::jsonb,
			contact_email VARCHAR(255) DEFAULT '',
			contact_phone VARCHAR(64) DEFAULT '',
			location VARCHAR(255) DEFAULT '',
			website VARCHAR(255) DEFAULT '',
			creator_user_id VARCHAR(64) DEFAULT '',
			verified BOOLEAN DEFAULT false,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS organization_members (
			id VARCHAR(64) PRIMARY KEY,
			organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
			user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			role_title VARCHAR(255) NOT NULL,
			role_type VARCHAR(64) DEFAULT 'member',
			joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			is_public BOOLEAN DEFAULT true
		);`,
		`CREATE TABLE IF NOT EXISTS organization_updates (
			id VARCHAR(64) PRIMARY KEY,
			organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
			author_user_id VARCHAR(64) DEFAULT '',
			author_name VARCHAR(255) NOT NULL,
			title VARCHAR(255) NOT NULL,
			content TEXT NOT NULL,
			category VARCHAR(64) DEFAULT 'Milestone',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS organization_projects (
			id VARCHAR(64) PRIMARY KEY,
			organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
			title VARCHAR(255) NOT NULL,
			description TEXT NOT NULL,
			status VARCHAR(64) DEFAULT 'active',
			metrics TEXT DEFAULT '',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS ideas (
			id VARCHAR(64) PRIMARY KEY,
			user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			title VARCHAR(255) NOT NULL,
			what_learned TEXT DEFAULT '',
			source VARCHAR(255) DEFAULT '',
			thoughts_questions TEXT DEFAULT '',
			current_understanding TEXT DEFAULT '',
			stage VARCHAR(32) DEFAULT 'NEW',
			visibility VARCHAR(32) DEFAULT 'private',
			tags JSONB DEFAULT '[]'::jsonb,
			linked_project_id VARCHAR(64) DEFAULT '',
			linked_problem_id VARCHAR(64) DEFAULT '',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS idea_timeline_entries (
			id VARCHAR(64) PRIMARY KEY,
			idea_id VARCHAR(64) NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
			user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			note TEXT NOT NULL,
			stage_at_entry VARCHAR(32) DEFAULT '',
			source VARCHAR(255) DEFAULT '',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,
	}

	for _, q := range queries {
		if _, err := DB.Exec(q); err != nil {
			return fmt.Errorf("failed executing query [%s]: %w", q, err)
		}
	}
	log.Println("PostgreSQL tables migrated successfully.")
	return nil
}

type SeedJSONData struct {
	Users         []models.User          `json:"users"`
	Profiles      []models.Profile       `json:"profiles"`
	Projects      []models.Project       `json:"projects"`
	Problems      []models.ProblemCase   `json:"problems"`
	Endorsements  []models.Endorsement   `json:"endorsements"`
	Discussions   []models.DiscussionPost `json:"discussions"`
	Articles      []models.ArticlePost   `json:"articles"`
	Inquiries     []models.Inquiry       `json:"inquiries"`
	Opportunities []models.Opportunity   `json:"opportunities"`
}

func seedIfEmpty() error {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil // Already seeded
	}

	log.Println("Users table empty. Seeding initial data from data/db.json...")
	filePath := "data/db.json"
	dataBytes, err := os.ReadFile(filePath)
	if err != nil {
		// Fallback path
		dataBytes, err = os.ReadFile("HOME-PROOFOLIO/data/db.json")
		if err != nil {
			return fmt.Errorf("could not read seed file: %w", err)
		}
	}

	var seed SeedJSONData
	if err := json.Unmarshal(dataBytes, &seed); err != nil {
		return fmt.Errorf("failed parsing seed json: %w", err)
	}

	// 1. Users
	for _, u := range seed.Users {
		cAt := u.CreatedAt
		if cAt.IsZero() {
			cAt = time.Now()
		}
		uAt := u.UpdatedAt
		if uAt.IsZero() {
			uAt = time.Now()
		}
		_, err := DB.Exec(`INSERT INTO users (id, email, username, password_hash, password_salt, role, status, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
			u.ID, u.Email, u.Username, u.PasswordHash, u.PasswordSalt, u.Role, u.Status, cAt, uAt)
		if err != nil {
			log.Printf("Error seeding user %s: %v", u.Username, err)
		}
	}

	// 2. Profiles
	for _, p := range seed.Profiles {
		skillsBytes, _ := json.Marshal(p.Skills)
		socialBytes, _ := json.Marshal(p.SocialLinks)
		uAt := p.UpdatedAt
		if uAt.IsZero() {
			uAt = time.Now()
		}
		_, err := DB.Exec(`INSERT INTO profiles (user_id, username, display_name, headline, bio, avatar_url, location, category, education_summary, professional_summary, skills, social_links, visibility, theme, font_style, accent_color, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) ON CONFLICT (user_id) DO NOTHING`,
			p.UserID, p.Username, p.DisplayName, p.Headline, p.Bio, p.AvatarURL, p.Location, p.Category, p.EducationSummary, p.ProfessionalSummary, string(skillsBytes), string(socialBytes), p.Visibility, p.Theme, p.FontStyle, p.AccentColor, uAt)
		if err != nil {
			log.Printf("Error seeding profile %s: %v", p.Username, err)
		}
	}

	// 3. Projects
	for _, prj := range seed.Projects {
		techBytes, _ := json.Marshal(prj.TechStack)
		cAt := prj.CreatedAt
		if cAt.IsZero() {
			cAt = time.Now()
		}
		uAt := prj.UpdatedAt
		if uAt.IsZero() {
			uAt = time.Now()
		}
		_, err := DB.Exec(`INSERT INTO projects (id, user_id, title, category, headline, problem_solved, architecture_notes, live_url, repo_url, tech_stack, metrics, status, featured, accent_color, banner_gradient, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) ON CONFLICT (id) DO NOTHING`,
			prj.ID, prj.UserID, prj.Title, prj.Category, prj.Headline, prj.ProblemSolved, prj.ArchitectureNotes, prj.LiveURL, prj.RepoURL, string(techBytes), prj.Metrics, prj.Status, prj.Featured, prj.AccentColor, prj.BannerGradient, cAt, uAt)
		if err != nil {
			log.Printf("Error seeding project %s: %v", prj.Title, err)
		}
	}

	// 4. Problems
	for _, pb := range seed.Problems {
		techBytes, _ := json.Marshal(pb.TechStack)
		cAt := pb.CreatedAt
		if cAt.IsZero() {
			cAt = time.Now()
		}
		uAt := pb.UpdatedAt
		if uAt.IsZero() {
			uAt = time.Now()
		}
		_, err := DB.Exec(`INSERT INTO problem_cases (id, user_id, title, domain, symptoms, root_cause, solution, outcome, tech_stack, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO NOTHING`,
			pb.ID, pb.UserID, pb.Title, pb.Domain, pb.Symptoms, pb.RootCause, pb.Solution, pb.Outcome, string(techBytes), cAt, uAt)
		if err != nil {
			log.Printf("Error seeding problem %s: %v", pb.Title, err)
		}
	}

	// 5. Endorsements
	for _, e := range seed.Endorsements {
		cAt := e.CreatedAt
		if cAt.IsZero() {
			cAt = time.Now()
		}
		_, err := DB.Exec(`INSERT INTO endorsements (id, target_user_id, author_user_id, author_name, author_username, author_role, type, target_id, target_title, relationship, content, verified, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (id) DO NOTHING`,
			e.ID, e.TargetUserID, e.AuthorUserID, e.AuthorName, e.AuthorUsername, e.AuthorRole, e.Type, e.TargetID, e.TargetTitle, e.Relationship, e.Content, e.Verified, cAt)
		if err != nil {
			log.Printf("Error seeding endorsement %s: %v", e.ID, err)
		}
	}

	// 6. Discussions
	for _, d := range seed.Discussions {
		upvotersBytes, _ := json.Marshal(d.Upvoters)
		cAt := d.CreatedAt
		if cAt.IsZero() {
			cAt = time.Now()
		}
		uAt := d.UpdatedAt
		if uAt.IsZero() {
			uAt = time.Now()
		}
		_, err := DB.Exec(`INSERT INTO discussions (id, user_id, author_name, author_username, author_role, title, category, content, upvotes, upvoters, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO NOTHING`,
			d.ID, d.UserID, d.AuthorName, d.AuthorUsername, d.AuthorRole, d.Title, d.Category, d.Content, d.Upvotes, string(upvotersBytes), cAt, uAt)
		if err != nil {
			log.Printf("Error seeding discussion %s: %v", d.Title, err)
		}
		for _, r := range d.Replies {
			rAt := r.CreatedAt
			if rAt.IsZero() {
				rAt = time.Now()
			}
			_, _ = DB.Exec(`INSERT INTO discussion_replies (id, discussion_id, author_user_id, author_name, author_username, author_role, content, created_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
				r.ID, d.ID, r.AuthorUserID, r.AuthorName, r.AuthorUsername, r.AuthorRole, r.Content, rAt)
		}
	}

	// 7. Articles
	for _, a := range seed.Articles {
		upvotersBytes, _ := json.Marshal(a.Upvoters)
		tagsBytes, _ := json.Marshal(a.Tags)
		cAt := a.CreatedAt
		if cAt.IsZero() {
			cAt = time.Now()
		}
		uAt := a.UpdatedAt
		if uAt.IsZero() {
			uAt = time.Now()
		}
		_, err := DB.Exec(`INSERT INTO articles (id, user_id, author_name, author_username, author_role, title, category, read_time, summary, content, upvotes, upvoters, tags, reading_theme, font_style, accent_color, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) ON CONFLICT (id) DO NOTHING`,
			a.ID, a.UserID, a.AuthorName, a.AuthorUsername, a.AuthorRole, a.Title, a.Category, a.ReadTime, a.Summary, a.Content, a.Upvotes, string(upvotersBytes), string(tagsBytes), a.ReadingTheme, a.FontStyle, a.AccentColor, cAt, uAt)
		if err != nil {
			log.Printf("Error seeding article %s: %v", a.Title, err)
		}
	}

	// 8. Inquiries
	for _, inq := range seed.Inquiries {
		cAt := inq.CreatedAt
		if cAt.IsZero() {
			cAt = time.Now()
		}
		uAt := inq.UpdatedAt
		if uAt.IsZero() {
			uAt = time.Now()
		}
		_, err := DB.Exec(`INSERT INTO inquiries (id, target_user_id, sender_user_id, sender_name, sender_email, sender_phone, project_type, budget_range, timeline, title, description, status, notes, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) ON CONFLICT (id) DO NOTHING`,
			inq.ID, inq.TargetUserID, inq.SenderUserID, inq.SenderName, inq.SenderEmail, inq.SenderPhone, inq.ProjectType, inq.BudgetRange, inq.Timeline, inq.Title, inq.Description, inq.Status, inq.Notes, cAt, uAt)
		if err != nil {
			log.Printf("Error seeding inquiry %s: %v", inq.Title, err)
		}
	}

	// 9. Opportunities
	for _, opp := range seed.Opportunities {
		skillsBytes, _ := json.Marshal(opp.RequiredSkills)
		cAt := opp.CreatedAt
		if cAt.IsZero() {
			cAt = time.Now()
		}
		uAt := opp.UpdatedAt
		if uAt.IsZero() {
			uAt = time.Now()
		}
		_, err := DB.Exec(`INSERT INTO opportunities (id, creator_user_id, creator_name, creator_role, creator_company, title, category, budget_or_salary, location, description, required_skills, contact_email_or_url, status, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) ON CONFLICT (id) DO NOTHING`,
			opp.ID, opp.CreatorUserID, opp.CreatorName, opp.CreatorRole, opp.CreatorCompany, opp.Title, opp.Category, opp.BudgetOrSalary, opp.Location, opp.Description, string(skillsBytes), opp.ContactEmailOrUrl, opp.Status, cAt, uAt)
		if err != nil {
			log.Printf("Error seeding opportunity %s: %v", opp.Title, err)
		}
		for _, app := range opp.Applicants {
			appAt := app.AppliedAt
			if appAt.IsZero() {
				appAt = time.Now()
			}
			_, _ = DB.Exec(`INSERT INTO opportunity_applicants (id, opportunity_id, user_id, username, display_name, headline, email, message, applied_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
				app.ID, opp.ID, app.UserID, app.Username, app.DisplayName, app.Headline, app.Email, app.Message, appAt)
		}
	}

	log.Println("PostgreSQL initial seeding completed successfully!")
	return nil
}

func seedNewFeatures() error {
	now := time.Now()

	// 1. Seed Amina's User & Multi-Role Profile
	var aminaCount int
	_ = DB.QueryRow("SELECT COUNT(*) FROM users WHERE username = 'amina'").Scan(&aminaCount)
	if aminaCount == 0 {
		key := pbkdf2.Key([]byte("amina001"), []byte("amina_salt_88192"), 100000, 64, sha512.New)
		hash := hex.EncodeToString(key)
		_, err := DB.Exec(`INSERT INTO users (id, email, username, password_hash, password_salt, role, status, created_at, updated_at)
			VALUES ('usr_amina', 'amina@xyzpharmacy.example.com', 'amina', $1, 'amina_salt_88192', 'user', 'active', $2, $2)`,
			hash, now)
		if err != nil {
			log.Printf("Error creating user amina: %v", err)
		} else {
			skillsJSON, _ := json.Marshal([]string{"Financial Auditing", "Cost Accounting", "Pharmaceutical Logistics", "Inventory Management", "ERP Automation", "Regulatory Compliance"})
			socialJSON, _ := json.Marshal(models.SocialLinks{Website: "https://xyzpharmacy.example.com", Linkedin: "https://linkedin.com/in/amina-kimaro"})
			_, _ = DB.Exec(`INSERT INTO profiles (user_id, username, display_name, headline, bio, avatar_url, location, category, education_summary, professional_summary, skills, social_links, visibility, theme, font_style, accent_color, updated_at)
				VALUES ('usr_amina', 'amina', 'Amina J. Kimaro', 'Accounting Student | Founder | Pharmacy Manager',
				'Merging disciplined cost accounting with pharmaceutical inventory logistics and community healthcare delivery. Founder of XYZ Pharmacy in Dar es Salaam.',
				'', 'Dar es Salaam, Tanzania', 'business',
				'B.Sc. in Applied Accounting & Financial Analysis (Candidate, 2026)',
				'Founder & Managing Director of XYZ Pharmacy; 3+ years optimizing dispensary inventory supply chains and forensic audit records.',
				$1, $2, 'public', 'editorial', 'serif', 'terracotta', $3)`,
				string(skillsJSON), string(socialJSON), now)
			log.Println("Seeded User & Profile for Amina (@amina).")
		}
	}

	// 2. Seed Multi-Roles for Amina
	var roleCount int
	_ = DB.QueryRow("SELECT COUNT(*) FROM user_roles WHERE user_id = 'usr_amina'").Scan(&roleCount)
	if roleCount == 0 {
		roles := []models.UserRole{
			{
				ID:               "role_amina_accounting",
				UserID:           "usr_amina",
				RoleType:         "student",
				Title:            "Accounting Student & Financial Auditor",
				OrganizationName: "National Institute of Financial & Business Studies",
				Status:           "active",
				StartDate:        "2023",
				EndDate:          "Present (Expected 2026)",
				Description:      "Specializing in retail inventory cost allocation, P&L variance reconciliation, and forensic cash flow controls for multi-branch retailers.",
				Achievements:     []string{"Dean's Honor List 2024 & 2025", "Top Scorer in Advanced Cost Management & Auditing"},
				Skills:           []string{"Financial Auditing", "Cost Accounting", "P&L Budget Variance", "Tax Compliance"},
				IsPrimary:        false,
			},
			{
				ID:               "role_amina_founder",
				UserID:           "usr_amina",
				RoleType:         "founder",
				Title:            "Founder & Managing Director",
				OrganizationName: "XYZ Healthcare Enterprises",
				OrganizationID:   "org_xyz_pharmacy",
				Status:           "active",
				StartDate:        "2023",
				EndDate:          "Present",
				Description:      "Incorporated XYZ Healthcare to provide verified, affordable pharmaceuticals with digital doorstep delivery. Managing seed capital, vendor agreements, and growth.",
				Achievements:     []string{"Built patient base of 3,400+ active chronic-care subscribers", "Zero-debt operational break-even achieved within 14 months"},
				Skills:           []string{"Business Incorporation", "Vendor Supply Contracts", "Capital Allocation", "Brand Strategy"},
				IsPrimary:        true,
			},
			{
				ID:               "role_amina_manager",
				UserID:           "usr_amina",
				RoleType:         "manager",
				Title:            "Pharmacy Operations Manager",
				OrganizationName: "XYZ Pharmacy",
				OrganizationID:   "org_xyz_pharmacy",
				Status:           "active",
				StartDate:        "2024",
				EndDate:          "Present",
				Description:      "Directing dispensary workflows, regulatory Pharmacy Council inspections, automated barcode batch tracking, and cold-chain temperature telemetry.",
				Achievements:     []string{"99.4% Essential Medication In-Stock Rate across 2026", "Eliminated expired stock write-downs by 85% with FIFO inventory automation"},
				Skills:           []string{"Pharmaceutical Logistics", "Inventory POS ERP", "Pharmacy Council Compliance", "Team Leadership"},
				IsPrimary:        false,
			},
		}

		for _, r := range roles {
			_ = CreateUserRole(&r)
		}
		log.Println("Seeded Multi-Roles for Amina.")
	}

	// 3. Seed Ibrahim's Multi-Roles
	var ibrahimRoleCount int
	_ = DB.QueryRow("SELECT COUNT(*) FROM user_roles WHERE user_id = 'usr_ibrahim'").Scan(&ibrahimRoleCount)
	if ibrahimRoleCount == 0 {
		ibrahimRoles := []models.UserRole{
			{
				ID:               "role_ibrahim_architect",
				UserID:           "usr_ibrahim",
				RoleType:         "engineer",
				Title:            "Principal Systems Architect",
				OrganizationName: "Proofolio Core Labs",
				OrganizationID:   "org_proofolio_tech",
				Status:           "active",
				StartDate:        "2022",
				EndDate:          "Present",
				Description:      "Architecting low-latency hypermedia edge runtimes in Go, PostgreSQL transactional integrity, and cryptographic proof verification protocols.",
				Achievements:     []string{"Pioneered Go + HTMX sub-15ms server architecture", "Zero downtime across high-concurrency verification benchmarks"},
				Skills:           []string{"Go (Golang)", "PostgreSQL", "Hypermedia HTMX", "Distributed Systems"},
				IsPrimary:        true,
			},
			{
				ID:               "role_ibrahim_founder",
				UserID:           "usr_ibrahim",
				RoleType:         "founder",
				Title:            "Technical Co-Founder",
				OrganizationName: "Proofolio Technologies",
				OrganizationID:   "org_proofolio_tech",
				Status:           "active",
				StartDate:        "2024",
				EndDate:          "Present",
				Description:      "Leading product roadmap, open-standard proof validation pipelines, and developer tooling ecosystem.",
				Achievements:     []string{"Launched universal living proof platform for multiple professions", "Established cryptographically verified trajectory standard"},
				Skills:           []string{"Product Architecture", "Ecosystem Growth", "Open Standards"},
				IsPrimary:        false,
			},
			{
				ID:               "role_ibrahim_mentor",
				UserID:           "usr_ibrahim",
				RoleType:         "specialist",
				Title:            "Systems Engineering Mentor",
				OrganizationName: "Go Developer Community",
				Status:           "active",
				StartDate:        "2021",
				EndDate:          "Present",
				Description:      "Mentoring engineers on database locking patterns, concurrency diagnostics, and clean architecture without framework bloat.",
				Achievements:     []string{"Published 12 technical whitepapers on concurrency and data isolation"},
				Skills:           []string{"Technical Mentorship", "Peer Code Reviews", "Performance Profiling"},
				IsPrimary:        false,
			},
		}
		for _, r := range ibrahimRoles {
			_ = CreateUserRole(&r)
		}
		log.Println("Seeded Multi-Roles for Ibrahim.")
	}

	// 4. Seed Organizations (XYZ Pharmacy & Proofolio Tech)
	var orgCount int
	_ = DB.QueryRow("SELECT COUNT(*) FROM organizations WHERE slug = 'xyz-pharmacy'").Scan(&orgCount)
	if orgCount == 0 {
		xyzPharmacy := models.Organization{
			ID:       "org_xyz_pharmacy",
			Name:     "XYZ Pharmacy & Community Health",
			Slug:     "xyz-pharmacy",
			Tagline:  "Community healthcare, verified pharmaceuticals & digital dispensing logistics",
			Industry: "Healthcare & Retail Pharmacy",
			LogoURL:  "/static/images/home-profolio-logo.jpeg",
			About:    "XYZ Pharmacy was established in Dar es Salaam to guarantee authentic medicines, eliminate life-threatening stockouts, and deliver maternal supplies directly to families. Founded by Amina J. Kimaro, we combine clinical excellence with verified inventory telemetry.",
			Services: []string{
				"Prescription Verification & Dispensing",
				"Chronic Disease Support (Hypertension & Diabetes Management)",
				"Diagnostic Screening (BP, Blood Glucose, Rapid Malaria Tests)",
				"Temperature-Monitored Home Delivery",
				"Corporate First-Aid & Fleet Kits",
			},
			Products: []models.OrgProduct{
				{
					Name:        "Essential Maternal Care Delivery Pack",
					Category:    "Maternal Health",
					Description: "Comprehensive sterile delivery pack, iron supplements, and prenatal vitamins certified by Ministry of Health.",
					Status:      "In Stock & Verified",
				},
				{
					Name:        "Pediatric Antibiotic Suspension (Batch-QR Verified)",
					Category:    "Pediatrics",
					Description: "Cold-chain monitored suspension with batch QR code verification to prevent counterfeit medication.",
					Status:      "In Stock & Verified",
				},
				{
					Name:        "Digital Glucometer & Test Strips Kit",
					Category:    "Chronic Care",
					Description: "Bluetooth-connected blood glucose monitoring kit for home diabetes tracking and telemedicine logs.",
					Status:      "In Stock & Verified",
				},
			},
			BusinessInfo: models.OrgBusinessInfo{
				RegistrationNo: "TZ-PHARM-2024-098",
				TaxID:          "TIN-994-201-84",
				FoundedYear:    "2023",
				Location:       "Bagamoyo Road, Mikocheni B, Dar es Salaam",
				Website:        "https://xyzpharmacy.example.com",
				Phone:          "+255 712 345 678",
				Email:          "contact@xyzpharmacy.example.com",
				LicenseStatus:  "Active License #PC-4421 (Pharmacy Council of Tanzania)",
			},
			ContactEmail:  "contact@xyzpharmacy.example.com",
			ContactPhone:  "+255 712 345 678",
			Location:      "Bagamoyo Road, Mikocheni B, Dar es Salaam, Tanzania",
			Website:       "https://xyzpharmacy.example.com",
			CreatorUserID: "usr_amina",
			Verified:      true,
		}

		_ = CreateOrganization(&xyzPharmacy)

		// Members for XYZ Pharmacy
		_ = AddOrganizationMember(&models.OrgMember{
			ID:             "mem_amina_xyz",
			OrganizationID: "org_xyz_pharmacy",
			UserID:         "usr_amina",
			RoleTitle:      "Founder & Pharmacy Operations Manager",
			RoleType:       "owner",
			IsPublic:       true,
		})
		_ = AddOrganizationMember(&models.OrgMember{
			ID:             "mem_hassan_xyz",
			OrganizationID: "org_xyz_pharmacy",
			UserID:         "usr_ibrahim",
			RoleTitle:      "Clinical Pharmacy & Systems Advisor",
			RoleType:       "specialist",
			IsPublic:       true,
		})

		// Updates for XYZ Pharmacy
		_ = AddOrganizationUpdate(&models.OrgUpdate{
			ID:             "upd_xyz_1",
			OrganizationID: "org_xyz_pharmacy",
			AuthorUserID:   "usr_amina",
			AuthorName:     "Amina J. Kimaro",
			Title:          "Zero-Stockout Milestone: 99.4% In-Stock Rate for Essential Antibiotics in Q2 2026",
			Content:        "By adopting predictive batch reordering and automated minimum threshold alerts, XYZ Pharmacy maintained 99.4% availability for critical pediatric medicines.",
			Category:       "Milestone",
		})
		_ = AddOrganizationUpdate(&models.OrgUpdate{
			ID:             "upd_xyz_2",
			OrganizationID: "org_xyz_pharmacy",
			AuthorUserID:   "usr_amina",
			AuthorName:     "Amina J. Kimaro",
			Title:          "Cold-Chain IoT Telemetry Installed for Insulin Storage",
			Content:        "Real-time IoT sensors now transmit refrigerator temperatures every 5 minutes to prevent potency degradation.",
			Category:       "Quality & Compliance",
		})

		// Projects for XYZ Pharmacy
		_, _ = DB.Exec(`INSERT INTO organization_projects (id, organization_id, title, description, status, metrics, created_at)
			VALUES ('proj_xyz_pos', 'org_xyz_pharmacy', 'Automated POS Batch Expiry & FIFO Sourcing',
			'Custom inventory algorithm alerting dispensary clerks to sell near-expiry units first, reducing product expiration write-offs.',
			'active', '85% Expiry Loss Reduction', $1)`, now)

		log.Println("Seeded Organization: XYZ Pharmacy.")
	}

	// 5. Seed Proofolio Organization for Ibrahim
	var proofolioOrgCount int
	_ = DB.QueryRow("SELECT COUNT(*) FROM organizations WHERE slug = 'proofolio-tech'").Scan(&proofolioOrgCount)
	if proofolioOrgCount == 0 {
		proofolioOrg := models.Organization{
			ID:       "org_proofolio_tech",
			Name:     "Proofolio Platform Technologies",
			Slug:     "proofolio-tech",
			Tagline:  "The Universal Proof-of-Work & Verified Credibility Standard",
			Industry: "Enterprise Software & Verification",
			LogoURL:  "/static/images/home-profolio-logo.jpeg",
			About:    "Proofolio transforms subjective resumes into executable, living proof across engineering, finance, healthcare, and management.",
			Services: []string{
				"Automated Architecture & Telemetry Verification",
				"Multi-Stage Problem Trajectory Engine",
				"Cryptographic Peer Consensus",
				"Direct Client RFP & Contract Pipeline",
			},
			Products: []models.OrgProduct{
				{
					Name:        "Proofolio Living Console",
					Category:    "Platform",
					Description: "Hypermedia-powered verified portfolio workspace for cross-disciplinary professionals.",
					Status:      "Active Production",
				},
			},
			BusinessInfo: models.OrgBusinessInfo{
				RegistrationNo: "PROOF-TECH-2026",
				Location:       "Remote / Global",
				Website:        "https://proofolio.io",
				LicenseStatus:  "Active Open Protocol",
			},
			ContactEmail:  "founders@proofolio.io",
			CreatorUserID: "usr_ibrahim",
			Verified:      true,
		}
		_ = CreateOrganization(&proofolioOrg)
		_ = AddOrganizationMember(&models.OrgMember{
			ID:             "mem_ibrahim_proofolio",
			OrganizationID: "org_proofolio_tech",
			UserID:         "usr_ibrahim",
			RoleTitle:      "Principal Systems Architect & Co-Founder",
			RoleType:       "owner",
			IsPublic:       true,
		})
	}

	// 6. Seed Ideas & Learning Journal for Amina
	var aminaIdeasCount int
	_ = DB.QueryRow("SELECT COUNT(*) FROM ideas WHERE user_id = 'usr_amina'").Scan(&aminaIdeasCount)
	if aminaIdeasCount == 0 {
		idea1 := models.Idea{
			ID:                   "idea_sales_ai",
			UserID:               "usr_amina",
			Title:                "Using AI for Small-Business Daily Sales & Inventory Forecasting",
			WhatLearned:          "Retail sales fluctuate heavily around month-end payday; manual ledger entries cause under-ordering of chronic meds when patients have cash and over-ordering when demand dips.",
			Source:               "Social media case study & observation at XYZ Pharmacy checkout counter",
			ThoughtsQuestions:    "Can a simple time-series algorithm calculate 30-day moving sales velocity and automatically propose batch orders before stock drops below safety margins?",
			CurrentUnderstanding: "Classified stock into Fast-Moving (antibiotics, analgesics) vs Slow-Moving (specialty diagnostics) to prevent working-capital lockup.",
			Stage:                "UNDERSTANDING",
			Visibility:           "team",
			Tags:                 []string{"AI", "Inventory", "Small Business", "Sales Analysis", "Pharmacy"},
			CreatedAt:            now.AddDate(0, 0, -20),
			UpdatedAt:            now,
		}
		_ = CreateIdea(&idea1)

		// Timeline history for Idea 1
		entries1 := []models.IdeaTimelineEntry{
			{
				ID:           "entry_ai_1",
				IdeaID:       "idea_sales_ai",
				UserID:       "usr_amina",
				Note:         "Saw discussion on AI retail demand forecasting on LinkedIn and realized small African pharmacies face identical stockout challenges.",
				StageAtEntry: "NEW",
				Source:       "LinkedIn Post by Retail Systems Engineer",
				CreatedAt:    now.AddDate(0, 0, -20),
			},
			{
				ID:           "entry_ai_2",
				IdeaID:       "idea_sales_ai",
				UserID:       "usr_amina",
				Note:         "Shadowed two dispensary clerks for 4 days. Recorded 18 instances where patients were turned away due to stockouts of hypertension pills.",
				StageAtEntry: "EXPLORING",
				Source:       "XYZ Pharmacy Counter Audits",
				CreatedAt:    now.AddDate(0, 0, -15),
			},
			{
				ID:           "entry_ai_3",
				IdeaID:       "idea_sales_ai",
				UserID:       "usr_amina",
				Note:         "Extracted 6 months of historical sales logs into spreadsheet. Identified a recurring 40% demand surge between the 26th and 3rd of every month.",
				StageAtEntry: "LEARNING",
				Source:       "Point-of-Sale Export Logs",
				CreatedAt:    now.AddDate(0, 0, -8),
			},
			{
				ID:           "entry_ai_4",
				IdeaID:       "idea_sales_ai",
				UserID:       "usr_amina",
				Note:         "Defined reorder trigger formula: (Average Daily Sales × Supplier Lead Time) + Safety Buffer. Prototyping automated alert in POS.",
				StageAtEntry: "UNDERSTANDING",
				Source:       "Supply Chain Accounting Framework",
				CreatedAt:    now.AddDate(0, 0, -2),
			},
		}
		for _, e := range entries1 {
			_ = AddIdeaTimelineEntry(&e)
		}

		idea2 := models.Idea{
			ID:                   "idea_fifo_qr",
			UserID:               "usr_amina",
			Title:                "FIFO Batch-QR Tagging for Perishable Pediatric Antibiotics",
			WhatLearned:          "Pharmacy Council regulations require zero expired drugs on dispensary shelves. Standard shelf rotation fails during busy evening rushes without visual barcode gating.",
			Source:               "Pharmacy Council Annual Inspection Checklist",
			ThoughtsQuestions:    "How can we prevent attendants from accidentally picking newer boxes from the top of the shelf?",
			CurrentUnderstanding: "Physical gravity-fed dispensers combined with barcode audio confirmation reduces expiry waste to nearly zero.",
			Stage:                "TESTING",
			Visibility:           "public",
			Tags:                 []string{"Compliance", "Logistics", "Pediatrics", "Auditing"},
			CreatedAt:            now.AddDate(0, 0, -12),
			UpdatedAt:            now,
		}
		_ = CreateIdea(&idea2)

		entries2 := []models.IdeaTimelineEntry{
			{
				ID:           "entry_fifo_1",
				IdeaID:       "idea_fifo_qr",
				UserID:       "usr_amina",
				Note:         "Noticed $320 worth of pediatric antibiotic syrups expired in storage because newer deliveries were stacked in front of older boxes.",
				StageAtEntry: "NEW",
				Source:       "Monthly Stocktake Discrepancy Report",
				CreatedAt:    now.AddDate(0, 0, -12),
			},
			{
				ID:           "entry_fifo_2",
				IdeaID:       "idea_fifo_qr",
				UserID:       "usr_amina",
				Note:         "Implemented color-coded batch stickers (Green = >6 months, Amber = 3-6 months, Red = <3 months).",
				StageAtEntry: "LEARNING",
				Source:       "Clinical Pharmacy Best Practices",
				CreatedAt:    now.AddDate(0, 0, -6),
			},
			{
				ID:           "entry_fifo_3",
				IdeaID:       "idea_fifo_qr",
				UserID:       "usr_amina",
				Note:         "Testing barcode scanner validation at register: if attendant scans a box with an older batch pending, register alerts with audio chime.",
				StageAtEntry: "TESTING",
				Source:       "Active Pilot at XYZ Pharmacy Branch 1",
				CreatedAt:    now.AddDate(0, 0, -1),
			},
		}
		for _, e := range entries2 {
			_ = AddIdeaTimelineEntry(&e)
		}

		log.Println("Seeded Ideas & Learning Journal for Amina.")
	}

	// 7. Seed Idea for Ibrahim
	var ibrahimIdeasCount int
	_ = DB.QueryRow("SELECT COUNT(*) FROM ideas WHERE user_id = 'usr_ibrahim'").Scan(&ibrahimIdeasCount)
	if ibrahimIdeasCount == 0 {
		ideaIbr := models.Idea{
			ID:                   "idea_sse_live_reload",
			UserID:               "usr_ibrahim",
			Title:                "Zero-Dependency Live Reload Engine via Server-Sent Events (SSE)",
			WhatLearned:          "Full WebSockets require complex connection upgrades, heartbeat ping/pongs, and external client libraries. Server-Sent Events (SSE) natively run over plain HTTP with automatic browser reconnect.",
			Source:               "HTTP/2 & SSE Specification Review",
			ThoughtsQuestions:    "Can we hot-swap CSS stylesheets without reloading the page while triggering full reload on HTML template changes?",
			CurrentUnderstanding: "Yes! By checking file extension in the server-side filesystem watcher, broadcasting `type: css` updates `<link>` tags in-place in under 5ms.",
			Stage:                "PROJECT",
			Visibility:           "public",
			Tags:                 []string{"Go", "HTTP", "Developer Experience", "Hypermedia"},
			CreatedAt:            now.AddDate(0, 0, -14),
			UpdatedAt:            now,
		}
		_ = CreateIdea(&ideaIbr)
		_ = AddIdeaTimelineEntry(&models.IdeaTimelineEntry{
			ID:           "entry_ibr_1",
			IdeaID:       "idea_sse_live_reload",
			UserID:       "usr_ibrahim",
			Note:         "Investigated why developer hot-reload was missing. Evaluated Node toolchains vs native Go SSE watcher.",
			StageAtEntry: "EXPLORING",
			Source:       "Proofolio Platform Dev Review",
			CreatedAt:    now.AddDate(0, 0, -14),
		})
		_ = AddIdeaTimelineEntry(&models.IdeaTimelineEntry{
			ID:           "entry_ibr_2",
			IdeaID:       "idea_sse_live_reload",
			UserID:       "usr_ibrahim",
			Note:         "Implemented internal/devreload/devreload.go watching file modification timestamps every 400ms. Successfully tested hot reloading on LAN mobile phone!",
			StageAtEntry: "PROJECT",
			Source:       "Production Implementation in Proofolio",
			CreatedAt:    now,
		})
		log.Println("Seeded Idea for Ibrahim.")
	}

	return nil
}
