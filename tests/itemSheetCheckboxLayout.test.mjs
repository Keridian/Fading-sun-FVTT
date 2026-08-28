import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(
  new URL("../styles/fadingsuns4e.css", import.meta.url),
  "utf8"
);
const itemSheet = readFileSync(
  new URL("../scripts/applications/itemSheet.mjs", import.meta.url),
  "utf8"
);
const template = readFileSync(
  new URL("../templates/item/item-sheet.hbs", import.meta.url),
  "utf8"
);

test("Equipped remains a submit-on-change checkbox bound to system.equipped", () => {
  assert.match(
    template,
    /class="checkbox-field"><input type="checkbox" name="system\.equipped" \{\{checked system\.equipped\}\}/
  );
  assert.match(itemSheet, /tag: "form"/);
  assert.match(itemSheet, /submitOnChange: true/);
});

test("another Item BooleanField uses the same generic checkbox layout", () => {
  assert.match(
    template,
    /class="checkbox-field"><input type="checkbox" name="system\.active" \{\{checked system\.active\}\}/
  );
  assert.match(
    template,
    /class="checkbox-field"><input type="checkbox" name="system\.metallic" \{\{checked system\.metallic\}\}/
  );
});

test("Item text-control rules explicitly exclude checkboxes", () => {
  assert.ok(css.includes(
    ".fadingsuns4e.item-sheet input:not([type=\"checkbox\"]),"
  ));
  assert.ok(css.includes(
    ".fadingsuns4e.item-sheet .field-grid input:not([type=\"checkbox\"]),"
  ));
  assert.ok(css.includes(
    ".fadingsuns4e.item-sheet .technology-grid input:not([type=\"checkbox\"]),"
  ));
});

test("Item checkboxes keep a compact flex layout", () => {
  assert.match(
    css,
    /\.checkbox-field \{[\s\S]*?align-items: center;[\s\S]*?display: flex;[\s\S]*?gap: 0\.4rem;[\s\S]*?justify-content: flex-start;[\s\S]*?width: auto;[\s\S]*?\}/
  );
  assert.match(
    css,
    /\.checkbox-field input\[type="checkbox"\] \{[\s\S]*?flex: 0 0 auto;[\s\S]*?margin: 0;[\s\S]*?\}/
  );
});

test("text, number, select, and textarea controls retain their form bindings", () => {
  assert.match(template, /<input type="text"/);
  assert.match(template, /<input type="number"/);
  assert.match(template, /<select name=/);
  assert.match(template, /<textarea name=/);
  assert.match(
    css,
    /input:not\(\[type="checkbox"\]\),\n\.fadingsuns4e\.item-sheet select,\n\.fadingsuns4e\.item-sheet textarea \{/
  );
  assert.match(
    css,
    /\.fadingsuns4e select option,\n\.fadingsuns4e select optgroup \{[\s\S]*?background-color: Canvas;[\s\S]*?color: CanvasText;[\s\S]*?\}/
  );
});
