import { uniqueId } from 'lodash';
import { IStepOptions, IPluginOptions } from '../types';
import { fs } from '@serverless-cd/core';
import { command, Options } from 'execa';
import _ from 'lodash';
const pkg = require('../../package.json');

export function getLogPath(filePath: string) {
  return `step_${filePath}.log`;
}

export function getDefaultInitLog() {
  return `Info: ${pkg.name}: ${pkg.version}, ${process.platform}-${process.arch}, node-${process.version}`;
}

export function getScript(val: string) {
  return `
    return async function run({ $, cd, fs, glob, chalk, YAML, which, os, path, logger }) {
      $.log = (entry)=> {
        switch (entry.kind) {
          case 'cmd':
            logger.info(entry.cmd)
            break
          case 'stdout':
          case 'stderr':
            logger.info(entry.data.toString())
            break
          case 'cd':
            logger.info('$ ' + chalk.greenBright('cd') + ' ' +  entry.dir)
            break
        }
      }
      ${val}
    }`;
}

export async function parsePlugin(steps: IStepOptions[], that: any) {
  const postArray = [] as IPluginOptions[];
  const runArray = [] as IStepOptions[];
  for (const item of steps) {
    const pluginItem = item as IPluginOptions;
    if (pluginItem.plugin) {
      // 本地路径时，不需要安装依赖
      if (!fs.existsSync(pluginItem.plugin)) {
        // --no-save
        that.logger.info(`install plugin ${pluginItem.plugin}...`);
        const cp = command(
          `npm install ${pluginItem.plugin} --registry=https://registry.npmmirror.com`,
        );
        that.childProcess.push(cp);
        await that.onFinish(cp);
        that.logger.info(`install plugin ${pluginItem.plugin} success`);
      }
      const app = require(pluginItem.plugin);
      pluginItem.type = 'run';
      if (app.postRun) {
        postArray.push({ ...item, type: 'postRun' } as IPluginOptions);
      }
    }
    runArray.push(item);
  }
  return [...runArray, ...postArray].map((item) => ({ ...item, stepCount: uniqueId() }));
}

export function getProcessTime(time: number) {
  return (Math.round((Date.now() - time) / 10) * 10) / 1000;
}

/**
 * @desc 执行shell指令，主要处理 >,>>,||,|,&&等case,直接加shell:true的参数
 * @param runStr 执行指令的字符串
 * @param options
 */
export function runScript(runStr: string, options: Options<string>) {
  const shellTokens = ['>', '>>', '|', '||', '&&'];
  const runnerTokens = _.filter(shellTokens, (item) => _.includes(runStr, item));
  if (Array.isArray(runnerTokens) && runnerTokens.length > 0) {
    return command(runStr, { ...options, shell: true });
  } else {
    return command(runStr, options);
  }
}

export function outputLog(logger: any, message: any) {
  process.env['CLI_VERSION'] ? logger.debug(message) : logger.info(message);
}
