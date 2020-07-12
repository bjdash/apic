//@ts-check
var gulp = require('gulp'),
    zip = require('gulp-zip'),
    concat = require('gulp-concat'),
    cssmin = require("gulp-minify-css"),
    uglify = require('gulp-uglify'),
    textTransformation = require('gulp-text-simple'),
    gconfirm = require('gulp-confirm'),
    addSrc = require('gulp-add-src'),
    del = require('del'),
    templateCache = require('gulp-angular-templatecache');

var VERSION = ''


//Build extn for local
var buildExtnL = {
    clean: function () {
        return del(['./build/extnL']);
    },
    build: function () {
        return gulp.src(['./app/src/**/*.js', './extnResources/manifest.json', './extnResources/background.js'])
            .pipe(addSrc(['./app/src/**/*.*', './extnResources/**/*.*', '!./app/src/**/*.js', '!./extnResources/manifest.json', '!./extnResources/background.js']))
            .pipe(gulp.dest('./build/extnL'))
    }
}


var extnL = gulp.series(buildExtnL.clean, buildExtnL.build);
//END: Build extn for local


//Build chrome extension
var extnTransform = textTransformation(function (s) {
    s = s.replace('2.0.0', VERSION);
    s = s.replace('http://localhost:8080', 'https://apic.app');
    s = s.replace('918023175434-lkfap6a7qi47bcje04hno7t7jadd21rd.apps.googleusercontent.com', '918023175434-66ho6c625p1ut9aectho4ldj57slsnlk.apps.googleusercontent.com');
    return s;
}, {});

function buildExtn() {
    return gulp.src(['./app/src/**/*.js', './extnResources/manifest.json'])
        .pipe(gconfirm({
            question: 'Enter the new version number',
            proceed: function (answer) {
                VERSION = answer;
                return true;
            }
        }))
        .pipe(extnTransform())
        .pipe(addSrc(['./app/src/**/*.*', './extnResources/**/*.*', '!./app/src/**/*.js', './extnResources/background.js', '!./extnResources/manifest.json']))
        .pipe(zip('extn.zip'))
        .pipe(gulp.dest("./build"));
}
var extn = gulp.series(buildExtn);
//END: Build chrome extension


//Build Chrome App
var zipTransform = textTransformation(function (s) {
    s = s.replace('2.0.0', VERSION);
    s = s.replace('http://localhost:8080', 'https://apic.app');
    s = s.replace('918023175434-lkfap6a7qi47bcje04hno7t7jadd21rd.apps.googleusercontent.com', '293417614661-vst1ugg2merg6pbrt92t4jtja04cp5e2.apps.googleusercontent.com');
    return s;
}, {});

function buildChromeApp() {
    return gulp.src(['./app/**/*.js', './app/manifest.json', '!./app/node_modules/**/*.*'])
        .pipe(gconfirm({
            question: 'Enter the new version number',
            proceed: function (answer) {
                VERSION = answer;
                return true;
            }
        }))
        .pipe(zipTransform())
        .pipe(addSrc(['./app/**/*.*', '!./app/node_modules/**/*.*', '!./app/**/*.js', '!./app/manifest.json']))
        //gulp.src()
        .pipe(zip('app.zip'))
        .pipe(gulp.dest("./build"));
}

var chromeApp = gulp.series(buildChromeApp);
//END: Build Chrome App


//Build for web app
function cleanWebApp() {
    return del(['./build/web']);
}
var webAppTransform = textTransformation(function (s) {
    s = s.replace('2.0.0', VERSION);
    s = s.replace('http://localhost:8080', 'https://apic.app');
    return s;
}, {});

function buildWeb() {
    return gulp.src(['./app/**/*.js', './app/**/*.json', '!./app/node_modules/'])
        .pipe(gconfirm({
            question: 'Enter the new version number',
            proceed: function (answer) {
                VERSION = answer;
                return true;
            }
        }))
        .pipe(webAppTransform())
        .pipe(addSrc(['./app/**/*.*', '!./app/src/**/*.js', '!./app/**/*.json']))
        .pipe(gulp.dest('./build/web'))
}
var webApp = gulp.series(cleanWebApp, buildWeb);
//END: Build for web app


//Build for electron App
function cleanWin() {
    return del(['./build/win']);
}

