import * as path from 'node:path';
import { readFileSync, writeFileSync, unlinkSync, openSync, writeSync, close } from 'node:fs';
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { ApplicationBuilderOptions, buildApplication } from '@angular-devkit/build-angular';
//import { getSystemPath, json } from '@angular-devkit/core';
import type { ApplicationBuilderExtensions, ApplicationBuilderInternalOptions } from '@angular/build/src/builders/application/options';
import { defer, switchMap, tap } from 'rxjs';
import { parse } from 'node-html-parser';
import { Observable } from 'rxjs';
import { CustomEsbuildApplicationSchema, ScriptAndHtmlFiles } from '../custom-esbuild-schema';
import { cloneDeep, omit } from 'lodash';
//import { MyPlugin } from './build-app-custom';
import type { Plugin, PluginBuild } from 'esbuild';
import { OutputPathClass } from '@angular/build/src/builders/application/schema';
import { getSystemPath, JsonObject, normalize } from '@angular-devkit/core';

interface ManifestInfo {
  service_worker: string | null;
  devtools_page: string | null;
  default_popup: string | null;
}
function createServiceWorkerBuildOptions(options: CustomEsbuildApplicationSchema, serviceWorkerScriptPath: string, devToolsFiles: ScriptAndHtmlFiles, ui: ScriptAndHtmlFiles) : ApplicationBuilderOptions{
    let commonBuildOptions = createCommonBuildOptions(options);
   // const res = merge(commonBuildOptions, {
   // index: 'projects/extension-host/dev-tools/bootstrap/bootstrap.html',
    //entryPoints: new Set<string>([serviceWorkerFilePath]),
    //browser : serviceWorkerFilePath,
    //outputPath : {
    //  browser: '',
    //  base : outputPath
    //}
  //})
 // const tempPathRoot = path.join(options.outputPath, 'chrome-extension-builder-');
 // const tmpFolder = mkdtempSync(tempPathRoot);
 // const indexFilePath = path.join(tmpFolder, 'dev-tools.html');
  commonBuildOptions.index = ui.html;

 // writeFileSync(indexFilePath, '<!doctype html>GEN!')
  const internalOptions = commonBuildOptions as ApplicationBuilderInternalOptions;
  delete internalOptions.browser;
  internalOptions.entryPoints = new Set<string>([serviceWorkerScriptPath , devToolsFiles.script, 
    ui.script
  ]);
  return internalOptions as ApplicationBuilderOptions;
}
function createCommonBuildOptions(options: ApplicationBuilderOptions){
  var blacklist = ['devTools', 'serviceWorker', 'manifest', 'ui'];
  const res = cloneDeep(omit(options, blacklist)) as ApplicationBuilderOptions;
  /*res.outputPath = {
    browser: '',
    base : ''
  };*/
  return res;
}

