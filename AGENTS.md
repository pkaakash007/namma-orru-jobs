# Application Development Rules

## Data Integrity & Dynamic Values Policy
- **Permanent Zero Static / Mock Data Rule:** NEVER add static, hardcoded, or mock data anywhere across the entire application (components, services, Redux store, or local storage fallbacks).
- **Strict Dynamic Database Values:** All UI values, lists, counts, messages, candidates, jobs, notifications, and profiles must originate dynamically from the database via backend APIs.
- **Genuine Empty States:** If the database contains no records for a feature, render authentic, clean empty states (e.g., "No conversations yet", "No users found") instead of injecting mock or demo records.

## UI & Design Standards
- **Permanent Ban on Sparkle Symbols:** Never use `Sparkles` or `Sparkle` icons from `lucide-react` or `✨` (sparkle emoji) anywhere across the entire application (components, modals, headers, badges, or toasts).
- **Professional, Human Aesthetic:** Maintain a clean, human Apple iOS-style interface. Use functional icons (`Briefcase`, `Search`, `FileText`, `CheckCircle2`) instead of AI gimmick symbols.
