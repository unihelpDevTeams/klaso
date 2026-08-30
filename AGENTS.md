# AGENT.md

## Project Overview

Klaso is a student-focused learning platform designed to help students discover and access academic resources, tutorials, tutors, and learning topics in one place.

The application is built with a **React Native / Expo-style architecture**, using **NativeWind/Tailwind-style styling** and **Expo Ionicons**.

The product should feel modern, fast, student-friendly, trustworthy, and production-ready.

---

## Core Product Principles

When modifying or adding features to Klaso:

1. **Do not break existing functionality.**
2. Prefer simple, maintainable implementations over unnecessary abstraction.
3. Reuse existing components, utilities, hooks, and services whenever possible.
4. Keep UI consistent throughout the application.
5. Design for mobile first.
6. Make loading, empty, error, and success states explicit.
7. Avoid unnecessary network requests.
8. Never expose secrets, API keys, private credentials, or server-only configuration in the client.
9. Validate important data on the backend, not only in the client.
10. Preserve existing data structures and APIs unless a migration is intentionally required.

---

# Technology

## Frontend

* React Native
* Expo
* JavaScript/TypeScript according to the existing file
* NativeWind / Tailwind-style `className`
* Expo Ionicons
* React Navigation / Expo Router where already established
* Safe area handling

Do not introduce another styling framework when NativeWind is already sufficient.

---

# UI / Design System

## Brand

Klaso's existing visual identity uses a blue primary brand color:

```text
Primary: #57a0ff
```

Use the existing project theme/tokens when available instead of hardcoding colors throughout components.

The interface should have:

* Clean cards
* Rounded corners
* Clear typography hierarchy
* Comfortable spacing
* Strong visual feedback
* Consistent iconography
* Accessible touch targets
* Responsive layouts

Avoid overly complicated interfaces.

The UI should look like a polished commercial student application rather than a prototype.

---

# Navigation

Navigation should remain predictable.

When adding a new screen:

1. Determine the correct navigation stack/tab.
2. Add the route using the project's existing routing pattern.
3. Make sure back navigation works.
4. Preserve existing deep-link behavior.
5. Do not create duplicate routes for the same feature.

---

# Home Screen

The Klaso home experience should prioritize discovery.

The existing concept includes:

* Student profile/header
* Search
* Tutorials
* Tutors
* Topics
* Learning content
* Relevant academic recommendations

The search experience should support queries such as:

```text
tutorials
tutors
topics
```

Search should be fast and provide useful empty/loading states.

---

# Components

Create reusable components when UI patterns repeat.

Examples:

```text
components/
  Button
  Card
  SearchBar
  TutorCard
  TutorialCard
  TopicCard
  EmptyState
  LoadingState
  ErrorState
```

Do not create a component merely to wrap a few lines of JSX unless it improves readability or reuse.

---

# Lists

For list-based screens, **prefer `FlatList` as the primary scroll container**.

Use:

```jsx
<FlatList
  data={items}
  renderItem={({ item }) => ...}
  keyExtractor={(item) => item.id}
/>
```

Rules:

* Always provide a stable `keyExtractor`.
* Do not unnecessarily use `ScrollView` around a `FlatList`.
* Avoid nesting virtualized lists inside regular `ScrollView`.
* Use pagination for potentially large datasets.
* Provide loading, empty, and error states.
* Avoid rendering unnecessarily large datasets at once.

For small static content, a normal mapped array may be acceptable.

---

# Data Fetching

Before adding a new API request:

1. Check whether an existing service already handles the data.
2. Reuse the service where possible.
3. Keep API logic out of presentation components when practical.
4. Handle loading, success, empty, and failure states.
5. Prevent duplicate requests.
6. Do not silently swallow API errors.

Example pattern:

```text
Screen
  ↓
Hook / Service
  ↓
API
  ↓
Backend
  ↓
Database
```

Keep UI components focused primarily on presentation and user interaction.

---

# Authentication

Authentication must be handled securely.

Never:

* Store passwords in plaintext.
* Put private credentials in the mobile application.
* Trust user-provided authorization claims without server validation.
* Give users access to another user's private information.

