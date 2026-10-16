// Same rules for apps/admin, resolving its own `@/` alias (docs/04 §10.4).
const base = require("./.dependency-cruiser.cjs");

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  ...base,
  options: { ...base.options, tsConfig: { fileName: "tsconfig.depcruise.admin.json" } },
};
