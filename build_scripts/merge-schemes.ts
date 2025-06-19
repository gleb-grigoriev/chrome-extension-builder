import { writeFileSync } from 'fs';
import { merge } from 'lodash';

interface CustomSchema {
  originalSchemaPackage?: string;
  originalSchemaPath: string;
  schemaExtensionPaths: string[];
  newSchemaPath: string;
}

import { dirname, join } from 'path';

function resolvePackagePath(packageName: string, subPath: string) {
  try {
    const packageJsonPath = require.resolve(`${packageName}/package.json`);
    const packageDir = dirname(packageJsonPath);
    return join(packageDir, subPath);
  } catch (error: any) {
    console.error(`Failed to resolve path for package ${packageName}: ${error.message}`);
    process.exit(1);
  }
}

const wd = process.cwd();
const schemesToMerge: CustomSchema[] = require(`${wd}/src/schemes`);

for (const {
  originalSchemaPackage,
  originalSchemaPath,
  schemaExtensionPaths,
  newSchemaPath,
} of schemesToMerge) {
  const resolvedOriginalSchemaPath = originalSchemaPackage
    ? // Need it to bypass the Node resolution mechanism which respects only exported paths, currently only for esbuild
      resolvePackagePath(originalSchemaPackage, originalSchemaPath)
    : originalSchemaPath;

  const originalSchema = require(resolvedOriginalSchemaPath);
  const schemaExtensions = schemaExtensionPaths.map((path: string) => require(path));
  const newSchema = schemaExtensions.reduce(
    (extendedSchema: any, currentExtension: any) => {
      const clone = merge({}, extendedSchema)
      const result = merge(clone, currentExtension);
      delete result.properties.browser
      result.properties['serviceWorker'] = {
        description: "An optional file as the extension service worker.",
        type: "string"
      };
      result.properties['devTools'] = {
        description: "An optional section to support extension for DevTools window ",
        type: "object",
        additionalProperties: false,
        properties : {
            html : {
              description: "Specify the path to dev tools html file.",
              type: "string"
            },
            script : {
              description: "Specify the path to dev tools script file.",
              type: "string"
            }
        }
      };
      result.properties['ui'] = {
        description: "An optional section to support extension for UI in other parts of plugin",
        type: "object",
        additionalProperties: false,
        properties : {
            html : {
              description: "Specify the path to main ui html file.",
              type: "string"
            },
            script : {
              description: "Specify the path to main ui script file.",
              type: "string"
            }
        }
      };
      result.properties['manifest'] = {
        description: "Specify the path to plugin manifest file.",
        type: "string"
      };
      result.required = currentExtension.required;
      return result;
      result.properties = {
        /*outputPath: {
          description: "Specify the output path relative to workspace root.",
          type: "string"
        },*/
        manifest: {
          description: "Specify the path to plugin manifest file.",
          type: "string"
        },
        serviceWorker: {
          description: "An optional file as the extension service worker.",
          type: "string"
        },
        tsConfig: {
          type: "string",
          description: "The full path for the TypeScript configuration file, relative to the current workspace."
        },
        budgets: {
          description: "Budget thresholds to ensure parts of your application stay within boundaries which you set.",
          type: "array",
          items: {
            "$ref": "#/definitions/budget"
          },
          default: []
        },
        outputHashing: {
          type: "string",
          description: "Define the output filename cache-busting hashing mode.",
          default: "none",
          enum: [
            "none",
            "all",
            "media",
            "bundles"
          ]
        },
        devTools : {
          properties: clone.properties,
          description: "Configuration for devTools application part",
          type: "object",
          required: [
              "index",
              "browser"
            ]
        }
      };
      result.required = currentExtension.required;
      return result;
    },
    originalSchema
  );
  console.log(newSchemaPath)
  writeFileSync(newSchemaPath, JSON.stringify(newSchema, null, 2), 'utf-8');
}