var electronTransform = textTransformation(function prepareElectron(s) {
    s = s.replace('2.0.0', VERSION);
    s = s.replace('http://localhost:8080', 'https://apic.app');
    s = s.replace('918023175434-lkfap6a7qi47bcje04hno7t7jadd21rd.apps.googleusercontent.com', '293417614661-s2ht177ioho280k6l8lbpo3n184secpe.apps.googleusercontent.com');
    return s;
}, {});

function buildWin() {
    return gulp.src(['./app/**/*.js', './app/**/*.json', '!./app/node_modules/'])
        .pipe(gconfirm({
            question: 'Enter the new version number',
            proceed: function (answer) {
                VERSION = answer;
                return true;
            }
        }))
        .pipe(electronTransform())
        .pipe(addSrc(['./app/**/*.*', '!./app/src/**/*.js', '!./app/**/*.json']))
        .pipe(gulp.dest('./build/win'));

};
var winApp = gulp.series(cleanWin, buildWin);
//END: Build for electron App


//Build for web app minified
var JSFiles = {
    jqa: ['./app/src/js/lib/jquery.min.js', './app/src/js/lib/angular.min.js'],
    aceEditorLibs: ['./app/src/js/bower_components/ace-builds/src-min-noconflict/**/*.js'],
    apicLibraries: ['./app/src/modules/apic-lib.js', './app/src/modules/apic-proto.js', './app/src/modules/tester/tester.js', './app/src/js/lib/ajv.bundle.js', './app/src/js/lib/chai.min.js'],
    thirdParty: [
        './app/src/js/lib/intro.min.js',
        './app/src/js/lib/md5.js',
        './app/src/js/lib/hmac-sha1.js',
        './app/src/js/lib/hmac-sha256.js',
        './app/src/js/lib/enc-base64.min.js',
        './app/src/js/lib/sockjs.min.js',
        './app/src/js/lib/stomp.min.js',
        './app/src/js/lib/js-yaml.min.js',
        './app/src/js/lib/jquery-ui.min.js',
        './app/src/js/lib/angular-sanitize.js',
        './app/src/js/lib/ui-bootstrap-custom-tpls-2.1.4.min.js',
        './app/src/js/lib/angular-ui-router.js',
        './app/src/js/lib/ct-ui-router-extras.min.js',
        './app/src/js/lib/jsonViewer/jsonviewer.js',
        './app/src/js/lib/angular-indexedDB/angular-indexed-db.js',
        './app/src/js/lib/angular-confirm.js',
        './app/src/js/lib/ng-sortable.js',
        './app/src/js/lib/mousetrap.min.js',
        './app/src/js/lib/swagger-parser.min.js',
        './app/src/js/lib/json-formatter.js',
        './app/src/js/lib/json-schema-view.js',
        './app/src/js/lib/ajv.min.js',
        './app/src/js/lib/oauth.js',
        './app/src/js/lib/hawk.js',
        './app/src/js/lib/schema-faker-en.js',
        './app/src/modules/SchemaDref.js',
        './app/src/js/lib/socket.io.slim.js',
        './app/src/js/bower_components/ace-builds/src-min-noconflict/ace.js',
        './app/src/js/bower_components/ace-builds/src-min-noconflict/ext-language_tools.js',
        './app/src/js/bower_components/angular-ui-ace/ui-ace.min.js',
        './app/src/js/lib/toaster/angular-toastr.tpls.min.js',
        './app/src/js/lib/vkbeautify.js',
        './app/src/js/lib/js-schema.min.js'
    ],
    moduleLibs: [
        './app/src/modules/JsonSchemeEditor/jsonSchema.js',
        './app/src/modules/app.js',
        './app/src/apic-electron-handler.js',
        './app/src/modules/services.js',
        './app/src/modules/Constants.js',
        './app/src/modules/directives.js',
        './app/src/modules/filters.js',
        './app/src/modules/FileSystem.js',
        './app/src/modules/Validator.js',
        './app/src/modules/Runner.js',
        './app/src/modules/directives/treeSelector/treeSelector.js',
        './app/src/modules/home/home-module.js',
        './app/src/modules/rootController.js',
        './app/src/modules/home/home-controller.js',
        './app/src/modules/home/tab-req-controller.js',
        './app/src/modules/home/tab-suit-controller.js',
        './app/src/modules/home/tab-folder-controller.js',
        './app/src/modules/home/tab-socket-controller.js',
        './app/src/modules/leftMenu/left-menu-controller.js',
        './app/src/modules/moduleServices.js',
        './app/src/modules/environments/env-controller.js',
        './app/src/modules/settings/settings-controller.js',
        './app/src/modules/login/login-controller.js',
        './app/src/modules/designer/designer-controller.js',
        './app/src/modules/docs/docsHome-controller.js',
        './app/src/modules/docs/docs-controller.js',
        './app/src/modules/dashboard/dashboard-controller.js',
        './app/src/modules/dashboard/publishedDocs/pdocs-controller.js',
        './app/src/modules/dashboard/team/team-controller.js',
        './app/src/modules/dashboard/account/account-controller.js',
        './app/src/modules/designer/project-info/project-info-modal-controller.js',
        './app/src/modules/tagEditor/ngTagEditor.js',
    ]
}
var cssFiles = [
    'app/src/css/lib/bootstrap-paper.css',
    'app/src/js/lib/jsonViewer/jsonviewer.css',
    'app/src/css/styles.css',
    'app/src/css/apic-fonts/style.css',
    'app/src/css/envModal.css',
    'app/src/css/tests.css',
    'app/src/css/suit-tab.css',
    'app/src/css/menuModal.css',
    'app/src/css/loader.css',
    'app/src/css/login.css',
    'app/src/css/designer.css',
    'app/src/css/docs.css',
    'app/src/css/dashboard.css',
    'app/src/css/json-formatter.css',
    'app/src/css/json-schema-view.css',
    'app/src/modules/directives/treeSelector/treeSelector.css',
    'app/src/modules/JsonSchemeEditor/jsonSchema.css',
    'app/src/modules/tagEditor/ngTagEditor.css',
    'app/src/js/lib/toaster/angular-toastr.min.css'
];
var pwaTransform = textTransformation(function (s) {
    s = s.replace('2.0.0', VERSION);
    s = s.replace('http://localhost:8080', 'https://apic.app');
    s = s.replace('918023175434-lkfap6a7qi47bcje04hno7t7jadd21rd.apps.googleusercontent.com', '918023175434-lkfap6a7qi47bcje04hno7t7jadd21rd.apps.googleusercontent.com');
    return s;
}, {});

