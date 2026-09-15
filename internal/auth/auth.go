package auth

import (
	"crypto/rand"
	"crypto/sha512"
	"crypto/subtle"
	"encoding/hex"
	"net/http"
	"net/mail"
	"regexp"
	"strings"
	"time"

	"home_proofolio/internal/db"
	"home_proofolio/internal/models"

	"golang.org/x/crypto/pbkdf2"
)

var usernameRegex = regexp.MustCompile(`^[a-z0-9_]+$`)

// HashPassword hashes a password using PBKDF2 with SHA-512 (100,000 iterations, 64 bytes)
func HashPassword(password string) (hash string, salt string, err error) {
	saltBytes := make([]byte, 16)
	if _, err := rand.Read(saltBytes); err != nil {
		return "", "", err
	}
	salt = hex.EncodeToString(saltBytes)
	key := pbkdf2.Key([]byte(password), []byte(salt), 100000, 64, sha512.New)
	return hex.EncodeToString(key), salt, nil
}

// VerifyPassword checks if the provided password matches the PBKDF2 hash
func VerifyPassword(password, hash, salt string) bool {
	checkKey := pbkdf2.Key([]byte(password), []byte(salt), 100000, 64, sha512.New)
	checkHash := hex.EncodeToString(checkKey)
	return subtle.ConstantTimeCompare([]byte(hash), []byte(checkHash)) == 1
}

// GenerateSessionToken generates a secure 32-byte hex token
func GenerateSessionToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// ValidateUsername checks username constraints
func ValidateUsername(username string) (bool, string) {
	cleaned := strings.TrimSpace(strings.ToLower(username))
	if len(cleaned) < 3 || len(cleaned) > 24 {
		return false, "Username must be between 3 and 24 characters."
	}
	if !usernameRegex.MatchString(cleaned) {
		return false, "Username can only contain lowercase letters, numbers, and underscores."
	}
	return true, ""
}

// ValidateEmail checks email validity
func ValidateEmail(email string) bool {
	_, err := mail.ParseAddress(strings.TrimSpace(email))
	return err == nil
}

// ValidatePassword checks password constraints
func ValidatePassword(password string) (bool, string) {
	if len(password) < 6 {
		return false, "Password must be at least 6 characters long."
	}
	return true, ""
}

// GetUserFromRequest checks the proofolio_session cookie and returns the active User & Profile
func GetUserFromRequest(r *http.Request) (*models.User, *models.Profile) {
	cookie, err := r.Cookie("proofolio_session")
	if err != nil || cookie.Value == "" {
		return nil, nil
	}

	session, err := db.GetSession(cookie.Value)
	if err != nil || session == nil {
		return nil, nil
	}

	user, err := db.GetUserByID(session.UserID)
	if err != nil || user == nil || user.Status == "disabled" {
		return nil, nil
	}

	profile, _ := db.GetProfileByUserID(user.ID)
	return user, profile
}

// SetSessionCookie sets the HTTP-only auth cookie
func SetSessionCookie(w http.ResponseWriter, token string, expiresAt time.Time) {
	http.SetCookie(w, &http.Cookie{
		Name:     "proofolio_session",
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}

// ClearSessionCookie clears the auth cookie
func ClearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "proofolio_session",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}
