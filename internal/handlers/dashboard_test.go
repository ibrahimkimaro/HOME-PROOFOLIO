package handlers

import (
	"bytes"
	"html/template"
	"os"
	"path/filepath"
	"testing"
	"time"

	"home_proofolio/internal/models"
)

func TestDashboardTemplate(t *testing.T) {
	// Change working dir to repo root for relative template paths
	repoRoot, err := filepath.Abs("../..")
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(repoRoot); err != nil {
		t.Fatal(err)
	}

	layoutPath := "templates/app/layout.html"
	pagePath := "templates/app/dashboard.html"

	tmpl, err := template.ParseFiles(layoutPath, pagePath)
	if err != nil {
		t.Fatalf("Template parse error: %v", err)
	}

	data := PageData{
		Title:     "Test Dashboard",
		ActiveNav: "dashboard",
		User:      &models.User{Username: "ibrahim"},
		Profile:   &models.Profile{DisplayName: "Ibrahim", AvatarURL: "/static/img/default-avatar.png"},
		Ideas: []models.Idea{
			{ID: "1", Title: "Idea 1", Stage: "NEW", UpdatedAt: time.Now()},
			{ID: "2", Title: "Idea 2", Stage: "EXPLORING", UpdatedAt: time.Now()},
			{ID: "3", Title: "Idea 3", Stage: "LEARNING", UpdatedAt: time.Now()},
			{ID: "4", Title: "Idea 4", Stage: "UNDERSTANDING", UpdatedAt: time.Now()},
			{ID: "5", Title: "Idea 5", Stage: "TESTING", UpdatedAt: time.Now()},
			{ID: "6", Title: "Idea 6", Stage: "PROJECT", UpdatedAt: time.Now()},
		},
		Roles: []models.UserRole{
			{ID: "r1", Title: "Student", RoleType: "student", OrganizationName: "Org 1"},
			{ID: "r2", Title: "Founder", RoleType: "founder", OrganizationName: "Org 2"},
			{ID: "r3", Title: "Manager", RoleType: "manager"},
			{ID: "r4", Title: "Lead", RoleType: "other"},
		},
		Organizations: []models.Organization{
			{ID: "o1", Name: "Acme Corp", Slug: "acme", Industry: "Tech", Location: "NYC"},
		},
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		t.Fatalf("Template execute error: %v", err)
	}

	if buf.Len() == 0 {
		t.Fatal("Buffer is empty after executing template")
	}

	// Also test HTMX standalone content template
	singleTmpl, err := template.ParseFiles(pagePath)
	if err != nil {
		t.Fatalf("Single page parse error: %v", err)
	}
	buf.Reset()
	if err := singleTmpl.ExecuteTemplate(&buf, "content", data); err != nil {
		t.Fatalf("Single template execute error: %v", err)
	}
}
