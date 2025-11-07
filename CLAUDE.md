# Claude Development Guidelines

## Pre-Submission Checklist

### 1. Run the Linter

```bash
npm run lint
```

If there are any linting issues, fix them automatically with:

```bash
npm run lint:fix
```

### 2. Run the Formatter

```bash
npm run format
```

To check formatting without making changes:

```bash
npm run format:check
```

### 3. Run Tests

```bash
npm test
```

For additional test options:

- UI mode: `npm run test:ui`
- Coverage: `npm run test:coverage`

## Quick Check Command

You can run all checks sequentially:

```bash
npm run lint && npm run format:check && npm test
```

## Git Workflow

After ensuring all checks pass:

1. Stage your changes: `git add .`
2. Commit with a descriptive message: `git commit -m "your message"`
3. Push to your branch: `git push -u origin <branch-name>`
