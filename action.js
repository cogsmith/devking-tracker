const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const GITHUB_REPOTEAM = GITHUB_REPOSITORY.split('/')[0];
const GITHUB_REPONAME = GITHUB_REPOSITORY.split('/')[1];
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = { owner: GITHUB_REPOTEAM, repo: GITHUB_REPONAME };

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

let labels = {};

let colors = {};

colors.ISSUE_BUG = 'D73A4A';
colors.ISSUE_FEATURE = 'A2EEEF';

colors.TAG_DUPE = 'CFD3D7';
colors.TAG_GOODFIRST = '7057FF';
colors.TAG_NEEDHELP = '008672';
colors.TAG_NEEDINFO = 'D876E3';

colors.TOPIC_DOCS = '0075CA';

colors.RESULT_NOFIX = 'FFFFFF';

colors.STATUS_TODO = 'ffcc00';
colors.STATUS_ACTIVE = '0E8A16';
colors.STATUS_PENDING = 'ff6600';
colors.STATUS_DONE = '999999';

colors.Z_0R = 'ff0000'
colors.Z_1O = 'ff6600'
colors.Z_2Y = 'ffcc00'
colors.Z_3G = '62ff00'
colors.Z_4C = '00ffc3'
colors.Z_5B = '00ccff'
colors.Z_6I = '0048ff'
colors.Z_7V = '8000ff'
colors.Z_8P = 'ff00d9'

//

const App = {};

App.Args = { loglevel: 'trace', logfancy: true };

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

    // Object.keys(process.env).sort().forEach(x => { if (x.startsWith('GITHUB')) { LOG.TRACE(x + ': ' + process.env[x]); } });

    LOG.DEBUG('App.InitDone');
    await App.Main();
}

App.Main = async function () {
    LOG.DEBUG('App.Main');

    let labelsdata = await octokit.rest.issues.listLabelsForRepo(REPO);

    for (let i=0;i<labelsdata.data.length;i++) {
        let x = labelsdata.data[i];
        if (colors[x.name]==x.color.toUpperCase()) { labels[x.name] = true; return; }
        await octokit.rest.issues.deleteLabel({owner:repo.owner,repo:repo.repo,name:x.name});
    }

    Object.keys(colors).forEach(x=>{
        if (!labels[x]) {
            octokit.rest.issues.createLabel({owner:repo.owner,repo:repo.repo,name:x,color:colors[x]});
        }
    });
}

//

App.Init();