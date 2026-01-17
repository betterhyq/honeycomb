import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
    entries: ["./src/index", "./src/init"],
    declaration: true
  });