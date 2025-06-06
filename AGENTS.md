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
- Start new files with the project copyright header whenever possible.

  For TypeScript or languages that use block comments:

  ```ts
  /*
   * Copyright (C) 2025 Garrett Brown
   * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
   *
   * SPDX-License-Identifier: AGPL-3.0-or-later
   * See the file LICENSE.txt for more information.
   */
  ```

  For files that use `#` style comments:

  ```
  ################################################################################
  #
  #  Copyright (C) 2025 Garrett Brown
  #  This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
  #
  #  SPDX-License-Identifier: AGPL-3.0-or-later
  #  See the file LICENSE.txt for more information.
  #
  ################################################################################
  ```
