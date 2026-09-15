package devreload

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type ReloadEvent struct {
	Type string `json:"type"` // "css" or "full"
	File string `json:"file"`
}

type Hub struct {
	clients    map[chan ReloadEvent]bool
	register   chan chan ReloadEvent
	unregister chan chan ReloadEvent
	broadcast  chan ReloadEvent
	mu         sync.Mutex
}

var globalHub = &Hub{
	clients:    make(map[chan ReloadEvent]bool),
	register:   make(chan chan ReloadEvent),
	unregister: make(chan chan ReloadEvent),
	broadcast:  make(chan ReloadEvent, 10),
}

func init() {
	go globalHub.run()
	go startFileWatcher(globalHub)
}

func (h *Hub) run() {
	for {
		select {
		case ch := <-h.register:
			h.mu.Lock()
			h.clients[ch] = true
			h.mu.Unlock()
		case ch := <-h.unregister:
			h.mu.Lock()
			delete(h.clients, ch)
			close(ch)
			h.mu.Unlock()
		case event := <-h.broadcast:
			h.mu.Lock()
			for ch := range h.clients {
				select {
				case ch <- event:
				default:
					// Drop if blocked
				}
			}
			h.mu.Unlock()
		}
	}
}

// HandleSSE serves Server-Sent Events to connected browsers
func HandleSSE(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	clientChan := make(chan ReloadEvent, 5)
	globalHub.register <- clientChan
	defer func() {
		globalHub.unregister <- clientChan
	}()

	// Send initial ping
	fmt.Fprintf(w, ": connected\n\n")
	flusher.Flush()

	notify := r.Context().Done()
	for {
		select {
		case <-notify:
			return
		case event := <-clientChan:
			data, err := json.Marshal(event)
			if err == nil {
				fmt.Fprintf(w, "data: %s\n\n", data)
				flusher.Flush()
			}
		}
	}
}

func startFileWatcher(h *Hub) {
	watchDirs := []string{"templates", "static"}
	lastModTimes := make(map[string]time.Time)

	// Initial scan to populate baseline
	for _, dir := range watchDirs {
		_ = filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
			if err == nil && !info.IsDir() {
				lastModTimes[path] = info.ModTime()
			}
			return nil
		})
	}

	ticker := time.NewTicker(400 * time.Millisecond)
	defer ticker.Stop()

	for range ticker.C {
		var changedFile string
		var isCSS bool
		hasChanges := false

		for _, dir := range watchDirs {
			_ = filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
				if err != nil || info.IsDir() {
					return nil
				}
				prevTime, exists := lastModTimes[path]
				if !exists || info.ModTime().After(prevTime) {
					lastModTimes[path] = info.ModTime()
					hasChanges = true
					changedFile = path
					if strings.HasSuffix(path, ".css") {
						isCSS = true
					}
				}
				return nil
			})
		}

		if hasChanges {
			eventType := "full"
			if isCSS && strings.HasSuffix(changedFile, ".css") {
				eventType = "css"
			}
			log.Printf("[LiveReload] File modified: %s -> broadcasting %s reload", changedFile, eventType)
			h.broadcast <- ReloadEvent{
				Type: eventType,
				File: changedFile,
			}
		}
	}
}
