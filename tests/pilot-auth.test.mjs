import assert from "node:assert/strict";
import test from "node:test";

import { parsePilotAuthHash } from "../app/pilot-auth.ts";

test("a Supabase magic-link hashból biztonságosan felépül a munkamenet", () => {
  const now = Date.UTC(2026, 6, 31, 12, 0, 0);
  const session = parsePilotAuthHash("#access_token=access-123&refresh_token=refresh-456&expires_in=1800", now);

  assert.deepEqual(session, {
    accessToken: "access-123",
    refreshToken: "refresh-456",
    expiresAt: now + 1_800_000,
    user: null,
  });
});

test("hiányos vagy nem hitelesítési hash nem hoz létre munkamenetet", () => {
  assert.equal(parsePilotAuthHash("#dashboard=overview"), null);
  assert.equal(parsePilotAuthHash("#access_token=access-only"), null);
});

test("a túl rövid lejárat legalább egyperces biztonsági időt kap", () => {
  const now = 1_000;
  const session = parsePilotAuthHash("#access_token=a&refresh_token=r&expires_in=5", now);
  assert.equal(session?.expiresAt, now + 60_000);
});