Client-side authorization checks are for UX only.

Sensitive authorization decisions must be enforced server-side.

---

# User Data

User-specific information must be scoped to the authenticated user.

Before displaying or modifying private data, verify:

```text
authenticated user
        ↓
authorized resource
        ↓
requested operation
```

Never rely solely on a hidden button or disabled UI element as a security mechanism.

---

# Search

Search should be:

* Fast
* Debounced where appropriate
* Case-insensitive where appropriate
* Empty-state aware
* Error-state aware

Avoid making an API request for every keystroke.

A typical debounce window may be approximately:

```text
250–500 ms
```

Use the backend/database's search capabilities when datasets become large.

---

# Performance

Klaso should remain responsive on lower-end Android devices.

Avoid:

* Excessive re-renders
* Huge images without optimization
* Large synchronous operations on the UI thread
* Unnecessary API calls
* Deeply nested component trees
* Rendering thousands of items simultaneously

Use:

* `FlatList`
* Pagination
* Memoization when it actually improves performance
* Optimized images
* Cached data where appropriate

Do not prematurely optimize simple screens.

---

# Loading States

Every network-dependent screen should have an intentional loading experience.

Prefer skeletons or appropriate placeholders for major content.

Avoid showing a blank white screen while data loads.

---

# Error Handling

Errors should be understandable to users.

Bad:

```text
Error: AxiosError: Network Request Failed
```

Better:

```text
Something went wrong.
Please check your connection and try again.
```

Developer logs may contain technical details, but user-facing messages should remain clear.

---

# Empty States

Every list that can contain zero items should have an empty state.

Example:

```text
No tutorials found

Try searching for another topic or tutor.
```

Empty states should explain what the user can do next when appropriate.

---

# Forms

Forms should:

* Validate input
* Show field-level errors where useful
* Prevent duplicate submissions
* Disable submission while processing
* Preserve user input after recoverable errors
* Provide success feedback after completion

Never rely exclusively on client-side validation for security-sensitive data.

---

# Buttons and Feedback

Interactive elements should provide immediate feedback.

Examples:

* Press states
* Loading indicators
* Disabled states
* Success feedback
* Error feedback

Do not allow users to repeatedly trigger an action while the previous request is still processing.

---

# Accessibility

Use:

* Meaningful labels
* Sufficient contrast
* Reasonable font sizes
* Touch targets large enough to interact with comfortably
* Icons together with text when an icon's meaning is ambiguous

Do not communicate important information through color alone.

---

# Security

Never commit:

```text
.env
.env.local
private keys
service-account credentials
API secrets
Firebase private keys
production database credentials
```

Use environment variables and secure server-side configuration.

If a secret is accidentally exposed:

1. Remove it from the code.
2. Rotate/revoke the credential.
3. Update the secure environment configuration.
4. Check git history if necessary.

---

# Backend/API Rules

The mobile client should never be treated as a trusted environment.

Backend endpoints must:

* Authenticate requests where required.
* Authorize resource ownership.
* Validate request bodies.
* Validate query parameters.
* Sanitize/normalize input where necessary.
* Return appropriate HTTP status codes.
* Avoid exposing internal errors.
* Rate-limit sensitive operations where appropriate.

---

# Database

When modifying database schemas:

1. Understand existing relationships first.
2. Preserve existing data.
3. Add indexes where query patterns justify them.
4. Use constraints for important invariants.
5. Avoid destructive migrations unless explicitly required.
6. Document migrations.

Never casually rename/remove production fields.

---

# Media

Images and other media should be optimized for mobile.

Avoid unnecessarily loading full-resolution assets when a smaller version is sufficient.

Use appropriate caching and CDN mechanisms already established by the project.

---

# Offline / Caching

Offline functionality should not compromise security.

Cached content should respect:

* User authentication
* Entitlements
* Content permissions
* Content expiration/versioning

Do not expose protected resources simply because they were previously cached.

If private/protected files are cached, prefer app-private storage rather than publicly accessible device storage.

---

# Notifications

Notifications should be useful rather than excessive.

Only request notification permissions when there is a clear reason.

Notification actions must respect authentication and authorization.

---

