//@ts-check
var gulp = require('gulp'),
    del = require('del'),
    zip = require('gulp-zip'),
    gulpGit = require('gulp-git'),
    run = require('gulp-run');


//Build extn for local
var buildExtnLocal = {
    clean: function () {
        return del(['./dist/extnLocal']);
    },
    build: function () {
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
    devTools.cleanDevTools
);

// exports.extnLocal = gulp.series(
//     buildExtnLocal.clean,
//     buildExtnLocal.cleanDevTools,
//     buildExtnLocal.build,
//     buildExtnLocal.copyExtnFiles,
//     buildExtnLocal.devTools,
//     buildExtnLocal.cloneDevtools,
//     buildExtnLocal.copyDevtoolsSrc,
//     buildExtnLocal.cleanDevTools
// );
// exports.extn = gulp.series(
//     buildExtn.clean,
//     devTools.cleanDevTools,
//     buildExtn.build,
//     buildExtn.copyExtnFiles,
//     buildExtn.devTools,
//     devTools.cloneDevtools,
//     buildExtn.copyDevtoolsSrc,
//     devTools.cleanDevTools,
//     buildExtn.zip
// );