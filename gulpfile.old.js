var gulp = require('gulp'),
    war = require('gulp-war'),
    zip = require('gulp-zip'),
    concat = require('gulp-concat'),
    clean = require('gulp-rimraf'),
    rename = require("gulp-rename"),
    cssmin = require("gulp-minify-css"),
    csslint = require('gulp-csslint'),
    uglify = require('gulp-uglify'),
    textTransformation = require('gulp-text-simple'),
    //gprompt = require('gulp-prompt'),
    gconfirm = require('gulp-confirm'),
    addSrc = require('gulp-add-src'),
    gulpRun = require('gulp-run'),
    runSequence = require('run-sequence'),
    templateCache = require('gulp-angular-templatecache');
const eslint = require('gulp-eslint');


gulp.task('lintJS', () => {
    // ESLint ignores files with "node_modules" paths.
    // So, it's best to have gulp ignore the directory as well.
    // Also, Be sure to return the stream from the task;
    // Otherwise, the task may end before the stream has finished.
    return gulp.src(['app/src/modules/**/*.js', '!node_modules/**'])
        // eslint() attaches the lint output to the "eslint" property
        // of the file object so it can be used by other modules.
        .pipe(eslint({
            "rules": {
                "eqeqeq": "off",
                //"curly": "error",
                "quotes": ["error", "single"],
                "semi": ["error", "always"],
            }
        }))
        // eslint.format() outputs the lint results to the console.
        // Alternatively use eslint.formatEach() (see Docs).
        .pipe(eslint.format())
        // To have the process exit with an error code (1) on
        // lint error, return the stream and pipe to failAfterError last.
        .pipe(eslint.failAfterError());
});

//BUILDING/minifying

/******** BUILDING CSS files **********/
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

//building by concating and minifying
gulp.task('copyCSS:libs', function () {
    return gulp.src(cssFiles)
        .pipe(concat('styles.min.css'))
        .pipe(cssmin())
        .pipe(gulp.dest('./build/online/styles'));
});

gulp.task('copyCSS', function (cb) {
    return runSequence(
        ['copyCSS:libs'], cb);
});

/******** BUILDING JS files **********/
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


//build jquery and angular
gulp.task('copyJS:jqa', function () {
    return gulp.src(JSFiles.jqa)
        .pipe(concat('jqa.min.js'))
        .pipe(gulp.dest('./build/online/scripts'));
});

//copy ace editor files
gulp.task('copyJS:aceEditorLibs', function () {
    return gulp.src(JSFiles.aceEditorLibs)
        .pipe(gulp.dest('./build/online/scripts'));
});

//build apic library/tester script files
gulp.task('copyJS:apicLibraries', function () {
    return gulp.src(JSFiles.apicLibraries)
        .pipe(uglify())
        .pipe(gulp.dest('./build/online/scripts'));
});

//build thirdparty libs
gulp.task('copyJS:thirdParty', function () {
    return gulp.src(JSFiles.thirdParty)
        .pipe(concat('thirdParty.min.js'))
        .pipe(gulp.dest('./build/online/scripts'));
});

//build apic module scripts
var pwaTransform = textTransformation(function (s) {
    s = s.replace('2.0.0', VERSION);
    s = s.replace('http://localhost:8080', 'https://apic.app');
    s = s.replace('918023175434-lkfap6a7qi47bcje04hno7t7jadd21rd.apps.googleusercontent.com', '918023175434-lkfap6a7qi47bcje04hno7t7jadd21rd.apps.googleusercontent.com');
    return s;
});
gulp.task('copyJS:moduleLibs', function () {
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
});

//combined tesk
gulp.task('copyJS', function (cb) {
    return runSequence(
        //['copyJS:jqa','copyJS:aceEditorLibs', 'copyJS:apicLibraries', 'copyJS:thirdParty','copyJS:moduleLibs'], cb
        'copyJS:jqa', 'copyJS:aceEditorLibs', 'copyJS:apicLibraries', 'copyJS:thirdParty', 'copyJS:moduleLibs', cb);
});

