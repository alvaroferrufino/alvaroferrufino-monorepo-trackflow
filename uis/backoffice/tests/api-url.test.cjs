const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const urlSetup = source.split("const categoryLabels")[0];

for (const [origin, expected] of [
  ["http://localhost:3000", "http://localhost:8000/api/incidents"],
  ["http://127.0.0.1:3000", "http://localhost:8000/api/incidents"],
  ["https://trackflow-3000.app.github.dev", "https://trackflow-8000.app.github.dev/api/incidents"],
  ["https://trackflow.internal:3000", "https://trackflow.internal:8000/api/incidents"],
]) {
  test(`API URL for ${origin}`, () => {
    const result = vm.runInNewContext(`${urlSetup}\nAPI_URL`, {
      URL,
      window: { location: { origin } },
    });
    assert.equal(result, expected);
  });
}