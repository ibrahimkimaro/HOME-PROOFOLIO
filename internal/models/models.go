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

// 1. Multi-Role Profile Models
type UserRole struct {
	ID               string    `json:"id"`
	UserID           string    `json:"userId"`
	RoleType         string    `json:"roleType"` // "student", "founder", "manager", "specialist", "advisor"
	Title            string    `json:"title"`    // e.g. "Accounting Student", "Founder", "Pharmacy Manager"
	OrganizationName string    `json:"organizationName"`
	OrganizationID   string    `json:"organizationId,omitempty"`
	Status           string    `json:"status"` // "active", "completed", "past"
	StartDate        string    `json:"startDate"`
	EndDate          string    `json:"endDate"`
	Description      string    `json:"description"`
	Achievements     []string  `json:"achievements"`
	Skills           []string  `json:"skills"`
	IsPrimary        bool      `json:"isPrimary"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

// 2. Organization Models
type OrgProduct struct {
	Name        string `json:"name"`
	Category    string `json:"category"`
	Description string `json:"description"`
	Status      string `json:"status"`
}

type OrgBusinessInfo struct {
	RegistrationNo string `json:"registrationNo"`
	TaxID          string `json:"taxId"`
	FoundedYear    string `json:"foundedYear"`
	Location       string `json:"location"`
	Website        string `json:"website"`
	Phone          string `json:"phone"`
	Email          string `json:"email"`
	LicenseStatus  string `json:"licenseStatus"`
}

type OrgMember struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organizationId"`
	UserID         string    `json:"userId"`
	Username       string    `json:"username"`
	DisplayName    string    `json:"displayName"`
	AvatarURL      string    `json:"avatarUrl"`
	RoleTitle      string    `json:"roleTitle"` // e.g. "Founder / Manager", "Head Pharmacist"
	RoleType       string    `json:"roleType"`  // "owner", "founder", "manager", "member"
	JoinedAt       time.Time `json:"joinedAt"`
	IsPublic       bool      `json:"isPublic"`
}

type OrgUpdate struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organizationId"`
	AuthorUserID   string    `json:"authorUserId"`
	AuthorName     string    `json:"authorName"`
	Title          string    `json:"title"`
	Content        string    `json:"content"`
	Category       string    `json:"category"`
	CreatedAt      time.Time `json:"createdAt"`
}

type OrgProject struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organizationId"`
	Title          string    `json:"title"`
	Description    string    `json:"description"`
	Status         string    `json:"status"`
	Metrics        string    `json:"metrics"`
	CreatedAt      time.Time `json:"createdAt"`
}

type Organization struct {
	ID            string          `json:"id"`
	Name          string          `json:"name"`
	Slug          string          `json:"slug"`
	Tagline       string          `json:"tagline"`
	Industry      string          `json:"industry"`
	LogoURL       string          `json:"logoUrl"`
	About         string          `json:"about"`
	Services      []string        `json:"services"`
	Products      []OrgProduct    `json:"products"`
	BusinessInfo  OrgBusinessInfo `json:"businessInfo"`
	ContactEmail  string          `json:"contactEmail"`
	ContactPhone  string          `json:"contactPhone"`
	Location      string          `json:"location"`
	Website       string          `json:"website"`
	CreatorUserID string          `json:"creatorUserId"`
	Verified      bool            `json:"verified"`
	Members       []OrgMember     `json:"members"`
	Updates       []OrgUpdate     `json:"updates"`
	Projects      []OrgProject    `json:"projects"`
	CreatedAt     time.Time       `json:"createdAt"`
	UpdatedAt     time.Time       `json:"updatedAt"`
}

// 3. Ideas & Learning Journal Models
type IdeaTimelineEntry struct {
	ID           string    `json:"id"`
	IdeaID       string    `json:"ideaId"`
	UserID       string    `json:"userId"`
	Note         string    `json:"note"`
	StageAtEntry string    `json:"stageAtEntry"`
	Source       string    `json:"source"`
	CreatedAt    time.Time `json:"createdAt"`
}

type Idea struct {
	ID                   string              `json:"id"`
	UserID               string              `json:"userId"`
	AuthorName           string              `json:"authorName"`
	AuthorUsername       string              `json:"authorUsername"`
	Title                string              `json:"title"`
	WhatLearned          string              `json:"whatLearned"`
	Source               string              `json:"source"`
	ThoughtsQuestions    string              `json:"thoughtsQuestions"`
	CurrentUnderstanding string              `json:"currentUnderstanding"`
	Stage                string              `json:"stage"` // NEW, EXPLORING, LEARNING, UNDERSTANDING, TESTING, PROJECT
	Visibility           string              `json:"visibility"` // private, team, public
	Tags                 []string            `json:"tags"`
	LinkedProjectID      string              `json:"linkedProjectId,omitempty"`
	LinkedProblemID      string              `json:"linkedProblemId,omitempty"`
	TimelineEntries      []IdeaTimelineEntry `json:"timelineEntries"`
	CreatedAt            time.Time           `json:"createdAt"`
	UpdatedAt            time.Time           `json:"updatedAt"`
}

