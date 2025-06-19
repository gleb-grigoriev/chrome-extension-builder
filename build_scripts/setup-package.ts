import fs from "fs";

// DO NOT DELETE THIS FILE
// This file is used by build system to build a clean npm package with the compiled js files in the root of the package.
// It will not be included in the npm package.

function main() {

    const projectDir = __dirname + '/..';
    const outDir = projectDir + '/dist';
    const source = fs.readFileSync(projectDir + "/package.json").toString('utf-8');
    const sourceObj = JSON.parse(source);
    sourceObj.scripts = {};
    sourceObj.devDependencies = {};
    if (sourceObj.main.startsWith("dist/")) {
        sourceObj.main = sourceObj.main.slice(5);
    }
    if (sourceObj.types.startsWith("dist/")) {
        sourceObj.types = sourceObj.types.slice(5);
    }
    fs.writeFileSync(outDir + "/package.json", Buffer.from(JSON.stringify(sourceObj, null, 2), "utf-8") );
    fs.writeFileSync(outDir + "/version.txt", Buffer.from(sourceObj.version, "utf-8") );

    fs.copyFileSync(projectDir + "/.npmignore", outDir + "/.npmignore");

    const buildersJson = fs.readFileSync(projectDir + "/builders.json").toString('utf-8');
    fs.writeFileSync(outDir + "/builders.json", Buffer.from(buildersJson, "utf-8") );
}

main();