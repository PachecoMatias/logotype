import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  formatBacklogMetadataBadges,
  joinBacklogDescription,
  splitBacklogDescription,
} from "../src/utils/backlogMetadata.js";

const rawDescription =
  "[BACKLOG tipo=historia_usuario; origen=derivada_ia; padre=hu-2; aprobacion=propuesta]\n  Descripción humana.";

test("parses backlog metadata into clean badges without exposing the raw prefix", () => {
  const parsed = splitBacklogDescription(rawDescription);

  assert.equal(parsed.description, "Descripción humana.");
  assert.deepEqual(formatBacklogMetadataBadges(parsed.metadata), [
    { key: "tipo", label: "Historia de usuario" },
    { key: "origen", label: "Origen: IA" },
    { key: "aprobacion", label: "Propuesta" },
  ]);
  assert.doesNotMatch(parsed.description, /\[BACKLOG/);
});

test("round-trips the exact persisted metadata prefix while replacing only human text", () => {
  const parsed = splitBacklogDescription(rawDescription);

  assert.equal(
    joinBacklogDescription(parsed.prefix, "Nueva descripción humana."),
    "[BACKLOG tipo=historia_usuario; origen=derivada_ia; padre=hu-2; aprobacion=propuesta]\n  Nueva descripción humana.",
  );
});

test("leaves ordinary descriptions unchanged and hides unparseable backlog envelopes", () => {
  assert.deepEqual(splitBacklogDescription("Descripción normal."), {
    description: "Descripción normal.",
    metadata: null,
    prefix: "",
  });

  const malformed = splitBacklogDescription(
    "[BACKLOG tipo=desconocido; origen=otro] Texto visible.",
  );
  assert.equal(malformed.description, "Texto visible.");
  assert.equal(malformed.metadata, null);
  assert.equal(
    joinBacklogDescription(malformed.prefix, malformed.description),
    "[BACKLOG tipo=desconocido; origen=otro] Texto visible.",
  );
});

test("backlog read and edit surfaces consume the clean metadata presentation", async () => {
  const [contentSource, editorSource, listSource] = await Promise.all([
    readFile(
      new URL("../src/components/Panel/HistoriaModal.jsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/components/Panel/HistoriaEditor.jsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/components/Panel/PanelHistorias.jsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(
    contentSource,
    /splitBacklogDescription\(historia\.descripcion\)/,
  );
  assert.match(contentSource, /formatBacklogMetadataBadges/);
  assert.doesNotMatch(contentSource, />\{historia\.descripcion\}</);
  assert.match(editorSource, /joinBacklogDescription/);
  assert.match(editorSource, /metadataPrefix/);
  assert.doesNotMatch(
    editorSource,
    /descripcion:\s*historia\.descripcion\s*\|\|\s*["']{2}/,
  );
  assert.doesNotMatch(listSource, /filter\([^)]*(?:propuesta|aprobada)/i);
});
