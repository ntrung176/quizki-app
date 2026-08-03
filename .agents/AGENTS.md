# Project Architectural & Refactoring Guidelines (QuizKi App)

## 1. Strict Modularization & File Size Discipline
- Maintain clean modular architecture across `src/hooks/`, `src/components/`, `src/utils/`, and `src/services/`.
- Never bloat single files with monolithic logic. Keep components and hooks clean and modularized under 500 lines wherever possible.
- Decouple state management, audio generation, Firestore persistence, and UI rendering into dedicated modular files.

## 2. Anti-Regression & Logic Preservation
- When fixing bugs or adding features, **NEVER alter existing working business logic**.
- Do not overcomplicate solution patterns or introduce unnecessary complexity.
- Keep fixes minimal, targeted, elegant, and directly rooted in empirical root-cause analysis.

## 3. Vibe Coding Standard
- Code must remain concise, readable, and highly maintainable for rapid AI pair programming.
- Maintain strict import consistency (`@/` alias trỏ tới `src/`).
