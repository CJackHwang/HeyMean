# Contributing to HeyMean

Thank you for considering contributing to HeyMean! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Be respectful, inclusive, and constructive. We aim to foster a welcoming community for all contributors.

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Basic knowledge of React, TypeScript, and IndexedDB
- An API key from [Google AI Studio](https://aistudio.google.com/app/apikey) or [OpenAI](https://platform.openai.com/api-keys)

### Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/heymean.git
   cd heymean
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Configure API key in the app**
   - Open http://localhost:3000
   - Navigate to Settings
   - Add your Gemini or OpenAI API key

## Development Guidelines

### Code Style

- **TypeScript** - Always use TypeScript with proper type annotations
- **Functional Components** - Use functional components with hooks (no class components)
- **ES6+ Syntax** - Use modern JavaScript features (async/await, arrow functions, destructuring)
- **Naming Conventions**:
  - Components: PascalCase (e.g., `ChatInput.tsx`)
  - Hooks: camelCase with `use` prefix (e.g., `useConversation.tsx`)
  - Utils/Services: camelCase (e.g., `apiService.ts`)
  - Constants: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE_MB`)

### Project Structure

Follow the existing structure:
```
heymean/
├── components/       # Reusable UI components
├── pages/           # Route-level pages
├── services/        # Business logic and external services
├── hooks/           # Custom React hooks
├── utils/           # Utility functions
├── locales/         # i18n translation files
└── types.ts         # TypeScript type definitions
```

### TypeScript Guidelines

1. **Always add types** - No implicit `any`
   ```typescript
   // Good
   const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => { ... }
   
   // Bad
   const handleClick = (event) => { ... }
   ```

2. **Use existing types** - Import from `types.ts`
   ```typescript
   import { Message, MessageSender } from '../types';
   ```

3. **Create reusable types** - Add new types to `types.ts`
   ```typescript
   export interface MyNewType {
     id: string;
     name: string;
   }
   ```

### React Best Practices

1. **Use hooks properly**
   ```typescript
   // useCallback for stable function references
   const handleSend = useCallback(async (text: string) => {
     // ...
   }, [dependencies]);
   
   // useMemo for expensive computations
   const sortedMessages = useMemo(() => {
     return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
   }, [messages]);
   ```

2. **Keep components focused** - One responsibility per component
3. **Avoid prop drilling** - Use Context for deeply nested state
4. **Handle errors gracefully** - Use the centralized error handler
   ```typescript
   import { handleError } from '../services/errorHandler';
   
   try {
     // operation
   } catch (error) {
     const appError = handleError(error, 'context');
     showToast(appError.userMessage, 'error');
   }
   ```

### Adding New Features

When adding a new feature:

1. **Check compatibility** - Ensure it works with both Gemini and OpenAI
2. **Add translations** - Update all language files (en.json, zh-CN.json, ja.json)
3. **Test responsiveness** - Verify on mobile and desktop
4. **Update documentation** - Add to README.md and ARCHITECTURE.md if significant
5. **Consider performance** - Use virtualization for large lists, memoization, etc.

## Internationalization (i18n)

When adding UI text:

1. **Never hardcode strings** - Always use translations
   ```typescript
   // Good
   const { t } = useTranslation();
   return <button>{t('common.save')}</button>;
   
   // Bad
   return <button>Save</button>;
   ```

2. **Add to all language files**
   ```json
   // locales/en.json
   {
     "myFeature": {
       "title": "My Feature",
       "description": "This is my feature"
     }
   }
   
   // locales/zh-CN.json
   {
     "myFeature": {
       "title": "我的功能",
       "description": "这是我的功能"
     }
   }
   
   // locales/ja.json
   {
     "myFeature": {
       "title": "私の機能",
       "description": "これは私の機能です"
     }
   }
   ```

3. **Use descriptive keys** - Make keys self-documenting

## Testing

While we don't have automated tests yet, please manually test:

1. **Both AI providers** - Gemini and OpenAI
2. **All file types** - Images, text files, PDFs (Gemini only)
3. **CRUD operations** - Create, read, update, delete for conversations and notes
4. **Edge cases**:
   - Empty conversations
   - Very long messages
   - Network failures
   - API errors
   - Large files
5. **Mobile and desktop** - Different screen sizes
6. **Both themes** - Light and dark modes
7. **All languages** - English, Chinese, Japanese

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes**
   - Follow code style guidelines
   - Add types for all new code
   - Update translations
   - Test thoroughly

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```
   
   Use conventional commit messages:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation only
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `perf:` - Performance improvements
   - `test:` - Adding tests
   - `chore:` - Build process or auxiliary tool changes

4. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

5. **Create a Pull Request**
   - Provide a clear title and description
   - Reference any related issues
   - Include screenshots for UI changes
   - List what you tested

## Reporting Issues

When reporting bugs:

1. **Search existing issues** - Check if already reported
2. **Provide details**:
   - Browser and version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Console errors if any
3. **Minimal reproduction** - Simplify to the smallest case that shows the issue

## Feature Requests

For feature requests:

1. **Check existing issues** - See if already requested
2. **Describe the feature** - What problem does it solve?
3. **Provide context** - Use cases and examples
4. **Consider alternatives** - Other ways to achieve the same goal

## Development Tips

### Useful Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Debugging

1. **React DevTools** - Install the browser extension
2. **Console logging** - Use `console.log()`, `console.error()`
3. **Breakpoints** - Use browser DevTools debugger
4. **IndexedDB Inspector** - Check Application tab in DevTools

### Common Issues

**Issue: "API key not configured"**
- Solution: Add your API key in Settings

**Issue: "PDF not working with OpenAI"**
- Solution: PDFs are only supported with Gemini provider

**Issue: "Conversation not loading"**
- Solution: Check IndexedDB in DevTools → Application → Storage

**Issue: "Build fails"**
- Solution: Delete `node_modules` and `package-lock.json`, then run `npm install`

## Architecture Resources

- Read [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture info
- Check existing code patterns before adding new code
- Follow the established conventions

## Questions?

- Open a [GitHub Discussion](../../discussions)
- Check [existing issues](../../issues)
- Review the [documentation](README.md)

Thank you for contributing to HeyMean! 🎉