var indexTransformation = textTransformation(function (s) {
    // s = s.replace('<!--BUILD:ACE-config-->', '<script type="text/javascript">ace.config.set("modePath", "online/scripts/");ace.config.set("workerPath", "online/scripts/");</script>');
    s = s.replace('2.0.0', VERSION);
    s = s.replace(/<!--BUILD:CSS-styles-->[^]*<!--BUILD:CSS-styles:End-->/gm, '<link rel="stylesheet" href="styles/styles.min.css" />');
    s = s.replace(/<!--BUILD:CSS-theme-->[^]*<!--BUILD:CSS-theme:End-->/gm, '<link rel="stylesheet" href="styles/theme.min.css" />');

    s = s.replace(/<!--BUILD:JS-thirdparty-->[^]*<!--BUILD:JS-thirdparty:End-->/gm, '<script type="text/javascript" src="scripts/jqa.min.js"></script><script type="text/javascript" src="scripts/thirdParty.min.js"></script><script>ace.config.set("modePath", "/online/scripts/");ace.config.set("workerPath", "/online/scripts/");</script>');
    s = s.replace(/<!--BUILD:JS-apic-->[^]*<!--BUILD:JS-apic:End-->/gm, '<script type="text/javascript" src="scripts/apic-lib.js"></script><script type="text/javascript" src="scripts/apic-proto.js"></script><script type="text/javascript" src="scripts/moduleLibs.min.js"></script><script type="text/javascript" src="templates.js"></script>');

    // s = s.replace(/<!--BUILD:Service-Worker-->/gm, '<link rel="manifest" href="/online/manifest.json"><script type="text/javascript" src="swHelper.js"></script>');

    return s;
}, {});
var testerIndexTransform = textTransformation(function (s) {
    return s.replace('src="../apic-lib.js"', 'src="../../scripts/apic-lib.js"')
        .replace('src="../apic-proto.js"', 'src="../../scripts/apic-lib.js"')
        .replace('src="../../js/lib/chai.min.js"', 'src="../../scripts/chai.min.js"')
        .replace('src="../../js/lib/ajv.bundle.js"', 'src="../../scripts/ajv.bundle.js"')
        .replace('src="tester.js"', 'src="../../scripts/tester.js"');
}, {});

