module.exports = {
  presets: ["next/babel"],
  plugins: [
    ["@babel/plugin-transform-typescript", {
      "allowDeclareFields": true
    }],
    "@babel/plugin-transform-private-methods",
    "@babel/plugin-transform-class-properties"
  ]
};
