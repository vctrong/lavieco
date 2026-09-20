// Shared project rules (docs/04 §10.1). Selectors are exported by name so that
// a config block can re-enable a single exception without dropping the others.

const HEX = "#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})([^0-9a-zA-Z]|$)";
const VIETNAMESE = "[\\u00C0-\\u1EF9]";

export const SELECTORS = {
  hex: {
    selector: `Literal[value=/${HEX}/]`,
    message: "No loose hex colors. Use a design token (theme.css is the only place for hex). C5",
  },
  hexTemplate: {
    selector: `TemplateElement[value.raw=/${HEX}/]`,
    message: "No loose hex colors. Use a design token (theme.css is the only place for hex). C5",
  },
  viText: {
    selector: `JSXText[value=/${VIETNAMESE}/]`,
    message: "UI copy belongs in features/<name>/constants/text.ts, not in JSX. C4",
  },
  viAttribute: {
    selector: `JSXAttribute > Literal[value=/${VIETNAMESE}/]`,
    message: "UI copy belongs in features/<name>/constants/text.ts, not in JSX attributes. C4",
  },
  imagePath: {
    selector: "JSXAttribute > Literal[value=/^\\/images\\//]",
    message: "Declare static image paths in a constants file, not in JSX. docs/04 §5.1",
  },
  inlineSvg: {
    selector: "JSXOpeningElement[name.name='svg']",
    message:
      "No inline <svg> for icons (use react-icons/fi). Decorative graphics live in an `illustrations/` folder. docs/04 §5.4",
  },
  processEnv: {
    selector: "MemberExpression[object.name='process'][property.name='env']",
    message: "Read env through lib/env or lib/env.public only. docs/04 §8",
  },
  tsEnum: {
    selector: "TSEnumDeclaration",
    message: "Do not use TS enum. Use `as const` or z.enum. docs/04 §7.1",
  },
};

/** Build a `no-restricted-syntax` value from the selector names to enforce. */
export function restrictedSyntax(names) {
  return ["error", ...names.map((name) => SELECTORS[name])];
}

export const ALL_SELECTOR_NAMES = Object.keys(SELECTORS);

export const RESTRICTED_IMPORTS = [
  "error",
  {
    patterns: [
      {
        group: ["react-icons", "react-icons/*", "!react-icons/fi"],
        message: "Only the Feather set is allowed: react-icons/fi. docs/04 §5.4",
      },
      {
        group: ["@lavieco/*/src", "@lavieco/*/src/*"],
        message: "No deep imports into another package. Use its public entry points. C2",
      },
    ],
  },
];