var buildWebMin = {
    clean: function () {
        return del(['./build/online']);
    },
    copyHTML: function () {
        return gulp.src(['./app/src/**/*.html', '!./app/src/*.ico', '!./app/src/index*.html', '!./app/src/modules/tester/tester*.html', '!./app/src/modules/reports/suitReport.html'])
            .pipe(templateCache('templates.js', {
                module: 'apic',
                transformUrl: function (url) {
                    return url.replace('\\modules\\', 'modules\\').replace('/modules/', 'modules/');
                }
            }))
            .pipe(gulp.dest('./build/online'));
    },
    copyIMG: function () {
        return gulp.src(['./app/src/img/*.*',])
            .pipe(gulp.dest('./build/online/img'));

    },
    copyFONTS: function () {
        return gulp.src(['./app/src/css/lib/fonts/*.*', './app/src/css/apic-fonts/fonts/*.*', './app/src/css/fonts/*.*'])
            .pipe(gulp.dest('./build/online/styles/fonts'));
    },
    copyCSS: function () {
        return gulp.src(cssFiles)
            .pipe(concat('styles.min.css'))
            .pipe(cssmin())
            .pipe(gulp.dest('./build/online/styles'));
    },
    copyJS_jqa: function () {
        return gulp.src(JSFiles.jqa)
            .pipe(concat('jqa.min.js'))
            .pipe(gulp.dest('./build/online/scripts'));
    },
    copyJS_aceEditorLibs: function () {
        return gulp.src(JSFiles.aceEditorLibs)
            .pipe(gulp.dest('./build/online/scripts'));
    },
    copyJS_apicLibraries: function () {
        return gulp.src(JSFiles.apicLibraries)
            .pipe(uglify())
            .pipe(gulp.dest('./build/online/scripts'));
    },
    copyJS_thirdParty: function () {
        return gulp.src(JSFiles.thirdParty)
            .pipe(concat('thirdParty.min.js'))
            .pipe(gulp.dest('./build/online/scripts'));
    },
    copyJS_moduleLibs: function () {
        return gulp.src(JSFiles.moduleLibs)
            .pipe(gconfirm({
                question: 'Enter the new version number',
                proceed: function (answer) {
                    VERSION = answer;
                    return true;
                }
            }))
            .pipe(pwaTransform())
            .pipe(concat('moduleLibs.min.js'))
            // .pipe(uglify())
            .pipe(gulp.dest('./build/online/scripts'));
    },
    copyIndex_index: function () {
        return gulp.src(['./app/src/index.html'])
            .pipe(indexTransformation())
            .pipe(gulp.dest('./build/online'));
    },
    copyIndex_tester: function () {
        return gulp.src(['./app/src/modules/tester/tester.html'])
            .pipe(testerIndexTransform())
            .pipe(gulp.dest('./build/online/modules/tester'));
    },
    copyIndex_suitReporter: function () {
        return gulp.src(['./app/src/modules/reports/suitReport.html'])
            .pipe(gulp.dest('./build/online/modules/reports'));
    }
}

var copyJS = gulp.parallel(
    buildWebMin.copyJS_jqa,
    buildWebMin.copyJS_aceEditorLibs,
    buildWebMin.copyJS_apicLibraries,
    buildWebMin.copyJS_thirdParty,
    buildWebMin.copyJS_moduleLibs
);
var copyIndex = gulp.parallel(
    buildWebMin.copyIndex_index,
    buildWebMin.copyIndex_suitReporter,
    buildWebMin.copyIndex_tester
);

var webAppMin = gulp.series(
    buildWebMin.clean,
    buildWebMin.copyHTML,
    buildWebMin.copyIMG,
    buildWebMin.copyFONTS,
    buildWebMin.copyCSS,
    copyJS,
    copyIndex
);

//END: Build for web app minified


exports.extnL = extnL;
exports.extn = extn;
exports.chromeApp = chromeApp;
exports.web = webApp;
exports.win = winApp;
exports.webMin = webAppMin