import { assertEquals } from "https://deno.land/std@0.120.0/testing/asserts.ts";
import { parse } from "./mod.ts";

Deno.test("accept file without ID3 tag", () => {
  assertEquals(parse(Uint8Array.of(1, 2, 3, 4, 5)), undefined);
});
