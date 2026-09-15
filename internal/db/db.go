package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"home_proofolio/internal/models"

	_ "github.com/lib/pq"
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
