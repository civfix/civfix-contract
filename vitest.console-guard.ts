import { afterEach, beforeEach } from "vitest"

import { startConsoleGuard, stopConsoleGuard } from "./__tests__/support/console.js"

beforeEach(startConsoleGuard)
afterEach(stopConsoleGuard)
