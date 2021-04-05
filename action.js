const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const GITHUB_REPOTEAM = GITHUB_REPOSITORY.split('/')[0];
const GITHUB_REPONAME = GITHUB_REPOSITORY.split('/')[1];
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = { owner: GITHUB_REPOTEAM, repo: GITHUB_REPONAME };

//

process.onEXIT = function () { }; process.on('exit', function () { process.onEXIT(); });

//

const fs = require('fs');
const _ = require('lodash');
const pino = require('pino');
const execa = require('execa');
const chalk = require('chalk');
const semver = require('semver');
const { Octokit } = require("@octokit/rest");

//

const octokit = new Octokit({ auth: GITHUB_TOKEN });

//

let colors = {};
let labels = {};

colors.ISSUE_DEV = '00EEFF';
colors.ISSUE_BUG = 'FF0011';
colors.ISSUE_DOCS = '999999';
colors.ISSUE_TASK = '000000';
colors.ISSUE_FEATURE = '0055CC';
colors.ISSUE_SUPPORT = 'FF5500';
colors.ISSUE_SECURITY = 'FF0011';

colors.TAG_DUPE = 'CCCCCC';
colors.TAG_GOODFIRST = '66FF00';
colors.TAG_NEEDHELP = 'FF5500';
colors.TAG_NEEDINFO = 'FF00DD';
colors.TAG_NOFIX = 'CCCCCC';

colors.TOPIC_APP = 'FFFFFF';
colors.TOPIC_BACKEND = 'FFFFFF';
colors.TOPIC_BUILD = 'FFFFFF';
colors.TOPIC_CODE = 'FFFFFF';
colors.TOPIC_DATA = 'FFFFFF';
colors.TOPIC_DOCS = 'FFFFFF';
colors.TOPIC_LIBS = 'FFFFFF';
colors.TOPIC_REPO = 'FFFFFF';
colors.TOPIC_UI = 'FFFFFF';

colors.STATUS_TODO = 'FFEE00';
colors.STATUS_ACTIVE = '118811';
colors.STATUS_PENDING = 'FF00DD';
colors.STATUS_DONE = '666666';

colors.PRIORITY_URGENT = 'FF0011';

if (0) {
    colors.ZZ_RGB_1_R = 'FF0000';
    colors.ZZ_RGB_2_G = '00FF00';
    colors.ZZ_RGB_3_B = '0000FF';

    colors.ZZ_COLOR_GRAY_00 = '000000';
    colors.ZZ_COLOR_GRAY_03 = '333333';
    colors.ZZ_COLOR_GRAY_06 = '666666';
    colors.ZZ_COLOR_GRAY_09 = '999999';
    colors.ZZ_COLOR_GRAY_12 = 'CCCCCC';
    colors.ZZ_COLOR_GRAY_15 = 'FFFFFF';

    colors.ZZ_COLOR_1_R = 'ff0000'
    colors.ZZ_COLOR_2_O = 'ff6600'
    colors.ZZ_COLOR_3_Y = 'ffcc00'
    colors.ZZ_COLOR_4_G = '62ff00'
    colors.ZZ_COLOR_5_C = '00ffc3'
    colors.ZZ_COLOR_6_B = '00ccff'
    colors.ZZ_COLOR_7_I = '0048ff'
    colors.ZZ_COLOR_8_V = '8000ff'
    colors.ZZ_COLOR_9_P = 'ff00d9'

    colors.ZZ_GH_DARK_0_R = 'B60205'
    colors.ZZ_GH_DARK_1_O = 'D93F0B'
    colors.ZZ_GH_DARK_2_Y = 'FBCA04'
    colors.ZZ_GH_DARK_3_G = '0E8A16'
    colors.ZZ_GH_DARK_4_C = '006B75'
    colors.ZZ_GH_DARK_5_B = '1D76DB'
    colors.ZZ_GH_DARK_6_I = '0052CC'
    colors.ZZ_GH_DARK_7_V = '5319E7'

    colors.ZZ_GH_LITE_0_R = 'E99695'
    colors.ZZ_GH_LITE_1_O = 'F9D0C4'
    colors.ZZ_GH_LITE_2_Y = 'FEF2C0'
    colors.ZZ_GH_LITE_3_G = 'C2E0C6'
    colors.ZZ_GH_LITE_4_C = 'BFDADC'
    colors.ZZ_GH_LITE_5_B = 'C5DEF5'
    colors.ZZ_GH_LITE_6_I = 'BFD4F2'
    colors.ZZ_GH_LITE_7_V = 'D4C5F9'
}

//

const App = {};

