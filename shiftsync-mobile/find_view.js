const fs = require("fs");
const path = require("path");

function checkDir(d) {
  if (!fs.existsSync(d)) return;
  const files = fs.readdirSync(d, { withFileTypes: true });
  for (let f of files) {
    if (f.isDirectory() && f.name !== "node_modules" && f.name !== ".expo") {
      checkDir(path.join(d, f.name));
    } else if (f.name.endsWith(".tsx")) {
      const p = path.join(d, f.name);
      const code = fs.readFileSync(p, "utf8");
      if (code.includes("<View") && !code.includes("import { View }") && !code.includes("import {View") && !code.includes("import { View,") && !code.match(/import .*View.* from ['"]react-native['"]/)) {
        console.log("Missing View in: " + p);
      }
    }
  }
}

checkDir("./app");
checkDir("./src");
