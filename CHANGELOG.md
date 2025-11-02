# Changelog

All notable changes to HeyMean will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive architecture documentation (ARCHITECTURE.md)
- Contributing guidelines (CONTRIBUTING.md)
- Changelog file (CHANGELOG.md)
- Enhanced TypeScript type definitions with utility types
- Data hydration helpers for improved type safety

### Changed
- Improved type system with `ConversationUpdate` and `NoteUpdate` utility types
- Refactored database service with better data validation
- Optimized conversation and note sorting logic
- Updated StreamController to use shared StreamOptions type
- Enhanced code documentation and removed redundant comments

### Fixed
- Type consistency in database operations
- Date handling in conversation and note hydration
- Improved error handling in data retrieval

## [0.0.0] - Initial Release

### Added
- Multi-AI provider support (Google Gemini, OpenAI Compatible APIs)
- Rich markdown rendering with syntax highlighting
- LaTeX/KaTeX mathematical expressions support
- File attachment support (images, text, PDFs)
- Real-time AI thinking process display
- Streaming responses with typing effect
- Integrated notes workspace with Markdown support
- Conversation management (pin, rename, delete)
- Message actions (copy, resend, regenerate, delete)
- IndexedDB local storage for conversations, messages, and notes
- Multi-language support (English, Simplified Chinese, Japanese)
- Light and dark theme support
- Custom system prompts
- Responsive design for mobile and desktop
- Smooth page transitions with preloading
- Virtual scrolling for large message lists
- Offline support after initial load
- Privacy-focused local-only data storage

[Unreleased]: https://github.com/your-repo/heymean/compare/v0.0.0...HEAD
[0.0.0]: https://github.com/your-repo/heymean/releases/tag/v0.0.0
