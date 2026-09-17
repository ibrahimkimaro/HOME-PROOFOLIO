package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"
)

// AttributeItem represents a displayable dynamic attribute
type AttributeItem struct {
	Key    string
	Label  string
	Value  string
	Values []string
	IsURL  bool
}

func humanizeKey(k string) string {
	parts := strings.Split(k, "_")
	for i, p := range parts {
		if len(p) > 0 {
			parts[i] = strings.ToUpper(p[:1]) + strings.ToLower(p[1:])
		}
	}
	return strings.Join(parts, " ")
}

// JSONB is a polymorphic map type that implements sql.Scanner and driver.Valuer for PostgreSQL JSONB
type JSONB map[string]interface{}

// Value implements driver.Valuer for PostgreSQL JSONB
func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return "{}", nil
	}
	return json.Marshal(j)
}

// Scan implements sql.Scanner for PostgreSQL JSONB
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = make(JSONB)
		return nil
	}
	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return errors.New("cannot scan type into JSONB")
	}
	if len(bytes) == 0 {
		*j = make(JSONB)
		return nil
	}
	return json.Unmarshal(bytes, j)
}

// TemplateField defines an individual dynamic input specification
type TemplateField struct {
	Key         string   `json:"key"`
	Label       string   `json:"label"`
	InputType   string   `json:"inputType"` // "text", "number", "select", "multi-select", "textarea", "url", "date"
	Placeholder string   `json:"placeholder,omitempty"`
	Options     []string `json:"options,omitempty"`
	HelpText    string   `json:"helpText,omitempty"`
	Section     string   `json:"section,omitempty"`
}

// DomainTemplate defines an adaptable blueprint for profile roles (Developer, Footballer, Musician/Singer, Designer, etc.)
type DomainTemplate struct {
	ID            string          `json:"id"`
	DomainKey     string          `json:"domainKey"`
	DisplayName   string          `json:"displayName"`
	Description   string          `json:"description"`
	Icon          string          `json:"icon"`
	CategoryGroup string          `json:"categoryGroup"`
	Fields        []TemplateField `json:"fields"`
	CreatedAt     time.Time       `json:"createdAt"`
	UpdatedAt     time.Time       `json:"updatedAt"`
}

