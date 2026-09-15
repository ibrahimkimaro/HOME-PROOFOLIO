package db

import (
	"encoding/json"
	"time"

	"home_proofolio/internal/models"
)

// --- User Queries ---

func GetUserByEmail(email string) (*models.User, error) {
	var u models.User
	err := DB.QueryRow(`SELECT id, email, username, password_hash, password_salt, role, status, created_at, updated_at
		FROM users WHERE LOWER(email) = LOWER($1)`, email).
		Scan(&u.ID, &u.Email, &u.Username, &u.PasswordHash, &u.PasswordSalt, &u.Role, &u.Status, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func GetUserByUsername(username string) (*models.User, error) {
	var u models.User
	err := DB.QueryRow(`SELECT id, email, username, password_hash, password_salt, role, status, created_at, updated_at
		FROM users WHERE LOWER(username) = LOWER($1)`, username).
		Scan(&u.ID, &u.Email, &u.Username, &u.PasswordHash, &u.PasswordSalt, &u.Role, &u.Status, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func GetUserByID(id string) (*models.User, error) {
	var u models.User
	err := DB.QueryRow(`SELECT id, email, username, password_hash, password_salt, role, status, created_at, updated_at
		FROM users WHERE id = $1`, id).
		Scan(&u.ID, &u.Email, &u.Username, &u.PasswordHash, &u.PasswordSalt, &u.Role, &u.Status, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func CreateUser(u *models.User) error {
	now := time.Now()
	_, err := DB.Exec(`INSERT INTO users (id, email, username, password_hash, password_salt, role, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		u.ID, u.Email, u.Username, u.PasswordHash, u.PasswordSalt, u.Role, u.Status, now, now)
	return err
}

// --- Session Queries ---

func CreateSession(token, userID string, expiresAt time.Time) error {
	_, err := DB.Exec(`INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES ($1, $2, $3, $4)`,
		token, userID, time.Now(), expiresAt)
	return err
}

func GetSession(token string) (*models.Session, error) {
	var s models.Session
	err := DB.QueryRow(`SELECT token, user_id, created_at, expires_at FROM sessions WHERE token = $1 AND expires_at > $2`,
		token, time.Now()).Scan(&s.Token, &s.UserID, &s.CreatedAt, &s.ExpiresAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func DeleteSession(token string) error {
	_, err := DB.Exec(`DELETE FROM sessions WHERE token = $1`, token)
	return err
}

// --- Profile Queries ---

func GetProfileByUserID(userID string) (*models.Profile, error) {
	var p models.Profile
	var skillsRaw, socialRaw []byte
	err := DB.QueryRow(`SELECT user_id, username, display_name, headline, bio, avatar_url, location, category,
		education_summary, professional_summary, skills, social_links, visibility, theme, font_style, accent_color, updated_at
		FROM profiles WHERE user_id = $1`, userID).
		Scan(&p.UserID, &p.Username, &p.DisplayName, &p.Headline, &p.Bio, &p.AvatarURL, &p.Location, &p.Category,
			&p.EducationSummary, &p.ProfessionalSummary, &skillsRaw, &socialRaw, &p.Visibility, &p.Theme, &p.FontStyle, &p.AccentColor, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(skillsRaw, &p.Skills)
	_ = json.Unmarshal(socialRaw, &p.SocialLinks)
	return &p, nil
}

func GetProfileByUsername(username string) (*models.Profile, error) {
	var p models.Profile
	var skillsRaw, socialRaw []byte
	err := DB.QueryRow(`SELECT user_id, username, display_name, headline, bio, avatar_url, location, category,
		education_summary, professional_summary, skills, social_links, visibility, theme, font_style, accent_color, updated_at
		FROM profiles WHERE LOWER(username) = LOWER($1)`, username).
		Scan(&p.UserID, &p.Username, &p.DisplayName, &p.Headline, &p.Bio, &p.AvatarURL, &p.Location, &p.Category,
			&p.EducationSummary, &p.ProfessionalSummary, &skillsRaw, &socialRaw, &p.Visibility, &p.Theme, &p.FontStyle, &p.AccentColor, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(skillsRaw, &p.Skills)
	_ = json.Unmarshal(socialRaw, &p.SocialLinks)
	return &p, nil
}

func GetAllProfiles() ([]models.Profile, error) {
	rows, err := DB.Query(`SELECT user_id, username, display_name, headline, bio, avatar_url, location, category,
		education_summary, professional_summary, skills, social_links, visibility, theme, font_style, accent_color, updated_at
		FROM profiles ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.Profile
	for rows.Next() {
		var p models.Profile
		var skillsRaw, socialRaw []byte
		if err := rows.Scan(&p.UserID, &p.Username, &p.DisplayName, &p.Headline, &p.Bio, &p.AvatarURL, &p.Location, &p.Category,
			&p.EducationSummary, &p.ProfessionalSummary, &skillsRaw, &socialRaw, &p.Visibility, &p.Theme, &p.FontStyle, &p.AccentColor, &p.UpdatedAt); err == nil {
			_ = json.Unmarshal(skillsRaw, &p.Skills)
			_ = json.Unmarshal(socialRaw, &p.SocialLinks)
			list = append(list, p)
		}
	}
	return list, nil
}

func CreateOrUpdateProfile(p *models.Profile) error {
	skillsRaw, _ := json.Marshal(p.Skills)
	socialRaw, _ := json.Marshal(p.SocialLinks)
	_, err := DB.Exec(`INSERT INTO profiles (user_id, username, display_name, headline, bio, avatar_url, location, category, education_summary, professional_summary, skills, social_links, visibility, theme, font_style, accent_color, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
		ON CONFLICT (user_id) DO UPDATE SET
			username = EXCLUDED.username,
			display_name = EXCLUDED.display_name,
			headline = EXCLUDED.headline,
			bio = EXCLUDED.bio,
			avatar_url = EXCLUDED.avatar_url,
			location = EXCLUDED.location,
			category = EXCLUDED.category,
			education_summary = EXCLUDED.education_summary,
			professional_summary = EXCLUDED.professional_summary,
			skills = EXCLUDED.skills,
			social_links = EXCLUDED.social_links,
			visibility = EXCLUDED.visibility,
			theme = EXCLUDED.theme,
			font_style = EXCLUDED.font_style,
			accent_color = EXCLUDED.accent_color,
			updated_at = CURRENT_TIMESTAMP`,
		p.UserID, p.Username, p.DisplayName, p.Headline, p.Bio, p.AvatarURL, p.Location, p.Category,
		p.EducationSummary, p.ProfessionalSummary, string(skillsRaw), string(socialRaw), p.Visibility, p.Theme, p.FontStyle, p.AccentColor, time.Now())
	return err
}

// --- Project Queries ---

func GetProjectsByUserID(userID string) ([]models.Project, error) {
	rows, err := DB.Query(`SELECT id, user_id, title, category, headline, problem_solved, architecture_notes,
		live_url, repo_url, tech_stack, metrics, status, featured, accent_color, banner_gradient, created_at, updated_at
		FROM projects WHERE user_id = $1 ORDER BY featured DESC, created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.Project
	for rows.Next() {
		var prj models.Project
		var techRaw []byte
		if err := rows.Scan(&prj.ID, &prj.UserID, &prj.Title, &prj.Category, &prj.Headline, &prj.ProblemSolved,
			&prj.ArchitectureNotes, &prj.LiveURL, &prj.RepoURL, &techRaw, &prj.Metrics, &prj.Status, &prj.Featured,
			&prj.AccentColor, &prj.BannerGradient, &prj.CreatedAt, &prj.UpdatedAt); err == nil {
			_ = json.Unmarshal(techRaw, &prj.TechStack)
			list = append(list, prj)
		}
	}
	return list, nil
}

func GetAllProjects() ([]models.Project, error) {
	rows, err := DB.Query(`SELECT id, user_id, title, category, headline, problem_solved, architecture_notes,
		live_url, repo_url, tech_stack, metrics, status, featured, accent_color, banner_gradient, created_at, updated_at
		FROM projects ORDER BY featured DESC, created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.Project
	for rows.Next() {
		var prj models.Project
		var techRaw []byte
		if err := rows.Scan(&prj.ID, &prj.UserID, &prj.Title, &prj.Category, &prj.Headline, &prj.ProblemSolved,
			&prj.ArchitectureNotes, &prj.LiveURL, &prj.RepoURL, &techRaw, &prj.Metrics, &prj.Status, &prj.Featured,
			&prj.AccentColor, &prj.BannerGradient, &prj.CreatedAt, &prj.UpdatedAt); err == nil {
			_ = json.Unmarshal(techRaw, &prj.TechStack)
			list = append(list, prj)
		}
	}
	return list, nil
}

func CreateProject(prj *models.Project) error {
	techRaw, _ := json.Marshal(prj.TechStack)
	now := time.Now()
	_, err := DB.Exec(`INSERT INTO projects (id, user_id, title, category, headline, problem_solved, architecture_notes, live_url, repo_url, tech_stack, metrics, status, featured, accent_color, banner_gradient, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
		prj.ID, prj.UserID, prj.Title, prj.Category, prj.Headline, prj.ProblemSolved, prj.ArchitectureNotes, prj.LiveURL, prj.RepoURL, string(techRaw), prj.Metrics, prj.Status, prj.Featured, prj.AccentColor, prj.BannerGradient, now, now)
	return err
}

// --- Problem Case Queries ---

func GetProblemsByUserID(userID string) ([]models.ProblemCase, error) {
	rows, err := DB.Query(`SELECT id, user_id, title, domain, symptoms, root_cause, solution, outcome, tech_stack, created_at, updated_at
		FROM problem_cases WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.ProblemCase
	for rows.Next() {
		var pb models.ProblemCase
		var techRaw []byte
		if err := rows.Scan(&pb.ID, &pb.UserID, &pb.Title, &pb.Domain, &pb.Symptoms, &pb.RootCause, &pb.Solution, &pb.Outcome, &techRaw, &pb.CreatedAt, &pb.UpdatedAt); err == nil {
			_ = json.Unmarshal(techRaw, &pb.TechStack)
			list = append(list, pb)
		}
	}
	return list, nil
}

func GetAllProblems() ([]models.ProblemCase, error) {
	rows, err := DB.Query(`SELECT id, user_id, title, domain, symptoms, root_cause, solution, outcome, tech_stack, created_at, updated_at
		FROM problem_cases ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.ProblemCase
	for rows.Next() {
		var pb models.ProblemCase
		var techRaw []byte
		if err := rows.Scan(&pb.ID, &pb.UserID, &pb.Title, &pb.Domain, &pb.Symptoms, &pb.RootCause, &pb.Solution, &pb.Outcome, &techRaw, &pb.CreatedAt, &pb.UpdatedAt); err == nil {
			_ = json.Unmarshal(techRaw, &pb.TechStack)
			list = append(list, pb)
		}
	}
	return list, nil
}

func CreateProblem(pb *models.ProblemCase) error {
	techRaw, _ := json.Marshal(pb.TechStack)
	now := time.Now()
	_, err := DB.Exec(`INSERT INTO problem_cases (id, user_id, title, domain, symptoms, root_cause, solution, outcome, tech_stack, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		pb.ID, pb.UserID, pb.Title, pb.Domain, pb.Symptoms, pb.RootCause, pb.Solution, pb.Outcome, string(techRaw), now, now)
	return err
}

// --- Endorsements Queries ---

func GetEndorsementsByTargetUser(targetUserID string) ([]models.Endorsement, error) {
	rows, err := DB.Query(`SELECT id, target_user_id, author_user_id, author_name, author_username, author_role, type, target_id, target_title, relationship, content, verified, created_at
		FROM endorsements WHERE target_user_id = $1 ORDER BY created_at DESC`, targetUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.Endorsement
	for rows.Next() {
		var e models.Endorsement
		if err := rows.Scan(&e.ID, &e.TargetUserID, &e.AuthorUserID, &e.AuthorName, &e.AuthorUsername, &e.AuthorRole, &e.Type, &e.TargetID, &e.TargetTitle, &e.Relationship, &e.Content, &e.Verified, &e.CreatedAt); err == nil {
			list = append(list, e)
		}
	}
	return list, nil
}

func CreateEndorsement(e *models.Endorsement) error {
	now := time.Now()
	_, err := DB.Exec(`INSERT INTO endorsements (id, target_user_id, author_user_id, author_name, author_username, author_role, type, target_id, target_title, relationship, content, verified, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
		e.ID, e.TargetUserID, e.AuthorUserID, e.AuthorName, e.AuthorUsername, e.AuthorRole, e.Type, e.TargetID, e.TargetTitle, e.Relationship, e.Content, e.Verified, now)
	return err
}

// --- Discussions Queries ---

func GetAllDiscussions() ([]models.DiscussionPost, error) {
	rows, err := DB.Query(`SELECT id, user_id, author_name, author_username, author_role, title, category, content, upvotes, upvoters, created_at, updated_at
		FROM discussions ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.DiscussionPost
	for rows.Next() {
		var d models.DiscussionPost
		var upvotersRaw []byte
		if err := rows.Scan(&d.ID, &d.UserID, &d.AuthorName, &d.AuthorUsername, &d.AuthorRole, &d.Title, &d.Category, &d.Content, &d.Upvotes, &upvotersRaw, &d.CreatedAt, &d.UpdatedAt); err == nil {
			_ = json.Unmarshal(upvotersRaw, &d.Upvoters)
			// Load replies
			d.Replies = getRepliesForDiscussion(d.ID)
			list = append(list, d)
		}
	}
	return list, nil
}

func getRepliesForDiscussion(discussionID string) []models.DiscussionReply {
	rows, err := DB.Query(`SELECT id, discussion_id, author_user_id, author_name, author_username, author_role, content, created_at
		FROM discussion_replies WHERE discussion_id = $1 ORDER BY created_at ASC`, discussionID)
	if err != nil {
		return []models.DiscussionReply{}
	}
	defer rows.Close()

	var list []models.DiscussionReply
	for rows.Next() {
		var r models.DiscussionReply
		if err := rows.Scan(&r.ID, &r.DiscussionID, &r.AuthorUserID, &r.AuthorName, &r.AuthorUsername, &r.AuthorRole, &r.Content, &r.CreatedAt); err == nil {
			list = append(list, r)
		}
	}
	return list
}

func GetDiscussionByID(id string) (*models.DiscussionPost, error) {
	var d models.DiscussionPost
	var upvotersRaw []byte
	err := DB.QueryRow(`SELECT id, user_id, author_name, author_username, author_role, title, category, content, upvotes, upvoters, created_at, updated_at
		FROM discussions WHERE id = $1`, id).
		Scan(&d.ID, &d.UserID, &d.AuthorName, &d.AuthorUsername, &d.AuthorRole, &d.Title, &d.Category, &d.Content, &d.Upvotes, &upvotersRaw, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(upvotersRaw, &d.Upvoters)
	d.Replies = getRepliesForDiscussion(d.ID)
	return &d, nil
}

func CreateDiscussion(d *models.DiscussionPost) error {
	upvotersRaw, _ := json.Marshal(d.Upvoters)
	now := time.Now()
	_, err := DB.Exec(`INSERT INTO discussions (id, user_id, author_name, author_username, author_role, title, category, content, upvotes, upvoters, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		d.ID, d.UserID, d.AuthorName, d.AuthorUsername, d.AuthorRole, d.Title, d.Category, d.Content, d.Upvotes, string(upvotersRaw), now, now)
	return err
}

func CreateDiscussionReply(r *models.DiscussionReply) error {
	now := time.Now()
	_, err := DB.Exec(`INSERT INTO discussion_replies (id, discussion_id, author_user_id, author_name, author_username, author_role, content, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		r.ID, r.DiscussionID, r.AuthorUserID, r.AuthorName, r.AuthorUsername, r.AuthorRole, r.Content, now)
	return err
}

func UpvoteDiscussion(id, userID string) (int, error) {
	d, err := GetDiscussionByID(id)
	if err != nil {
		return 0, err
	}

	alreadyUpvoted := false
	for _, u := range d.Upvoters {
		if u == userID {
			alreadyUpvoted = true
			break
		}
	}

	if alreadyUpvoted {
		// remove upvote
		var updated []string
		for _, u := range d.Upvoters {
			if u != userID {
				updated = append(updated, u)
			}
		}
		d.Upvoters = updated
		d.Upvotes = len(updated)
	} else {
		d.Upvoters = append(d.Upvoters, userID)
		d.Upvotes = len(d.Upvoters)
	}

	raw, _ := json.Marshal(d.Upvoters)
	_, err = DB.Exec(`UPDATE discussions SET upvotes = $1, upvoters = $2 WHERE id = $3`, d.Upvotes, string(raw), id)
	return d.Upvotes, err
}

// --- Articles Queries ---

func GetAllArticles() ([]models.ArticlePost, error) {
	rows, err := DB.Query(`SELECT id, user_id, author_name, author_username, author_role, title, category, read_time, summary, content, upvotes, upvoters, tags, reading_theme, font_style, accent_color, created_at, updated_at
		FROM articles ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.ArticlePost
	for rows.Next() {
		var a models.ArticlePost
		var upvotersRaw, tagsRaw []byte
		if err := rows.Scan(&a.ID, &a.UserID, &a.AuthorName, &a.AuthorUsername, &a.AuthorRole, &a.Title, &a.Category, &a.ReadTime, &a.Summary, &a.Content, &a.Upvotes, &upvotersRaw, &tagsRaw, &a.ReadingTheme, &a.FontStyle, &a.AccentColor, &a.CreatedAt, &a.UpdatedAt); err == nil {
			_ = json.Unmarshal(upvotersRaw, &a.Upvoters)
			_ = json.Unmarshal(tagsRaw, &a.Tags)
			list = append(list, a)
		}
	}
	return list, nil
}

func GetArticleByID(id string) (*models.ArticlePost, error) {
	var a models.ArticlePost
	var upvotersRaw, tagsRaw []byte
	err := DB.QueryRow(`SELECT id, user_id, author_name, author_username, author_role, title, category, read_time, summary, content, upvotes, upvoters, tags, reading_theme, font_style, accent_color, created_at, updated_at
		FROM articles WHERE id = $1`, id).
		Scan(&a.ID, &a.UserID, &a.AuthorName, &a.AuthorUsername, &a.AuthorRole, &a.Title, &a.Category, &a.ReadTime, &a.Summary, &a.Content, &a.Upvotes, &upvotersRaw, &tagsRaw, &a.ReadingTheme, &a.FontStyle, &a.AccentColor, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(upvotersRaw, &a.Upvoters)
	_ = json.Unmarshal(tagsRaw, &a.Tags)
	return &a, nil
}

func CreateArticle(a *models.ArticlePost) error {
	upvotersRaw, _ := json.Marshal(a.Upvoters)
	tagsRaw, _ := json.Marshal(a.Tags)
	now := time.Now()
	_, err := DB.Exec(`INSERT INTO articles (id, user_id, author_name, author_username, author_role, title, category, read_time, summary, content, upvotes, upvoters, tags, reading_theme, font_style, accent_color, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
		a.ID, a.UserID, a.AuthorName, a.AuthorUsername, a.AuthorRole, a.Title, a.Category, a.ReadTime, a.Summary, a.Content, a.Upvotes, string(upvotersRaw), string(tagsRaw), a.ReadingTheme, a.FontStyle, a.AccentColor, now, now)
	return err
}

func UpvoteArticle(id, userID string) (int, error) {
	a, err := GetArticleByID(id)
	if err != nil {
		return 0, err
	}

	alreadyUpvoted := false
	for _, u := range a.Upvoters {
		if u == userID {
			alreadyUpvoted = true
			break
		}
	}

	if alreadyUpvoted {
		var updated []string
		for _, u := range a.Upvoters {
			if u != userID {
				updated = append(updated, u)
			}
		}
		a.Upvoters = updated
		a.Upvotes = len(updated)
	} else {
		a.Upvoters = append(a.Upvoters, userID)
		a.Upvotes = len(a.Upvoters)
	}

	raw, _ := json.Marshal(a.Upvoters)
	_, err = DB.Exec(`UPDATE articles SET upvotes = $1, upvoters = $2 WHERE id = $3`, a.Upvotes, string(raw), id)
	return a.Upvotes, err
}

// --- Inquiries Queries ---

func GetInquiriesForUser(targetUserID string) ([]models.Inquiry, error) {
	rows, err := DB.Query(`SELECT id, target_user_id, sender_user_id, sender_name, sender_email, sender_phone, project_type, budget_range, timeline, title, description, status, notes, created_at, updated_at
		FROM inquiries WHERE target_user_id = $1 ORDER BY created_at DESC`, targetUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.Inquiry
	for rows.Next() {
		var inq models.Inquiry
		if err := rows.Scan(&inq.ID, &inq.TargetUserID, &inq.SenderUserID, &inq.SenderName, &inq.SenderEmail, &inq.SenderPhone, &inq.ProjectType, &inq.BudgetRange, &inq.Timeline, &inq.Title, &inq.Description, &inq.Status, &inq.Notes, &inq.CreatedAt, &inq.UpdatedAt); err == nil {
			list = append(list, inq)
		}
	}
	return list, nil
}

func CreateInquiry(inq *models.Inquiry) error {
	now := time.Now()
	_, err := DB.Exec(`INSERT INTO inquiries (id, target_user_id, sender_user_id, sender_name, sender_email, sender_phone, project_type, budget_range, timeline, title, description, status, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
		inq.ID, inq.TargetUserID, inq.SenderUserID, inq.SenderName, inq.SenderEmail, inq.SenderPhone, inq.ProjectType, inq.BudgetRange, inq.Timeline, inq.Title, inq.Description, inq.Status, inq.Notes, now, now)
	return err
}

// --- Opportunities Queries ---

func GetAllOpportunities() ([]models.Opportunity, error) {
	rows, err := DB.Query(`SELECT id, creator_user_id, creator_name, creator_role, creator_company, title, category, budget_or_salary, location, description, required_skills, contact_email_or_url, status, created_at, updated_at
		FROM opportunities ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.Opportunity
	for rows.Next() {
		var opp models.Opportunity
		var skillsRaw []byte
		if err := rows.Scan(&opp.ID, &opp.CreatorUserID, &opp.CreatorName, &opp.CreatorRole, &opp.CreatorCompany, &opp.Title, &opp.Category, &opp.BudgetOrSalary, &opp.Location, &opp.Description, &skillsRaw, &opp.ContactEmailOrUrl, &opp.Status, &opp.CreatedAt, &opp.UpdatedAt); err == nil {
			_ = json.Unmarshal(skillsRaw, &opp.RequiredSkills)
			opp.Applicants = getApplicantsForOpportunity(opp.ID)
			opp.ApplicantsCount = len(opp.Applicants)
			list = append(list, opp)
		}
	}
	return list, nil
}

func getApplicantsForOpportunity(oppID string) []models.OpportunityApplicant {
	rows, err := DB.Query(`SELECT id, opportunity_id, user_id, username, display_name, headline, email, message, applied_at
		FROM opportunity_applicants WHERE opportunity_id = $1 ORDER BY applied_at DESC`, oppID)
	if err != nil {
		return []models.OpportunityApplicant{}
	}
	defer rows.Close()

	var list []models.OpportunityApplicant
	for rows.Next() {
		var app models.OpportunityApplicant
		if err := rows.Scan(&app.ID, &app.OpportunityID, &app.UserID, &app.Username, &app.DisplayName, &app.Headline, &app.Email, &app.Message, &app.AppliedAt); err == nil {
			list = append(list, app)
		}
	}
	return list
}

func GetOpportunityByID(id string) (*models.Opportunity, error) {
	var opp models.Opportunity
	var skillsRaw []byte
	err := DB.QueryRow(`SELECT id, creator_user_id, creator_name, creator_role, creator_company, title, category, budget_or_salary, location, description, required_skills, contact_email_or_url, status, created_at, updated_at
		FROM opportunities WHERE id = $1`, id).
		Scan(&opp.ID, &opp.CreatorUserID, &opp.CreatorName, &opp.CreatorRole, &opp.CreatorCompany, &opp.Title, &opp.Category, &opp.BudgetOrSalary, &opp.Location, &opp.Description, &skillsRaw, &opp.ContactEmailOrUrl, &opp.Status, &opp.CreatedAt, &opp.UpdatedAt)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(skillsRaw, &opp.RequiredSkills)
	opp.Applicants = getApplicantsForOpportunity(opp.ID)
	opp.ApplicantsCount = len(opp.Applicants)
	return &opp, nil
}

func CreateOpportunity(opp *models.Opportunity) error {
	skillsRaw, _ := json.Marshal(opp.RequiredSkills)
	now := time.Now()
	_, err := DB.Exec(`INSERT INTO opportunities (id, creator_user_id, creator_name, creator_role, creator_company, title, category, budget_or_salary, location, description, required_skills, contact_email_or_url, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
		opp.ID, opp.CreatorUserID, opp.CreatorName, opp.CreatorRole, opp.CreatorCompany, opp.Title, opp.Category, opp.BudgetOrSalary, opp.Location, opp.Description, string(skillsRaw), opp.ContactEmailOrUrl, opp.Status, now, now)
	return err
}

func ApplyToOpportunity(app *models.OpportunityApplicant) error {
	now := time.Now()
	_, err := DB.Exec(`INSERT INTO opportunity_applicants (id, opportunity_id, user_id, username, display_name, headline, email, message, applied_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		app.ID, app.OpportunityID, app.UserID, app.Username, app.DisplayName, app.Headline, app.Email, app.Message, now)
	return err
}
