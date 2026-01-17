import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: ["./src/index", "./src/init"],
  declaration: true,
  failOnWarn: false,
  externals: ["kysely", "kysely-wasm", "sql.js"],
});
