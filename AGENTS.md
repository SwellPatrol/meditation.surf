# AGENTS

This repository uses pnpm for package management.

## Programmatic checks

Before committing or opening a pull request, run the following commands and ensure they pass:

```sh
pnpm lint
pnpm build
pnpm test
```

Only proceed if all commands succeed.

## Coding guidelines

- Annotate all TypeScript variables, parameters, and return types explicitly, even if the compiler could infer them.
- Optimize code for readability and understandability.
