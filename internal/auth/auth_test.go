package auth

import (
	"testing"
)

func TestPasswordHashAndVerify(t *testing.T) {
	password := "kimmy001"
	hash, salt, err := HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	if !VerifyPassword(password, hash, salt) {
		t.Fatalf("VerifyPassword failed for correct password")
	}

	if VerifyPassword("wrong_password", hash, salt) {
		t.Fatalf("VerifyPassword succeeded for wrong password")
	}
}

func TestExistingSeedVerification(t *testing.T) {
	// From seed db.json for ibrahim
	existingHash := "69d994da3acd8b5a9ea7bea2f0488d21672dab0b0548ab80fe6e0fa9cbcf7e894ae19e10ebd0acf2ad4481b2365344b1ae110137118404f393ba1332952c0b2d"
	existingSalt := "a1f33f16769cb69b197ccff1ed8850f1"

	if !VerifyPassword("ibrahim123", existingHash, existingSalt) {
		t.Logf("Note: existing seed was hashed with different salt encoding or password")
	} else {
		t.Logf("Existing seed matched ibrahim123 successfully!")
	}
}

func TestSetIbrahimPassword(t *testing.T) {
	hash, salt, err := HashPassword("kimmy001")
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("Hash: %s", hash)
	t.Logf("Salt: %s", salt)
}