/************ Build index file for app and tester *****************/
var buildIndexFile = function (s) {
    // s = s.replace('<!--BUILD:ACE-config-->', '<script type="text/javascript">ace.config.set("modePath", "online/scripts/");ace.config.set("workerPath", "online/scripts/");</script>');

    s = s.replace('2.0.0', VERSION);
    s = s.replace(/<!--BUILD:CSS-styles-->[^]*<!--BUILD:CSS-styles:End-->/gm, '<link rel="stylesheet" href="styles/styles.min.css" />');
    s = s.replace(/<!--BUILD:CSS-theme-->[^]*<!--BUILD:CSS-theme:End-->/gm, '<link rel="stylesheet" href="styles/theme.min.css" />');

    s = s.replace(/<!--BUILD:JS-thirdparty-->[^]*<!--BUILD:JS-thirdparty:End-->/gm, '<script type="text/javascript" src="scripts/jqa.min.js"></script><script type="text/javascript" src="scripts/thirdParty.min.js"></script><script>ace.config.set("modePath", "/online/scripts/");ace.config.set("workerPath", "/online/scripts/");</script>');
    s = s.replace(/<!--BUILD:JS-apic-->[^]*<!--BUILD:JS-apic:End-->/gm, '<script type="text/javascript" src="scripts/apic-lib.js"></script><script type="text/javascript" src="scripts/apic-proto.js"></script><script type="text/javascript" src="scripts/moduleLibs.min.js"></script><script type="text/javascript" src="templates.js"></script>');

    s = s.replace(/<!--BUILD:Service-Worker-->/gm, '<link rel="manifest" href="/online/manifest.json"><script type="text/javascript" src="swHelper.js"></script>');

    return s;
};
// create the factory with GulpText simple
var VERSION = '';
var indexTransformation = textTransformation(buildIndexFile);

gulp.task('copyIndex:index', function () {
    return gulp.src(['./app/src/index.html'])
        .pipe(indexTransformation())
        .pipe(gulp.dest('./build/online'));
});
gulp.task('copyIndex:tester', function () {
    return gulp.src(['./app/src/modules/tester/tester-build.html'])
        .pipe(rename('tester.html'))
        .pipe(gulp.dest('./build/online/modules/tester'));
});
gulp.task('copyIndex:suitReporter', function () {
    return gulp.src(['./app/src/modules/reports/suitReport.html'])
        .pipe(gulp.dest('./build/online/modules/reports'));
});
gulp.task('copyIndex', function (cb) {
    return runSequence(
        ['copyIndex:index', 'copyIndex:tester', 'copyIndex:suitReporter'], cb);
});

/******** BUILDING HTML Template files **********/
gulp.task('copyHTML', function () {
    return gulp.src(['./app/src/**/*.html', './app/src/*.ico', '!./app/src/index*.html', '!./app/src/modules/tester/tester*.html', '!./app/src/modules/reports/suitReport.html'])
        .pipe(templateCache('templates.js', { module: 'apic' }))
        .pipe(gulp.dest('./build/online'));
});

/******** BUILDING Image files **********/
gulp.task('copyIMG', function () {
    return gulp.src(['./app/src/img/*.*',])
        .pipe(gulp.dest('./build/online/img'));
});

/******** BUILDING Font files **********/
gulp.task('copyFONTS', function () {
    return gulp.src(['./app/src/css/lib/fonts/*.*', './app/src/css/apic-fonts/fonts/*.*', './app/src/css/fonts/*.*'])
        .pipe(gulp.dest('./build/online/styles/fonts'));
});

/******** BUILDING PWA **********/
gulp.task('buildPWA', function () {
    return gulp.src(['./pwaResource/*.*'])
        .pipe(gulp.dest('./build/online'));
});


//Clean task
gulp.task('clean', function () {
    console.log("Clean all files in build folder");
    return gulp.src("build/online/*", {
        read: false
    }).pipe(clean());
});

/************ Main Build task *****************/
gulp.task('build', function (cb) {
    return runSequence(
        'clean', 'copyHTML', 'copyIMG', 'copyFONTS', 'buildPWA', 'copyCSS', 'copyJS', 'copyIndex', cb
        //'copyHTML','copyIMG','copyFONTS','copyCSS:libs', 'copyCSS:themes','copyJS:jqa','copyJS:libs', 'copyJS:scripts', 'copyJS:apicLibs','copyIndex:index', 'copyIndex:tester'
    );
});



function prepareWar(s) {
    s = s.replace('2.0.0', VERSION);
    s = s.replace('http://localhost:8080', 'https://apic.app');
    return s;
}
var prepareWarTransform = textTransformation(prepareWar);

