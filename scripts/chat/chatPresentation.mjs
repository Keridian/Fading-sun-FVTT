export function hasDisplayValue(value) {
  return value !== undefined && value !== null && value !== "";
}

export function createElement(tag, className = "", text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = String(text);
  return element;
}

export function createSummaryRow(label, value, {
  rowClass = "",
  labelClass = "",
  valueClass = "",
  valueTag = "strong"
} = {}) {
  const row = createElement(
    "div",
    ["fs4e-summary-row", rowClass].filter(Boolean).join(" ")
  );
  row.append(
    createElement(
      "span",
      ["fs4e-summary-label", labelClass].filter(Boolean).join(" "),
      label
    ),
    createElement(
      valueTag,
      ["fs4e-summary-value", valueClass].filter(Boolean).join(" "),
      value
    )
  );
  return row;
}

export function appendSummaryRow(container, label, value, options = {}) {
  if (options.skipMissing && !hasDisplayValue(value)) return null;
  const row = createSummaryRow(label, value, options);
  container.append(row);
  return row;
}

export function createDetails(label, className = "") {
  const details = createElement(
    "details",
    ["fs4e-details", className].filter(Boolean).join(" ")
  );
  const summary = createElement("summary", "fs4e-details-summary", label);
  const content = createElement("div", "fs4e-details-content");
  details.append(summary, content);
  return { details, content };
}

export function createWorkflowBlock(title, className = "") {
  const block = createElement(
    "section",
    ["fs4e-workflow-block", className].filter(Boolean).join(" ")
  );
  block.append(createElement("h4", "fs4e-workflow-title", title));
  return block;
}
