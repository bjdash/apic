const testFolder = './build/online/';
const fs = require('fs');

var walkSync = function (dir, filelist) {
    var fs = fs || require('fs'),
        files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function (file) {
        if (fs.statSync(dir + file).isDirectory()) {
            filelist = walkSync(dir + file + '/', filelist);
        }
        else if(file.indexOf('sw.js')<0){
            filelist.push(dir.replace('./build', '')+file);
        }
    });
    return filelist;
};

console.log(walkSync(testFolder, []))