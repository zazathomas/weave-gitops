package server

import (
	"fmt"
	"net/http"
	"strings"
)

// WithRoutePrefix wraps the provided mux with a new mux that handles the
// provided route prefix. This is useful when the application is served from a
// subpath, e.g. /weave-gitops. The route prefix is stripped from the request
// before being passed to the provided mux.
//
// We also redirect the user to the route prefix if they hit the root of the
// server, e.g. if they port-forward.
func WithRoutePrefix(mux *http.ServeMux, routePrefix string) *http.ServeMux {
	// ensure that the route prefix begins with a slash
	if !strings.HasPrefix(routePrefix, "/") {
		routePrefix = "/" + routePrefix
	}
	// ensure route prefix doesn't have a trailing slash
	routePrefix = strings.TrimSuffix(routePrefix, "/")

	routePrefixMux := http.NewServeMux()
	routePrefixMux.Handle(routePrefix+"/", http.StripPrefix(routePrefix, mux))
	// Redirect to the route prefix if the user hits the root of the server
	// e.g. if they port-forward
	routePrefixMux.Handle("/", http.RedirectHandler(routePrefix+"/", http.StatusFound))

	return routePrefixMux
}

// GetBaseHref formats the baseHref for the application given the configured route prefix.
// Its used to set the <base href> tag in the index.html file.
// This in turn will form the base URL for all the assets (js, css, etc) that
// are loaded by the browser.
//
// The UI is built with Parcel and has been configured to generate relative script/link tags
// during the build (without a leading or trailing slash) e.g. <script src="main.js">.
// The base href we generate here must complete the URL for these assets and so
// should have a leading and trailing slash, e.g. <base href="/weave-gitops/"> or <base href="/">
func GetBaseHref(routePrefix string) string {
	baseHref := routePrefix
	// ensure baseHref begins and ends with a slash
	if !strings.HasPrefix(baseHref, "/") {
		baseHref = "/" + baseHref
	}
	if !strings.HasSuffix(baseHref, "/") {
		baseHref += "/"
	}
	return baseHref
}

// InjectHTMLBaseTag injects a <base href> tag into the provided html.
// This is used to set the base URL for all the assets (js, css, etc) that
// are loaded by the browser, so that a deep link into the UI keeps resolving
// relative asset paths against the root of the app rather than the current
// route.
//
// Production builds of the UI drop the <head> element entirely (Parcel
// removes it while minifying index.html), so when it is missing the tag is
// placed straight after the opening <html> tag. Browsers handle a <base> start
// tag found outside of <head> using the "in head" insertion rules, so this is
// equivalent.
func InjectHTMLBaseTag(html []byte, baseHref string) []byte {
	baseTag := fmt.Sprintf("<base href=%q>", baseHref)
	doc := string(html)

	// Prefer <head>, with or without attributes.
	if cut, ok := afterOpeningTag(doc, "head"); ok {
		return []byte(doc[:cut] + baseTag + doc[cut:])
	}

	// Fall back to the opening <html> tag.
	if cut, ok := afterOpeningTag(doc, "html"); ok {
		return []byte(doc[:cut] + baseTag + doc[cut:])
	}

	return []byte(baseTag + doc)
}

// afterOpeningTag returns the offset just past the ">" that closes the first
// "<name" start tag, ignoring longer names such as <header> when looking for
// <head>. The boolean is false when no such start tag exists.
func afterOpeningTag(doc, name string) (int, bool) {
	needle := "<" + name

	for offset := 0; offset < len(doc); {
		idx := strings.Index(doc[offset:], needle)
		if idx == -1 {
			return 0, false
		}

		idx += offset
		rest := doc[idx+len(needle):]

		if rest != "" && (rest[0] == '>' || rest[0] == ' ' || rest[0] == '\t' || rest[0] == '\n' || rest[0] == '\r') {
			end := strings.Index(doc[idx:], ">")
			if end == -1 {
				return 0, false
			}

			return idx + end + 1, true
		}

		offset = idx + len(needle)
	}

	return 0, false
}
