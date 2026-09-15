package models

import (
	"time"
)

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"passwordHash"`
	PasswordSalt string    `json:"passwordSalt"`
	Role         string    `json:"role"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type SocialLinks struct {
	Website  string `json:"website,omitempty"`
	Github   string `json:"github,omitempty"`
	Linkedin string `json:"linkedin,omitempty"`
	Twitter  string `json:"twitter,omitempty"`
}

type Profile struct {
	UserID              string      `json:"userId"`
	Username            string      `json:"username"`
	DisplayName         string      `json:"displayName"`
	Headline            string      `json:"headline"`
	Bio                 string      `json:"bio"`
	AvatarURL           string      `json:"avatarUrl"`
	Location            string      `json:"location"`
	Category            string      `json:"category"`
	EducationSummary    string      `json:"educationSummary"`
	ProfessionalSummary string      `json:"professionalSummary"`
	Skills              []string    `json:"skills"`
	SocialLinks         SocialLinks `json:"socialLinks"`
	Visibility          string      `json:"visibility"`
	Theme               string      `json:"theme"`
	FontStyle           string      `json:"fontStyle"`
	AccentColor         string      `json:"accentColor"`
	UpdatedAt           time.Time   `json:"updatedAt"`
}

type Project struct {
	ID                string    `json:"id"`
	UserID            string    `json:"userId"`
	Title             string    `json:"title"`
	Category          string    `json:"category"`
	Headline          string    `json:"headline"`
	ProblemSolved     string    `json:"problemSolved"`
	ArchitectureNotes string    `json:"architectureNotes"`
	LiveURL           string    `json:"liveUrl"`
	RepoURL           string    `json:"repoUrl"`
	TechStack         []string  `json:"techStack"`
	Metrics           string    `json:"metrics"`
	Status            string    `json:"status"`
	Featured          bool      `json:"featured"`
	AccentColor       string    `json:"accentColor"`
	BannerGradient    string    `json:"bannerGradient"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type ProblemCase struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Title     string    `json:"title"`
	Domain    string    `json:"domain"`
	Symptoms  string    `json:"symptoms"`
	RootCause string    `json:"rootCause"`
	Solution  string    `json:"solution"`
	Outcome   string    `json:"outcome"`
	TechStack []string  `json:"techStack"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Endorsement struct {
	ID             string    `json:"id"`
	TargetUserID   string    `json:"targetUserId"`
	AuthorUserID   string    `json:"authorUserId"`
	AuthorName     string    `json:"authorName"`
	AuthorUsername string    `json:"authorUsername"`
	AuthorRole     string    `json:"authorRole"`
	Type           string    `json:"type"`
	TargetID       string    `json:"targetId"`
	TargetTitle    string    `json:"targetTitle"`
	Relationship   string    `json:"relationship"`
	Content        string    `json:"content"`
	Verified       bool      `json:"verified"`
	CreatedAt      time.Time `json:"createdAt"`
}

type DiscussionReply struct {
	ID             string    `json:"id"`
	DiscussionID   string    `json:"discussionId"`
	AuthorUserID   string    `json:"authorUserId"`
	AuthorName     string    `json:"authorName"`
	AuthorUsername string    `json:"authorUsername"`
	AuthorRole     string    `json:"authorRole"`
	Content        string    `json:"content"`
	CreatedAt      time.Time `json:"createdAt"`
}

type DiscussionPost struct {
	ID             string            `json:"id"`
	UserID         string            `json:"userId"`
	AuthorName     string            `json:"authorName"`
	AuthorUsername string            `json:"authorUsername"`
	AuthorRole     string            `json:"authorRole"`
	Title          string            `json:"title"`
	Category       string            `json:"category"`
	Content        string            `json:"content"`
	Upvotes        int               `json:"upvotes"`
	Upvoters       []string          `json:"upvoters"`
	Replies        []DiscussionReply `json:"replies"`
	CreatedAt      time.Time         `json:"createdAt"`
	UpdatedAt      time.Time         `json:"updatedAt"`
}

type ArticlePost struct {
	ID             string    `json:"id"`
	UserID         string    `json:"userId"`
	AuthorName     string    `json:"authorName"`
	AuthorUsername string    `json:"authorUsername"`
	AuthorRole     string    `json:"authorRole"`
	Title          string    `json:"title"`
	Category       string    `json:"category"`
	ReadTime       string    `json:"readTime"`
	Summary        string    `json:"summary"`
	Content        string    `json:"content"`
	Upvotes        int       `json:"upvotes"`
	Upvoters       []string  `json:"upvoters"`
	Tags           []string  `json:"tags"`
	ReadingTheme   string    `json:"readingTheme"`
	FontStyle      string    `json:"fontStyle"`
	AccentColor    string    `json:"accentColor"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type Inquiry struct {
	ID           string    `json:"id"`
	TargetUserID string    `json:"targetUserId"`
	SenderUserID string    `json:"senderUserId"`
	SenderName   string    `json:"senderName"`
	SenderEmail  string    `json:"senderEmail"`
	SenderPhone  string    `json:"senderPhone"`
	ProjectType  string    `json:"projectType"`
	BudgetRange  string    `json:"budgetRange"`
	Timeline     string    `json:"timeline"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	Status       string    `json:"status"`
	Notes        string    `json:"notes"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type OpportunityApplicant struct {
	ID            string    `json:"id"`
	OpportunityID string    `json:"opportunityId"`
	UserID        string    `json:"userId"`
	Username      string    `json:"username"`
	DisplayName   string    `json:"displayName"`
	Headline      string    `json:"headline"`
	Email         string    `json:"email"`
	Message       string    `json:"message"`
	AppliedAt     time.Time `json:"appliedAt"`
}

type Opportunity struct {
	ID                 string                 `json:"id"`
	CreatorUserID      string                 `json:"creatorUserId"`
	CreatorName        string                 `json:"creatorName"`
	CreatorRole        string                 `json:"creatorRole"`
	CreatorCompany     string                 `json:"creatorCompany"`
	Title              string                 `json:"title"`
	Category           string                 `json:"category"`
	BudgetOrSalary     string                 `json:"budgetOrSalary"`
	Location           string                 `json:"location"`
	Description        string                 `json:"description"`
	RequiredSkills     []string               `json:"requiredSkills"`
	ContactEmailOrUrl  string                 `json:"contactEmailOrUrl"`
	ApplicantsCount    int                    `json:"applicantsCount"`
	Applicants         []OpportunityApplicant `json:"applicants"`
	Status             string                 `json:"status"`
	CreatedAt          time.Time              `json:"createdAt"`
	UpdatedAt          time.Time              `json:"updatedAt"`
}

type Session struct {
	Token     string    `json:"token"`
	UserID    string    `json:"userId"`
	CreatedAt time.Time `json:"createdAt"`
	ExpiresAt time.Time `json:"expiresAt"`
}
