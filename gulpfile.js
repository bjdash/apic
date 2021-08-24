//@ts-check
var gulp = require('gulp'),
    del = require('del'),
    zip = require('gulp-zip'),
    bump = require('gulp-bump'),
    args = require('yargs').argv,
    gulpGit = require('gulp-git'),
    textTransformation = require('gulp-text-simple'),
    run = require('gulp-run');


//Build extn for local
var buildExtnLocal = {
    clean: function () {
        return del(['./dist/extnLocal']);
    },
    build: function () {
        //@ts-ignore
        return run('ng build --configuration=extnLocal --base-href=index.html --output-path=dist/extnLocal --stats-json', { verbosity: 2 }).exec();
    },
    copyExtnFiles: function () {
        return gulp.src(['./platform_files/extension/*.*'])
            .pipe(gulp.dest('./dist/extnLocal'))
    },
    devTools: function () {
        return gulp.src(['./platform_files/extension/devtools/*.*'])
            .pipe(gulp.dest('./dist/extnLocal/devtools'))
    },
    copyDevtoolsSrc: function () {
        return gulp.src(['./dist/devtools-temp/build/**/*.*', '!./dist/devtools-temp/dist/asset-manifest.json', '!./dist/devtools-temp/dist/service-worker.js', '!./dist/devtools-temp/build/precache-manifest*.*'])
            .pipe(gulp.dest('./dist/extnLocal/devtools'))
    }
}
//END: Build extn for local


//Build chrome extension
var buildExtn = {
    clean: function () {
        return del(['./dist/extn']);
    },
    build: function () {
        //@ts-ignore
        return run('ng build --prod --configuration=extn --base-href=index.html --output-path=dist/extn --stats-json --source-map=false', { verbosity: 2 }).exec();
    },
    copyExtnFiles: function () {
        return gulp.src(['./platform_files/extension/*.*'])
            .pipe(gulp.dest('./dist/extn'))
    },
    devTools: function () {
        return gulp.src(['./platform_files/extension/devtools/*.*'])
            .pipe(gulp.dest('./dist/extn/devtools'))
    },
    copyDevtoolsSrc: function () {
        return gulp.src(['./dist/devtools-temp/build/**/*.*', '!./dist/devtools-temp/dist/asset-manifest.json', '!./dist/devtools-temp/dist/service-worker.js', '!./dist/devtools-temp/build/precache-manifest*.*'])
            .pipe(gulp.dest('./dist/extn/devtools'))
    },
    zip: function () {
        return gulp.src('./dist/extn/**/*.*')
            .pipe(zip('extn.zip'))
            .pipe(gulp.dest("./dist"));
    }
}
//END: Build chrome extension

//Electron
let updateBase = textTransformation(function (s) {
    s = s.replace('<base href="/">', '<base href="./">');
    return s;
}, {})
var electron = {
    cleanElectron: function () {
        return del(['./dist/win', './dist/native']);
    },
    copyJs: function () {
        return gulp.src(['./platform_files/electron/*.*'])
            .pipe(gulp.dest('./dist/win'))
    },
    updateBase: function () {
        return gulp.src(['./dist/win/index.html'])
            .pipe(updateBase())
            .pipe(gulp.dest('./dist/win'))
    },

}
//END: Electtron

var devTools = {
    cleanDevTools: function () {
        return del(['./dist/devtools-temp']);
    },
    cloneDevtools: function () {
        return gulpGit.clone('https://github.com/bjdash/apic-devtools.git', { args: './dist/devtools-temp' });
    },

}

exports.cleanExtnLocal = gulp.series(
    buildExtnLocal.clean,
    devTools.cleanDevTools,
);
exports.buildExtnLocal = gulp.series(
    buildExtnLocal.copyExtnFiles,
    buildExtnLocal.devTools,
    devTools.cloneDevtools,
    buildExtnLocal.copyDevtoolsSrc,
    devTools.cleanDevTools
);

exports.cleanExtn = gulp.series(
    buildExtn.clean,
    devTools.cleanDevTools,
);
exports.buildExtn = gulp.series(
    buildExtn.copyExtnFiles,
    buildExtn.devTools,
    devTools.cloneDevtools,
    buildExtn.copyDevtoolsSrc,
    devTools.cleanDevTools,
    buildExtn.zip
);

exports.cleanElectron = gulp.series(
    electron.cleanElectron
)
exports.buildElectron = gulp.series(
    electron.copyJs,
    electron.updateBase
)

exports.bump = function () {
    /// <summary>
    /// It bumps revisions
    /// Usage:
    /// 1. gulp bump : bumps the package.json and bower.json to the next minor revision.
    ///   i.e. from 0.1.1 to 0.1.2
    /// 2. gulp bump --version 1.1.1 : bumps/sets the package.json and bower.json to the 
    ///    specified revision.
    /// 3. gulp bump --type major       : bumps 1.0.0 
    ///    gulp bump --type minor       : bumps 0.1.0
    ///    gulp bump --type patch       : bumps 0.0.2
    ///    gulp bump --type prerelease  : bumps 0.0.1-2
    /// </summary>
    var type = args.type;
    var version = args.version;
    var options = {};
    if (version) {
        options.version = version;
    } else {
        options.type = type;
    }


    return gulp
        .src(['./package.json', './platform_files/extension/manifest.json', './platform_files/electron/package.json'], { base: './' })
        //@ts-ignore
        .pipe(bump(options))
        .pipe(gulp.dest('./'));
}