gulp.task('war', function () {
    gulp.src(['./app/src/**/*.js'])
        .pipe(gconfirm({
            question: 'Enter the new version number',
            proceed: function (answer) {
                VERSION = answer;
                return true;
            }
        }))
        .pipe(prepareWarTransform())
        .pipe(addSrc(['./app/src/**/*.*', '!./app/src/**/*.js']))
        .pipe(war({
            welcome: 'index.html',
            displayName: 'APIC Web',
        }))
        .pipe(zip('app.war'))
        .pipe(gulp.dest("./dist"));

});


var zipTransform = textTransformation(function (s) {
    s = s.replace('2.0.0', VERSION);
    s = s.replace('http://localhost:8080', 'https://apic.app');
    s = s.replace('918023175434-lkfap6a7qi47bcje04hno7t7jadd21rd.apps.googleusercontent.com', '293417614661-vst1ugg2merg6pbrt92t4jtja04cp5e2.apps.googleusercontent.com');
    return s;
});

gulp.task('zip', function () {
    gulp.src(['./app/**/*.js', './app/manifest.json', '!./app/node_modules/**/*.*'])
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
        .pipe(gulp.dest("./dist"));

});


var extnTransform = textTransformation(function (s) {
    s = s.replace('2.0.0', VERSION);
    s = s.replace('http://localhost:8080', 'https://apic.app');
    s = s.replace('918023175434-lkfap6a7qi47bcje04hno7t7jadd21rd.apps.googleusercontent.com', '918023175434-66ho6c625p1ut9aectho4ldj57slsnlk.apps.googleusercontent.com');
    return s;
});
gulp.task('extn', function () {
    gulp.src(['./app/src/**/*.js', './extnResources/manifest.json'])
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
        .pipe(gulp.dest("./dist"));

});


gulp.task('extnL', function () {
    gulp.src(['./app/src/**/*.js', './extnResources/manifest.json', './extnResources/background.js'])
        .pipe(addSrc(['./app/src/**/*.*', './extnResources/**/*.*', '!./app/src/**/*.js', '!./extnResources/manifest.json', '!./extnResources/background.js']))
        .pipe(gulp.dest('./build/extn'))
});


function prepareWeb(s) {
    s = s.replace('2.0.0', VERSION);
    s = s.replace('http://localhost:8080', 'https://apic.app');
    return s;
}
gulp.task('web', function () {
    var electronTransform = textTransformation(prepareWeb);
    gulp.src(['./app/**/*.js', './app/**/*.json', '!./app/node_modules/'])
        .pipe(gconfirm({
            question: 'Enter the new version number',
            proceed: function (answer) {
                VERSION = answer;
                return true;
            }
        }))
        .pipe(electronTransform())
        .pipe(addSrc(['./app/**/*.*', '!./app/src/**/*.js', '!./app/**/*.json']))
        .pipe(gulp.dest('./build/web'))
    //.pipe(gulpRun('npm run win', {verbosity:3}))

});


function prepareElectron(s) {
    s = s.replace('2.0.0', VERSION);
    s = s.replace('http://localhost:8080', 'https://apic.app');
    s = s.replace('918023175434-lkfap6a7qi47bcje04hno7t7jadd21rd.apps.googleusercontent.com', '293417614661-s2ht177ioho280k6l8lbpo3n184secpe.apps.googleusercontent.com');
    return s;
}
var electronTransform = textTransformation(prepareElectron);
gulp.task('win', function () {
    gulp.src(['./app/**/*.js', './app/**/*.json', '!./app/node_modules/'])
        .pipe(gconfirm({
            question: 'Enter the new version number',
            proceed: function (answer) {
                VERSION = answer;
                return true;
            }
        }))
        .pipe(electronTransform())
        .pipe(addSrc(['./app/**/*.*', '!./app/src/**/*.js', '!./app/**/*.json']))
        .pipe(gulp.dest('./build/win'))
    //.pipe(gulpRun('npm run win', {verbosity:3}))

});

gulp.task('dnl_war', function () {
    gulp.src(['./build/native/*.exe', './build/native/*.yml', '!./build/native/win-unpacked/**/*.*', '!./build/native/win-ia32-unpacked/**/*.*'])
        .pipe(war({
            welcome: 'index.html',
            displayName: 'APIC Web',
        }))
        .pipe(zip('download.war'))
        .pipe(gulp.dest("./dist"));

});