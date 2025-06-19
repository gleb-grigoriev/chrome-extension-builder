import { ApplicationBuilderOptions } from '@angular-devkit/build-angular';


//type ApplicationBuilderOptionsWithoutOutputPath = Omit<ApplicationBuilderOptions, "outputPath">
export type ScriptAndHtmlFiles = {
  script : string;
  html : string;
}
export type CustomEsbuildApplicationSchema = ApplicationBuilderOptions & {
 // devTools: ApplicationBuilderOptionsWithoutOutputPath
//  outputPath: string;
  serviceWorker: string;
  devTools: ScriptAndHtmlFiles;
  ui: ScriptAndHtmlFiles;
  manifest: string;
};

