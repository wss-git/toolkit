"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProcessTime = exports.getSteps = exports.getScript = exports.getDefaultInitLog = exports.getLogPath = void 0;
const lodash_1 = require("lodash");
const core_1 = require("@serverless-cd/core");
const execa_1 = require("execa");
const pkg = require('../../package.json');
function getLogPath(filePath) {
    return `step_${filePath}.log`;
}
exports.getLogPath = getLogPath;
function getDefaultInitLog() {
    return `Info: ${pkg.name}: ${pkg.version}, ${process.platform}-${process.arch}, node-${process.version}`;
}
exports.getDefaultInitLog = getDefaultInitLog;
function getScript(val) {
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
exports.getScript = getScript;
function getSteps(steps, childProcess) {
    const postArray = [];
    const runArray = (0, lodash_1.map)(steps, (item) => {
        const usesItem = item;
        if (usesItem.uses) {
            // 本地路径调试时，不在安装依赖
            if (!core_1.fs.existsSync(usesItem.uses)) {
                const cp = (0, execa_1.command)(`npm i ${usesItem.uses} --no-save`);
                childProcess.push(cp);
            }
            const app = require(usesItem.uses);
            usesItem.type = 'run';
            if (app.postRun) {
                postArray.push(Object.assign(Object.assign({}, item), { type: 'postRun' }));
            }
        }
        return item;
    });
    return [...runArray, ...postArray].map((item) => (Object.assign(Object.assign({}, item), { stepCount: (0, lodash_1.uniqueId)() })));
}
exports.getSteps = getSteps;
function getProcessTime(time) {
    return (Math.round((Date.now() - time) / 10) * 10) / 1000;
}
exports.getProcessTime = getProcessTime;
//# sourceMappingURL=index.js.map