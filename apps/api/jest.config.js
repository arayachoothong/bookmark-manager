/** @type {import("jest").Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
    "^.+\\.js$": [
      "babel-jest",
      { presets: [["@babel/preset-env", { modules: "commonjs" }]] },
    ],
  },
  collectCoverageFrom: ["**/*.(t|j)s"],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
  transformIgnorePatterns: ["/node_modules/.pnpm/(?!jose@)"],
};
