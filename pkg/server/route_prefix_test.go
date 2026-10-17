package server

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWithRoutePrefix(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/foo", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	routePrefix := "test"
	routePrefixMux := WithRoutePrefix(mux, routePrefix)

	testCases := []struct {
		path     string
		expected int
		content  string
	}{
		// redirect from root to route prefix for nice UX in the browser
		{path: "/", expected: http.StatusFound, content: "<a href=\"/test/\">Found</a>.\n\n"},
		// Redirects to trailing slash, nice for the browser.
		// Go 1.26 changed ServeMux's built-in trailing-slash redirect from
		// 301 Moved Permanently to 307 Temporary Redirect.
		{path: "/test", expected: http.StatusTemporaryRedirect, content: "<a href=\"/test/\">Temporary Redirect</a>.\n\n"},
		// We didn't add a root handler
		{path: "/test/", expected: http.StatusNotFound},
		// access the mounted handler
		{path: "/test/foo", expected: http.StatusOK},
		// trailing slash results in 404
		{path: "/test/foo/", expected: http.StatusNotFound},
		// non-existent paths
		{path: "/test/foo/bar", expected: http.StatusNotFound},
		{path: "/test/foo/bar/", expected: http.StatusNotFound},
	}

	for _, tc := range testCases {
		t.Run(tc.path, func(t *testing.T) {
			req := httptest.NewRequest("GET", tc.path, nil)
			w := httptest.NewRecorder()
			routePrefixMux.ServeHTTP(w, req)
			if w.Code != tc.expected {
				t.Errorf("expected %d, got %d, %v", tc.expected, w.Code, w.Body.String())
			}
			if tc.content != "" && w.Body.String() != tc.content {
				t.Errorf("expected %s, got %s", tc.content, w.Body.String())
			}
		})
	}
}

func TestGetBaseHref(t *testing.T) {
	testCases := []struct {
		routePrefix string
		expected    string
	}{
		{routePrefix: "test", expected: "/test/"},
		{routePrefix: "/test", expected: "/test/"},
		{routePrefix: "test/", expected: "/test/"},
		{routePrefix: "/test/", expected: "/test/"},
		{routePrefix: "", expected: "/"},
		{routePrefix: "/", expected: "/"},
	}

	for _, tc := range testCases {
		t.Run(tc.routePrefix, func(t *testing.T) {
			actual := GetBaseHref(tc.routePrefix)
			if actual != tc.expected {
				t.Errorf("expected %s, got %s", tc.expected, actual)
			}
		})
	}
}

func TestInjectHTMLBaseTag(t *testing.T) {
	testCases := []struct {
		name     string
		html     string
		baseHref string
		expected string
	}{
		{
			name:     "html with a head tag",
			html:     "<html><head></head><body></body></html>",
			baseHref: "/test/",
			expected: `<html><head><base href="/test/"></head><body></body></html>`,
		},
		{
			name:     "head tag with attributes",
			html:     `<html><head lang="en"></head><body></body></html>`,
			baseHref: "/",
			expected: `<html><head lang="en"><base href="/"></head><body></body></html>`,
		},
		{
			// The production UI build strips <head>, which used to mean no base
			// tag was injected at all and deep links loaded assets from the
			// wrong path.
			name:     "html without a head tag, as produced by the production UI build",
			html:     `<!DOCTYPE html><html lang=en><link rel=stylesheet href=ui.css><body><div id=app></div></body></html>`,
			baseHref: "/weave-gitops/",
			expected: `<!DOCTYPE html><html lang=en><base href="/weave-gitops/"><link rel=stylesheet href=ui.css><body><div id=app></div></body></html>`,
		},
		{
			name:     "falls back to prepending when there is no html or head tag",
			html:     `<div id=app></div>`,
			baseHref: "/",
			expected: `<base href="/"><div id=app></div>`,
		},
		{
			name:     "does not mistake a header element for head",
			html:     `<html><header>x</header><body></body></html>`,
			baseHref: "/",
			expected: `<html><base href="/"><header>x</header><body></body></html>`,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			actual := InjectHTMLBaseTag([]byte(tc.html), tc.baseHref)
			if string(actual) != tc.expected {
				t.Errorf("expected %s, got %s", tc.expected, actual)
			}
		})
	}
}
