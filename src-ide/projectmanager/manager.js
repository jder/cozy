'use strict';

const FS = require('fs-extra');
const Child = require('child_process');
const Path = require('path');
const Process = require('process');
const Webpack = require('webpack');

let gameLibraries = JSON.parse(localStorage.getItem('gameLibraries')) || [];

// TODO get these from current platform + whether this is a "release" or not
const ENGINEDIR = Path.resolve('bin-win32-x64');
const IDEDIR = Path.resolve('src-ide');

const EngineStatus = require('./EngineStatus');
const Library = require('./Library');
const GameOverlay = require('./GameOverlay');

require('module').globalPaths.push(IDEDIR);

window.Manager = {
    start: function() {
        css('manager.css');

        let controlsArea = $('#controls');
        EngineStatus.add(controlsArea, () => this.recompileEngine());

        this.controls = $('#controls');
        this.gameList = $('#game-list');
        this.outputContainer = $('#output');
        this.dialogContainer = $('#dialogs');
        this.recompileInterval = null;
        this.activeGame = null;
        this.override = null;

        this.loadOverrides();
        EngineStatus.set('checking');

        var lastCompilation = 0;
        var cozyJS = Path.join(IDEDIR, "Cozy.js")
        if (FS.existsSync(cozyJS)) {
            lastCompilation = FS.statSync(cozyJS).mtime.getTime();
        }
        var srcFiles = [ "src-engine" ];
        var f, stat;
        let recompileNeeded = false;
        while(srcFiles.length > 0) {
            f = srcFiles.shift();
            stat = FS.statSync(f);
            if (stat.isDirectory()) {
                FS.readdirSync(f).forEach((ff) => {
                    srcFiles.push(Path.join(f, ff));
                });
            } else {
                if (stat.mtime.getTime() > lastCompilation) {
                    this.recompileNeeded = true;
                    break;
                }
            }
        }

        if (this.recompileNeeded) {
            this.recompileEngine();
        } else {
            EngineStatus.set('ready');
        }

        FS.watch("src-engine", { persistent: true, recursive: true }, (e, filename) => {
            if (EngineStatus.get() !== 'compiling') {
                EngineStatus.set('dirty');
            }
            if (this.recompileInterval) {
                clearInterval(this.recompileInterval);
            }
            this.recompileInterval = setInterval(() => this.recompileEngine(), 3000);
        });


        this.controls.onclick = (e) => {
            var target = e.target;
            var action = target.getAttribute('data-action');
            switch (action) {
                case 'docs':
                    Electron.ipcRenderer.send('control-message', { command: 'view-docs' });
                    break;
                case 'addlibrary':
                    this.addLibrary();
                    break;
                case 'NOSFX':
                case 'NOMUSIC':
                    if (target.classList.contains('off')) {
                        this.setOverride(action, null);
                    } else {
                        this.setOverride(action, true);
                    }
                    break;
            }
        };

        gameLibraries.forEach((d) => {
            let lib = new Library(d);
            this.gameList.appendChild(lib.getEl());
        });
        if (gameLibraries.length === 0) {
            let el = $create(`
                <div class="no-libraries">
                    <p>You haven't added any game libraries yet!</p>
                    <p>Click here to add one!</p>
                </div>
            `);
            el.onclick = () => this.addLibrary();
            this.gameList.appendChild(el);
        }

        // TODO move into Library.js?
        this.gameList.onclick = (e) => {
            var target = e.target;
            while (target && target !== this.gameList && target.tagName.toLowerCase() !== 'li') {
                target = target.parentNode;
            }
            if (!target || target === this.gameList) return;

            GameOverlay.show(target.getAttribute('data-path'));

            // if (this.activeGame && this.activeGame === target) {
            //     this.activeGame.classList.remove('active');
            //     this.activeGame = null;
            // } else {
            //     if (this.activeGame) {
            //         this.activeGame.classList.remove('active');
            //     }
            //     target.classList.add('active');
            //     this.activeGame = target;
            // }
        }

        this.output("Cozy project Manager loaded.\n");
    },

    addLibrary: function() {
        let dp = $create('<input class="directory-picker hidden" type="file" webkitdirectory>');
        dp.onchange = () => {
            let newpath = dp.files[0].path;
            if (gameLibraries.indexOf(newpath) !== -1) {
                alert("You've already got that library loaded!");
                return;
            }
            gameLibraries.push(newpath);
            localStorage.setItem('gameLibraries', JSON.stringify(gameLibraries));

            let lib = new Library(newpath);
            this.gameList.appendChild(lib.getEl());

            if (this.gameList.querySelector('.no-libraries')) {
                this.gameList.removeChild($('.no-libraries'));
            }
        };
        dp.click();
    },

    removeLibrary: function(lib) {
        let index = gameLibraries.indexOf(lib);
        this.gameList.removeChild(lib.getEl());
        gameLibraries.splice(index, 1);
        localStorage.setItem('gameLibraries', JSON.stringify(gameLibraries));
    },

    loadOverrides: function() {
        this.override = JSON.parse(localStorage.getItem('override')) || {};
        for (var k in this.override) {
            this.setOverride(k, this.override[k]);
        }
    },

    setOverride: function(k, v) {
        if (v === null) {
            delete this.override[k];
        } else {
            this.override[k] = v;
        }

        localStorage.setItem('override', JSON.stringify(this.override));

        // reconcile UI
        var el;
        switch (k) {
            case 'NOMUSIC':
            case 'NOSFX':
                el = $('#controls button[data-action=' + k + ']');
                v === null ? el.classList.remove('off') : el.classList.add('off');
                break;
            default:
                break;
        }
    },

    newGameDialog: function(library) {
        return new Promise((resolve, reject) => {
            var dialog = document.createElement('form');
            dialog.innerHTML = `
                <div class="text">New Game in ${library}</div>
                Folder: <input type="text" name="path">
                Name: <input type="text" name="name">
                <div class="buttons">
                    <button class="confirm">OK</button>
                    <button class="cancel">Cancel</button>
                </div>
            `;
            dialog.onsubmit = (e) => {
                e.preventDefault();
            };
            dialog.querySelector('button.confirm').onclick = () => {
                var values = Array.prototype.reduce.call(dialog.querySelectorAll('input'), (accum, input) => {
                    accum[input.getAttribute('name')] = input.value;
                    return accum;
                }, {});
                resolve(values);
                this.dialogContainer.removeChild(dialog);
            }
            dialog.querySelector('button.cancel').onclick = () => {
                reject();
                this.dialogContainer.removeChild(dialog);
            }

            this.dialogContainer.appendChild(dialog);

            dialog.querySelector('input[name=path]').focus();
        });
    },

    prompt: function(text) {
        return new Promise((resolve, reject) => {
            var dialog = document.createElement('form');
            dialog.innerHTML =
                '<div class="text">' + text + '</div>' +
                '<input type="text">' +
                '<div class="buttons">' +
                    '<button class="confirm">OK</button>' +
                    '<button class="cancel">Cancel</button>' +
                '</div>';
            dialog.onsubmit = (e) => {
                e.preventDefault();
            };
            dialog.querySelector('button.confirm').onclick = () => {
                resolve(dialog.querySelector('input').value);
                this.dialogContainer.removeChild(dialog);
            }
            dialog.querySelector('button.cancel').onclick = () => {
                reject();
                this.dialogContainer.removeChild(dialog);
            }

            this.dialogContainer.appendChild(dialog);

            dialog.querySelector('input').focus();
        });
    },

    output: function(...args) {
        var s = '';
        for (let i in args) {
            if (i > 0) s += " ";
            if (args[i] === null) {
                s += "<null>";
            } else if (args[i] === undefined) {
                s += "<undefined>";
            } else if (typeof args[i] === "Object") {
                s += JSON.stringify(args[i]);
            } else {
                s += args[i].toString();
            }
        }
        s = s + "\n";
        this.outputContainer.innerHTML = (this.outputContainer.innerHTML || "") + s;
        this.outputContainer.scrollTop = this.outputContainer.scrollHeight;
    },

    recompileEngine: function() {
        if (EngineStatus.get() === 'compiling') return;
        if (this.recompileInterval) {
            clearTimeout(this.recompileInterval);
            this.recompileInterval = null;
        }

        EngineStatus.set('compiling');

        this.output("");
        return this.buildEngine()
            .then(() => {
                return this.doc(Path.join("src-engine", "Cozy.ts"), Path.join("docs"))
            }, () => {
                if (this.recompileInterval) {
                    return this.recompileEngine();
                } else {
                    EngineStatus.set('error');
                    return Promise.reject();
                }
            })
            .then(() => {
                if (this.recompileInterval !== null) {
                    return this.recompileEngine();
                } else {
                    EngineStatus.set('ready');
                }
            }, () => {
                if (this.recompileInterval !== null) {
                    return this.recompileEngine();
                } else {
                    EngineStatus.set('error');
                }
            });
    },

    fork: function(cmd, params, fparams) {
        return new Promise((resolve, reject) => {
            let forkparams = {
                env: {
                    'ELECTRON_RUN_AS_NODE':true
                },
                stdio: [ 'ignore', 'pipe', 'pipe', 'ipc' ]
            };
            Object.assign(forkparams, fparams);

            let childproc = Child.fork(cmd, params, forkparams);

            childproc.stdout.on('data', (s) => this.output(s.toString().trim()));
            childproc.stderr.on('data', (s) => this.output(s.toString().trim()));
            childproc.on('exit', (returnCode) => returnCode ? reject(returnCode) : resolve());
        })
    },

    buildGame: function(buildPath) {
        let gameconfig;
        try {
            gameconfig = JSON.parse(FS.readFileSync(Path.join(buildPath, "config.json")));
        } catch(e) {
            this.output("<span style='color:red'>[ ERROR (" + e.toString() + ") ]</span>\n");
            return Promise.reject();
        }

        let srcRoot = Path.join(buildPath, gameconfig.main || 'main.ts');
        let displayName = scrub(gameconfig.title ? gameconfig.title + " (" + buildPath + ")" : buildPath);
        this.output("<hr>\n<span style='color:white'>[ Building " + displayName + " ]</span>")

        let tsconfig = {
            compileOnSave: false,
            compilerOptions: {
                removeComments: true,
                sourceMap: false,
                declaration: false,
                target: "ES6",
                module: "commonjs",
                moduleResolution: "Node",
                baseUrl: ".",
                paths: {
                    "Cozy": [Path.resolve(Path.join(IDEDIR, "Cozy.js"))]
                }
            },
            files: [
                Path.resolve(Path.join(IDEDIR, "..", "src-engine", "lib", "electron.d.ts")),
                Path.resolve(Path.join(IDEDIR, "Cozy.d.ts")),
                Path.resolve(srcRoot)
            ]
        };
        let tsconfigPath = Path.join(buildPath, "tsconfig.json");
        FS.writeFileSync(tsconfigPath, JSON.stringify(tsconfig));

        let wpcfg = {
            entry: [
                Path.resolve(Path.join(buildPath, 'main.ts'))
            ],
            externals: {
                Cozy: 'Cozy'
            },
            output: {
                path: Path.resolve(buildPath),
                filename: 'main.js',
                library: 'compiledGame',
                libraryTarget: 'global',
                umdNamedDefine: true
            },
        };

        return this.fork(Path.join(IDEDIR, 'pack'), [ JSON.stringify(wpcfg) ])
            .then(() => {
                this.output(" - Built " + Path.join(buildPath, 'main.js'));
                try {
                    FS.unlinkSync(tsconfigPath);
                    this.output("<span style='color:#0f0'>[ Success ]</span>\n");
                } catch (e) {
                    this.output(e);
                    this.output("<span style='color:red'>[ CLEANUP FAILURE ]</span>\n");
                    return Promise.reject();
                }
                return Promise.resolve();
            }, (errorCode) => {
                if (errorCode === 2) {
                    this.output("Webpack failed to start!");
                }
                this.output("<span style='color:red'>[ BUILD FAILURE ]</span>\n");
                return Promise.reject();
            });
    },

    buildEngine: function() {
        this.output("<hr>\n<span style='color:white'>[ Building core engine ]</span>")

        let cfg = {
            entry: [
                Path.resolve(Path.join('src-engine', 'Cozy.ts'))
            ],
            // devtool: 'source-map',
            output: {
                path: Path.resolve('build'),
                filename: 'cozy-build.js',
                library: 'Cozy',
                libraryTarget: 'global',
                umdNamedDefine: true
            },
            plugins: {
                DTSBundle: {
                    name: 'Cozy',
                    main: 'build/Cozy.d.ts',
                    out: 'cozy-build.d.ts',
                }
            }
        };

        return this.fork(Path.join(IDEDIR, 'pack'), [ JSON.stringify(cfg) ])
            .then(() => {
                this.output(" - Built engine");
                try {
                    FS.renameSync(Path.join('build', 'cozy-build.js'), Path.join(IDEDIR, 'Cozy.js'))
                    FS.renameSync(Path.join('build', 'cozy-build.d.ts'), Path.join(IDEDIR, 'Cozy.d.ts'))
                    // FS.renameSync(Path.join(IDEDIR, 'cozy-build.js.map'), Path.join(IDEDIR, 'Cozy.js.map'))
                    this.output("<span style='color:#0f0'>[ Success ]</span>\n");
                } catch (e) {
                    this.output(e);
                    this.output("<span style='color:red'>[ CLEANUP FAILURE ]</span>\n");
                    return Promise.reject();
                }
                return Promise.resolve();
            }, (errorCode) => {
                if (errorCode === 2) {
                    this.output("Webpack failed to start!");
                }
                this.output("<span style='color:red'>[ BUILD FAILURE ]</span>\n");
                return Promise.reject();
            });
    },

    build: function(buildParams) {
        buildParams.push('--target', 'ES6');
        return this.fork(Path.join('node_modules', 'typescript', 'bin', 'tsc'), buildParams);
    },

    export: function(srcPath, outPath) {
        var config = JSON.parse(FS.readFileSync(Path.join(srcPath, "config.json")));
        var exportConfig = config.export || {};

        delete config.export;

        var displayName = scrub(config.title ? `${config.title} (${srcPath})` : srcPath);

        return new Promise((resolve, reject) => {
            let fail = (e) => {
                this.output(e);
                this.output("<span style='color:red'>[ FAILURE ]</span>\n");
                reject(e);
                throw e;
            }

            var cp = (src, dest, filt) => {
                this.output(`Copy ${src} -> ${dest}`);
                try {
                    FS.copySync(src, dest, {
                        clobber: true,
                        preserveTimestamps: true,
                        filter: filt
                    });
                } catch (e) {
                    fail(e);
                }
            }

            this.output(`<hr>\n<span style="color:white">[ Exporting ${displayName}]</span>`);

            var paths = [
                Path.join(outPath, "resources"),
                Path.join(outPath, "resources", "app"),
                Path.join(outPath, "resources", "app", "lib"),
                Path.join(outPath, "resources", "app", "g")
            ];

            paths.forEach((p) => {
                FS.ensureDir(p)
            });

            FS.readdirSync(ENGINEDIR).forEach((f) => {
                if (!FS.statSync(Path.join(ENGINEDIR, f)).isDirectory()) {
                    if (f === 'cozy.exe' && exportConfig.executable) {
                        cp(Path.join(ENGINEDIR, f), Path.join(outPath, exportConfig.executable + '.exe'));
                    } else {
                        cp(Path.join(ENGINEDIR, f), Path.join(outPath, f));
                    }
                }
            });

            process.noAsar = true; // turn off asar support so it will copy these as files
            FS.readdirSync(Path.join(ENGINEDIR, "resources")).forEach((f) => {
                if (f.match(/.asar$/)) {
                    cp(Path.join(ENGINEDIR, "resources", f), Path.join(outPath, "resources", f));
                }
            });
            process.noAsar = false;

            var appPath = Path.join(ENGINEDIR, "resources", "app");
            var outAppPath = Path.join(outPath, "resources", "app");

            var files = [
                'Cozy.js', 'game.css', 'game.html',
                Path.join('lib','glob.js'),
                Path.join('lib','pixi.min.js'),
            ];

            files.forEach((f) => cp(Path.join(appPath, f), Path.join(outAppPath, f.replace(".min.", "."))));

            // TODO put stuff into the package information; name, version, etc
            cp(Path.join(appPath, 'x_package.json'), Path.join(outAppPath, 'package.json'));

            try {
                config['width'] = config['width'] || 320;
                config['height'] = config['height'] || 240;
                config['title'] = config['title'] || 'Cozy';
                config['fullscreen'] = config['fullscreen'] || false;

                let launchJS = FS.readFileSync(Path.join(appPath, 'x_launch.js')).toString();
                launchJS = launchJS.replace('$$_PARAMS_$$', JSON.stringify(config));
                FS.writeFileSync(Path.join(outAppPath, 'launch.js'), launchJS);
            } catch(e) {
                fail(e);
            }

            var exclude = exportConfig.exclude || [];
            exclude.push(".ts$", ".js.map$");
            for (var i = 0; i < exclude.length; i++) {
                exclude[i] = new RegExp(exclude[i]);
            }

            cp(srcPath, Path.join(outAppPath, "g"), (f) => {
                for (var i = 0; i < exclude.length; i++) {
                    if (f.match(exclude[i])) return false;
                }
                return true;
            });

            this.output("-- Done copying.");

            // TODO more steps?
            //  - uglifyjs
            //  - concat css
            //  - definable steps

            let gameexec = (exportConfig.executable ? exportConfig.executable : 'cozy') + '.exe';
            let editcommands = [
                ['--set-version-string', '"OriginalFilename"', `"${gameexec}"`]
            ];

            if (config.icon) editcommands.push(['--set-icon', Path.join(srcPath, config.icon)]);
            if (exportConfig.copyright) editcommands.push(['--set-version-string', '"LegalCopyright"', `"${exportConfig.copyright}"`]);
            if (config.title) {
                editcommands.push(['--set-version-string', '"ProductName"', `"${config.title}"`]);
                editcommands.push(['--set-version-string', '"FileDescription"', `"${config.title}"`]);
            }
            if (config.version) {
                editcommands.push(['--set-product-version', `"${config.version}"`]);
                editcommands.push(['--set-file-version', `"${config.version}"`]);
            }


            let gameexecpath = Path.join(outPath, gameexec);
            let rcedit = Path.join(ENGINEDIR, 'tool', 'rcedit.exe');
            let command = 0;

            // I'd use execFileSync but you can't capture stderr with that because everything is garbage.
            let doNext = () => {
                if (command >= editcommands.length) {
                    this.output("<span style='color:#0f0'>[ Success ]</span>\n");
                    resolve();
                    return;
                }

                let params = editcommands[command++];
                this.output(`\n> ${rcedit} "${gameexecpath}" ${params.join(' ')}`);
                Child.exec(`"${rcedit}" "${gameexecpath}" ${params.join(' ')}`, (error, stdout, stderr) => {
                    if (stdout) this.output(stdout);
                    if (stderr) this.output(stderr);
                    if (!error) {
                        doNext();
                    } else {
                        fail(error);
                    }
                });
            };
            doNext();
        });
    },

    doc: function(srcPath, outputPath) {
        return new Promise((resolve, reject) => {
            this.output(
                "<span style='color:white'>[ Generating documentation ]</span>\n" +
                " - source:      " + srcPath + "\n" +
                " - destination: " + outputPath
            );

            this.fork(
                Path.join(IDEDIR, 'builddoc'), [
                    '--out', outputPath,
                    '--mode', 'file',
                    '--target', 'ES6',
                    '--name', 'Cozy Engine',
                    // '--includeDeclarations',
                    srcPath, 'src-engine/lib/electron.d.ts'
                ]
            ).then(() => {
                this.output("<span style='color:#0f0'>[ Success ]</span>\n");
                resolve();
            }, (code) => {
                this.output("<span style='color:red'>[ FAILURE (code: " + code + ") ]</span>\n");
                reject(code)
            });
        });
    },

    newGame: function(library) {
        this.newGameDialog(library)
            .then((values) => {
                this.copyTemplate(library, values);
            }, (e) => {
                if (e) {
                    this.output('<span style="color:red">Error: ' + e.toString() + '</span>\n');
                }
            });
    },

    copyTemplate: function(root, args) {
        var name = args.name;
        var path = Path.join(root, args.path);

        return new Promise((resolve, reject) => {
            this.output('');
            this.output('<strong>[ Creating new game, ' + name + ']')
            var templateDir = Path.join(IDEDIR, "game_template");

            if (!FS.existsSync(path)) {
                this.output("Creating", path);
                FS.mkdirSync(path);
            }

            if (FS.existsSync(Path.join(path, "config.json"))) {
                this.output("<span style='color:red'>Cannot initialize a game at " + Path.join(Process.cwd(), path) + ", there's already one there!</span>");
                reject();
            } else {
                var filesToCopy = FS.readdirSync(templateDir);
                filesToCopy.forEach((filename) => {
                    var contents = FS.readFileSync(Path.join(templateDir, filename), { encoding: 'UTF-8' });
                    contents = contents.replace(/\$GAMENAME\$/g, name);
                    contents = contents.replace(/\$GAMEPATH\$/g, args.path);
                    FS.writeFileSync(Path.join(path, filename), contents);
                    this.output("&nbsp; ->", Path.join(path, filename));
                });
                resolve();
            }
        });
    }
};