App.Args = { loglevel: 'trace', logfancy: true, deleteothers: true };

App.LogFancy = false; if (App.Args.logfancy) { App.LogFancy = { colorize: true, singleLine: true, translateTime: 'SYS:yyyy-mm-dd|HH:MM:ss', ignore: 'hostname,pid', messageFormat: function (log, key, label) { let msg = log.msg ? log.msg : ''; let logout = chalk.gray(App.Meta.NameTag); if (msg != '') { logout += ' ' + msg }; return logout; } }; }
App.Log = pino({ level: App.Args.loglevel, hooks: { logMethod: function (args, method) { if (args.length === 2) { args.reverse() } method.apply(this, args) } }, prettyPrint: App.LogFancy });
const LOG = App.Log; LOG.TRACE = LOG.trace; LOG.DEBUG = LOG.debug; LOG.INFO = LOG.info; LOG.WARN = LOG.warn; LOG.ERROR = LOG.error; LOG.FATAL = LOG.fatal;

const AppPackage = require('./package.json');
const AppMeta = _.merge(AppPackage, { Version: AppPackage.version || process.env.npm_package_version || '0.0.0', Name: AppPackage.namelong || AppPackage.name || 'App', NameTag: AppPackage.nametag || AppPackage.name.toUpperCase(), Info: AppPackage.description || '' });
AppMeta.Full = AppMeta.Name + ': ' + AppMeta.Info + ' [' + AppMeta.Version + ']';
App.Meta = AppMeta;

App.InfoDB = {}; App.Info = function (id) { let z = App.InfoDB[id]; if (!z) { return z; } else { return z.Type == 'FX' ? z.Value() : z.Value; } };
App.SetInfo = function (id, value) { if (typeof (value) == 'function') { return App.InfoDB[id] = { Type: 'FX', Value: value } } else { return App.InfoDB[id] = { Type: 'VALUE', Value: value } } };
App.SetInfo('Node.Args', process.argv.join(' '));
App.SetInfo('Node', require('os').hostname().toUpperCase() + ' : ' + process.pid + '/' + process.ppid + ' : ' + process.cwd() + ' : ' + process.version + ' : ' + require('os').version() + ' : ' + process.title);
App.SetInfo('App', App.Meta.Full);

//

App.Init = async function () {
    LOG.TRACE({ App: App });
    LOG.INFO(App.Meta.Full);
    LOG.DEBUG('Node.Info: ' + chalk.white(App.Info('Node')));
    LOG.DEBUG('Node.Args: ' + chalk.white(App.Info('Node.Args')));
    LOG.DEBUG('App.Init');

    process.onEXIT = function () { LOG.DEBUG('App.Exit'); };

    // Object.keys(process.env).sort().forEach(x => { if (x.startsWith('GITHUB')) { LOG.TRACE(x + ': ' + process.env[x]); } });

    LOG.DEBUG('App.InitDone');
    await App.Main();
}

App.Main = async function () {
    LOG.DEBUG('App.Main');

    App.SetupProject();
    App.SetupLabels();

}

//

App.SetupProject = function () {
    LOG.DEBUG('App.SetupProject');
}

App.SetupLabels = async function () {
    LOG.DEBUG('App.SetupLabels');

    let labelsdata = await octokit.rest.issues.listLabelsForRepo(REPO);
    for (let i = 0; i < labelsdata.data.length; i++) {
        let x = labelsdata.data[i];
        LOG.DEBUG('CheckLabel: ' + x.name);
        if (colors[x.name]) {
            labels[x.name] = true;

            if (colors[x.name] == x.color.toUpperCase()) { continue; }
            else {
                LOG.INFO('UpdateLabel: ' + x.name + ' => ' + colors[x.name]);
                await octokit.rest.issues.updateLabel({ owner: REPO.owner, repo: REPO.repo, name: x.name, color: colors[x.name] });
            }
        }
        else {
            if (App.Args.deleteothers) {
                LOG.INFO('DeleteLabel: ' + x.name);
                await octokit.rest.issues.deleteLabel({ owner: REPO.owner, repo: REPO.repo, name: x.name });
            }
        }
    }

    let colorkeys = Object.keys(colors);
    for (let i = 0; i < colorkeys.length; i++) {
        let x = colorkeys[i];
        if (!labels[x]) {
            LOG.INFO('CreateLabel: ' + x);
            try { await octokit.rest.issues.createLabel({ owner: REPO.owner, repo: REPO.repo, name: x, color: colors[x] }); } catch (ex) { LOG.ERROR(ex); }
        }
    }
}

//

App.Init();