# Code Style

Follow the existing project's style.

Prefer:

```jsx
const Component = () => {
  return (
    <View>
      ...
    </View>
  );
};
```

Use descriptive names.

Good:

```text
selectedTutor
tutorialLoading
searchQuery
handlePurchase
```

Avoid:

```text
x
thing
abc
data2
temp
```

Keep functions focused.

---

# File Organization

Follow the existing repository structure.

A reasonable organization is:

```text
app/
components/
screens/
services/
hooks/
utils/
constants/
assets/
```

Do not reorganize the entire repository just to implement a small feature.

---

# Before Editing Code

Always inspect the existing implementation first.

Determine:

1. Where the relevant screen lives.
2. Which components it uses.
3. How data is currently fetched.
4. What API/service already exists.
5. What navigation route is used.
6. What styling system is being used.
7. Whether the feature already exists partially.

Do not duplicate existing functionality.

---

# Before Adding Dependencies

Ask:

> Can this be implemented using the existing dependencies?

If yes, do not add another dependency.

If a dependency is genuinely necessary:

1. Check compatibility with the Expo version.
2. Check React Native compatibility.
3. Check whether it works on Android and iOS.
4. Prefer well-maintained packages.
5. Avoid packages that duplicate existing functionality.

---

# Testing

After making changes, verify:

### UI

* Screen renders
* Navigation works
* Buttons work
* Loading state works
* Empty state works
* Error state works
* Keyboard behavior works
* Safe areas are respected

### Data

* API requests succeed
* Invalid input is handled
* Authentication is respected
* Data refresh works
* Duplicate submissions are prevented

### Mobile

Test especially on Android because performance and layout differences can expose issues not visible during development.

---

# Debugging

When fixing a bug:

1. Reproduce the issue.
2. Identify the root cause.
3. Fix the root cause rather than hiding the symptom.
4. Check related functionality.
5. Remove temporary debugging code.
6. Test the affected flow again.

Do not make random changes until the error disappears.

---

# Git

Make focused changes.

Avoid:

* Unrelated formatting changes
* Massive file rewrites
* Deleting working code without reason
* Committing secrets
* Committing generated build artifacts unnecessarily

Commit messages should describe the change clearly.

Examples:

```text
fix: resolve tutorial loading state
feat: add tutor search
fix: prevent duplicate purchase requests
refactor: simplify home feed
```

---

# AI Agent Rules

When working as an AI coding agent on Klaso:

### DO

* Inspect existing code before modifying it.
* Reuse existing patterns.
* Explain important architectural changes.
* Keep changes focused.
* Preserve backward compatibility.
* Check related screens after modifying shared components.
* Handle edge cases.
* Validate API responses.
* Test the affected flow.

### DON'T

* Rewrite working architecture unnecessarily.
* Replace the project's styling system.
* Add dependencies without need.
* Remove existing features to make an implementation easier.
* Hardcode user-specific data.
* Hardcode API responses in production code.
* Expose secrets.
* Assume the client is secure.
* Ignore loading/error/empty states.
* Nest `FlatList` inside `ScrollView` unnecessarily.

---

# Definition of Done

A feature is not complete merely because it compiles.

Before considering a task finished:

* [ ] Feature works on the intended screen.
* [ ] Navigation works.
* [ ] UI matches Klaso's design language.
* [ ] Loading state exists.
* [ ] Empty state exists where applicable.
* [ ] Error handling exists.
* [ ] Authentication/authorization is respected.
* [ ] API/data handling is correct.
* [ ] No unnecessary dependencies were introduced.
* [ ] No secrets were exposed.
* [ ] Existing features still work.
* [ ] Mobile layout has been checked.
* [ ] Debugging code has been removed.
* [ ] Code remains maintainable.

---

# Product Philosophy

Klaso should always feel like a platform built **for students, not merely a website converted into an app**.

Every feature should answer at least one of these questions:

* Does this help students learn?
* Does this help students discover useful academic content?
* Does this help students find the right tutor/tutorial?
* Does this make studying easier?
* Does this make the platform faster or easier to use?

If a change does not meaningfully improve the product, avoid adding unnecessary complexity.