export function buildCustomEsbuildApplication(
  options: CustomEsbuildApplicationSchema,
  context: BuilderContext
): Observable<BuilderOutput> {

  const workspaceRoot = getSystemPath(normalize(context.workspaceRoot));
  const manifestInfo = {
    service_worker: null,
    devtools_page: null,
  } as ManifestInfo;
  let buildWithoutErrors = true;
  let projectOutputFolder;
  let projectOutputFolderSubPath = '';
  let devToolsScriptFile: string = '';
  let mainUiScriptFile: string = '';
  if(typeof options.outputPath === 'string'){
    projectOutputFolder = options.outputPath  as string;
  }
  else {
    const ouputPathObj = options.outputPath as OutputPathClass;
    projectOutputFolder = ouputPathObj.base
    if(ouputPathObj.browser){
      projectOutputFolderSubPath = ouputPathObj.browser + '/'
    }
  }
  const devToolsHtmlOutputFileRelativePath = path.join(projectOutputFolderSubPath, path.basename(options.devTools.html))
  const devToolsHtmlInputFileAbsolutePath = path.join(workspaceRoot, options.devTools.html)
  const devToolsHtmlOutputFileAbsolutePath = path.join(projectOutputFolder, devToolsHtmlOutputFileRelativePath)

  const mainUiHtmlOutputFileRelativePath = path.join(projectOutputFolderSubPath, path.basename(options.ui.html))
  const mainUiHtmlOutputFileAbsolutePath = path.join(projectOutputFolder, mainUiHtmlOutputFileRelativePath)

  manifestInfo.devtools_page  = devToolsHtmlOutputFileRelativePath

 /* const devToolsBootPageOutputPath = path.join(options.outputPath , devToolsSubPath)
  const devToolsBootPageManiFestRelativePath = path.join(devToolsSubPath , path.basename(options.devTools.index.toString())).replace('\\', '/')
  commonBuildOptions.outputPath = {
    browser: '',
    base : devToolsBootPageOutputPath
  };
  context.logger.info('Building DevTools part')
*/

  return defer(async () => {


    return null;
  }).pipe(
  /*  switchMap(extensions => {
      outputPathsWithPrerenderedRoutes.push(devToolsBootPageOutputPath)
      manifestInfo.devtools_page = devToolsBootPageManiFestRelativePath;

       return buildApplication(commonBuildOptions, context, extensions);
    }),*/
    switchMap(() => 
    {
      context.logger.info('Building browser extension plugin...')
      const serviceWorkerSubPath = 'service-worker';
      //const serviceWorkerOutputPath = path.join(options.outputPath , serviceWorkerSubPath)
      //outputPathsWithPrerenderedRoutes.push(serviceWorkerOutputPath)
      const outputFileName = path.basename(options.serviceWorker, path.extname(options.serviceWorker));
      const serviceWorkerPluginRelativePath = `${serviceWorkerSubPath}/${outputFileName}.js`
      //manifestInfo.service_worker = serviceWorkerPluginRelativePath;

      const outputFileNameHandler = {
        name: 'extbuilder:OutputFileNameHookPlugin',
        setup: (pb: PluginBuild) => {
          
          pb.onEnd((br) => {
             buildWithoutErrors = br.errors.length <= 0;
            if(buildWithoutErrors && br.outputFiles)
            {

              const buildOuputMetadata = br.metafile?.outputs;
              for (const outputFileName in buildOuputMetadata) {
                const ouputFileMetadata = buildOuputMetadata[outputFileName];
                if(ouputFileMetadata.entryPoint == options.devTools.script){
                  context.logger.info('Dev tools boot logic will be placed in: ' + outputFileName)
                  devToolsScriptFile = outputFileName;
                  continue;
                }
                if(ouputFileMetadata.entryPoint == options.serviceWorker){
                  context.logger.info('Service worker logic will be placed in: ' + outputFileName)
                  manifestInfo.service_worker = outputFileName;
                  continue;
                }
                if(ouputFileMetadata.entryPoint == options.ui.script){
                  context.logger.info('Main ui logic will be placed in: ' + outputFileName)
                  mainUiScriptFile = outputFileName;
                }
              }   
            }
          })
        },
      }as Plugin;

      const extension = { 
        codePlugins : [ outputFileNameHandler ],
      } as ApplicationBuilderExtensions;

      return buildApplication(
        createServiceWorkerBuildOptions(
            options, options.serviceWorker, options.devTools, options.ui
          ),
        context, extension)
    }
  ),
    tap(() => {
      if(!buildWithoutErrors){
        return;
      }
      unlinkSync(path.join(projectOutputFolder , 'prerendered-routes.json'))    
      /*
      outputPathsWithPrerenderedRoutes.forEach(p => {
        unlinkSync(path.join(projectOutputFolder , 'prerendered-routes.json'))        
      });
      */

      const manifestOutputFile = 'manifest.json';
      context.logger.info(`Patching ${manifestOutputFile}...`)
  
      const manifestAsString = readFileSync(options.manifest).toString('utf-8');
      const manifest = JSON.parse(manifestAsString);
      delete manifest.devtools_page;
      delete manifest.background;
      delete manifest.action;
      manifest['devtools_page'] = manifestInfo.devtools_page!.replace('\\', '/')
      manifest['background'] = {
        service_worker: `${projectOutputFolderSubPath}${manifestInfo.service_worker}`,
        type: 'module'
      }
      writeFileSync(path.join(projectOutputFolder, manifestOutputFile), Buffer.from(JSON.stringify(manifest, null, 2), "utf-8") );


      context.logger.info(`Creating ${devToolsHtmlOutputFileAbsolutePath}...`)

      var data = readFileSync(devToolsHtmlInputFileAbsolutePath); 
      let fd = null;
      try{
          fd = openSync(devToolsHtmlOutputFileAbsolutePath,  'w')
          var buffer = Buffer.from(`<script type="module" src="${devToolsScriptFile}" type="module" crossorigin="anonymous"></script>`);
          writeSync(fd, buffer, 0, buffer.length, 0);
          writeSync(fd, data, 0, data.length, buffer.length)
      }
      finally
      {
        if(fd)
            {
              close(fd);
            }
      }

      context.logger.info(`Patching ${mainUiHtmlOutputFileAbsolutePath}...`)
       
      var mainUiDoc = parse(readFileSync(mainUiHtmlOutputFileAbsolutePath).toString());
      const head = mainUiDoc.querySelector('head')!;
      fd = openSync(mainUiHtmlOutputFileAbsolutePath,  'w')
      try{

        for (const linkEl of head.querySelectorAll('link')) {
          if(linkEl.getAttribute('rel') != 'stylesheet'){
            continue;
          }
          const href = linkEl.getAttribute('href');
          if(href && !href.startsWith('projectOutputFolderSubPath')){
             context.logger.info(`Fixing CSS stylesheet link ${href}...`)
             linkEl.setAttribute('href', `${projectOutputFolderSubPath}${href}`)
          }
        }
        context.logger.info(`Appending ${mainUiScriptFile} script...`)
        head.innerHTML = `<script src="${mainUiScriptFile}" type="module" crossorigin="anonymous"></script>${head.innerHTML}`
        
        writeFileSync(mainUiHtmlOutputFileAbsolutePath, mainUiDoc.toString())
        context.logger.info(`Patching ${mainUiHtmlOutputFileAbsolutePath} done.`)
      }
      finally
      {
        if(fd){
          close(fd)
        }
      }
    })
  );
}

export default createBuilder<JsonObject & CustomEsbuildApplicationSchema>(buildCustomEsbuildApplication);
//export default createBuilder<CustomEsbuildApplicationSchema>(buildCustomEsbuildApplication);