// PortfolioTemplate defines an adaptable blueprint for project/work items (Software Project, Music Release, Match Performance, etc.)
type PortfolioTemplate struct {
	ID          string          `json:"id"`
	TemplateKey string          `json:"templateKey"`
	DisplayName string          `json:"displayName"`
	Description string          `json:"description"`
	Icon        string          `json:"icon"`
	Fields      []TemplateField `json:"fields"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

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
	Attributes          JSONB       `json:"attributes"`
	UpdatedAt           time.Time   `json:"updatedAt"`
}

// GetFormattedAttributes formats non-empty, non-private dynamic attributes for UI cards
func (p *Profile) GetFormattedAttributes() []AttributeItem {
	if p == nil || len(p.Attributes) == 0 {
		return nil
	}
	var items []AttributeItem
	for k, v := range p.Attributes {
		if strings.HasPrefix(k, "_") {
			continue
		}
		strVal := strings.TrimSpace(fmt.Sprintf("%v", v))
		if strVal == "" || strVal == "<nil>" {
			continue
		}
		label := humanizeKey(k)
		isURL := strings.HasPrefix(strVal, "http://") || strings.HasPrefix(strVal, "https://")
		var values []string
		if strings.Contains(strVal, ",") && !isURL {
			for _, part := range strings.Split(strVal, ",") {
				part = strings.TrimSpace(part)
				if part != "" {
					values = append(values, part)
				}
			}
		}
		items = append(items, AttributeItem{
			Key:    k,
			Label:  label,
			Value:  strVal,
			Values: values,
			IsURL:  isURL,
		})
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].Label < items[j].Label
	})
	return items
}

func (p *Profile) GetDomainKey() string {
	if p == nil || p.Attributes == nil {
		return ""
	}
	if dk, ok := p.Attributes["_domain_key"].(string); ok {
		return dk
	}
	return ""
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
	Attributes        JSONB     `json:"attributes"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// GetFormattedAttributes formats non-empty, non-private dynamic attributes for UI cards
func (prj *Project) GetFormattedAttributes() []AttributeItem {
	if prj == nil || len(prj.Attributes) == 0 {
		return nil
	}
	var items []AttributeItem
	for k, v := range prj.Attributes {
		if strings.HasPrefix(k, "_") {
			continue
		}
		strVal := strings.TrimSpace(fmt.Sprintf("%v", v))
		if strVal == "" || strVal == "<nil>" {
			continue
		}
		label := humanizeKey(k)
		isURL := strings.HasPrefix(strVal, "http://") || strings.HasPrefix(strVal, "https://")
		var values []string
		if strings.Contains(strVal, ",") && !isURL {
			for _, part := range strings.Split(strVal, ",") {
				part = strings.TrimSpace(part)
				if part != "" {
					values = append(values, part)
				}
			}
		}
		items = append(items, AttributeItem{
			Key:    k,
			Label:  label,
			Value:  strVal,
			Values: values,
			IsURL:  isURL,
		})
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].Label < items[j].Label
	})
	return items
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
	ID              string    `json:"id"`
	UserID          string    `json:"userId"`
	AuthorName      string    `json:"authorName"`
	AuthorUsername  string    `json:"authorUsername"`
	AuthorRole      string    `json:"authorRole"`
	Title           string    `json:"title"`
	Slug            string    `json:"slug"`
	Excerpt         string    `json:"excerpt"`
	Category        string    `json:"category"`
	ReadTime        string    `json:"readTime"`
	Summary         string    `json:"summary"`
	Content         string    `json:"content"`
	BannerImage     string    `json:"bannerImage"`
	LinkedProjectID string    `json:"linkedProjectId"`
	AuthorPrompt    string    `json:"authorPrompt"`
	HeaderStyle     string    `json:"headerStyle"`
	Upvotes         int       `json:"upvotes"`
	Upvoters        []string  `json:"upvoters"`
	Tags            []string  `json:"tags"`
	KeyTakeaways    []string  `json:"keyTakeaways"`
	ReadingTheme    string    `json:"readingTheme"`
	FontStyle       string    `json:"fontStyle"`
	AccentColor     string    `json:"accentColor"`
	Attributes      JSONB     `json:"attributes"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

func (a ArticlePost) GetKeyTakeaways() []string {
	if len(a.KeyTakeaways) > 0 {
		return a.KeyTakeaways
	}
	return []string{}
}

func (a ArticlePost) GetCustomTheme() string {
	if a.ReadingTheme != "" {
		return a.ReadingTheme
	}
	return "paper"
}

func (a ArticlePost) GetHeaderStyle() string {
	if a.HeaderStyle != "" {
		return a.HeaderStyle
	}
	return "gradient"
}

func (a ArticlePost) IsUpvotedBy(userID string) bool {
	for _, u := range a.Upvoters {
		if u == userID {
			return true
		}
	}
	return false
}

func (a ArticlePost) GenerateSlug() string {
	s := strings.ToLower(a.Title)
	s = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == ' ' {
			return r
		}
		return -1
	}, s)
	s = strings.ReplaceAll(s, " ", "-")
	for strings.Contains(s, "--") {
		s = strings.ReplaceAll(s, "--", "-")
	}
	s = strings.Trim(s, "-")
	if len(a.ID) >= 6 {
		s = s + "-" + a.ID[:6]
	}
	return s
}

func (a ArticlePost) CalcReadTime() string {
	words := len(strings.Fields(a.Content))
	minutes := words / 200
	if minutes < 1 {
		minutes = 1
	}
	return fmt.Sprintf("%d min read", minutes)
}

func (a ArticlePost) CategoryColor() string {
	switch strings.ToLower(a.Category) {
	case "architecture", "systems":
		return "terracotta"
	case "databases", "data":
		return "amber"
	case "frontend", "ui/ux", "design":
		return "emerald"
	case "devops", "cloud", "infrastructure":
		return "blue"
	default:
		return "terracotta"
	}
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

