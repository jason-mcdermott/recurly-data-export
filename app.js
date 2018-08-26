const https = require('https')
const url = require('url')
const fs = require('fs')
const zlib = require('zlib')
const parser = require('xml2json')
const moment = require('moment')
const config = require('./config')

let options = {
    port: 443,
    headers: {
        'Accept': 'application/xml',
        'Authorization': `Basic ${config.settings.API_KEY}`,
        'X-Api-Version': `${config.settings.API_VER}`
    }
};

let runDate = moment().format("YYYY-MM-DD");
let params = process.argv[2];
if(params){
    runDate = params;
}

(function process () {
    
    options.path = `/v2/export_dates/${runDate}/export_files`;
    options.host = `${config.settings.RECURLY_DOMAIN}`;

    https.get(options, 
        res => {
            res.setEncoding("utf8");
            let body = "";
            res.on("data", data => {
                body += data;
            }).on("end", () => {
                let json = parser.toJson(body);
                let data = JSON.parse(json);
                let urls = [];
                data.export_files.export_file.forEach(x => urls.push(x.href));
                getS3Links(urls, function(err){ console.log(err); });
            }).on("error", (err) => {
                console.log(err);
            });
          }).on("error", (err) => {
                console.log(err);
        });
}());

// get S3 download links
function getS3Links(urls, callback) {
    
    urls.forEach(x => {
        let link = url.parse(x);
        let segments = link.path.split('/');
        let fileName = `${segments[3]}_${segments[5].substring(0, segments[5].length - 3)}`;

        options.host = link.host;
        options.path = link.path;

        https.get(options,
            res => {
                res.setEncoding("utf8");
                let body = "";
                res.on("data", data => {
                    body += data;
                }).on("end", () => {
                    let json = parser.toJson(body);
                    let data = JSON.parse(json);
                    downloadGzippedData(data.export_file.download_url, function (err, data) {
                        fs.writeFile(fileName, data, "utf8", function (err) { if (err) console.log(err); });
                    });
                }).on("error", (e) => {
                    callback(e);
                });
            }).on("error", (e) => {
                callback(e);
            });
    });
}

// download gzipped data and decompress and save deflated data files
function downloadGzippedData(s3url, callback) {
    
    let link = url.parse(s3url);
    var buffer = [];

    https.get({
        host: link.host,
        port: 443,
        path: link.path,
        method: 'GET',
    }, function (res) {
        // pipe the response into the gunzip to decompress
        var gunzip = zlib.createGunzip();
        res.pipe(gunzip);

        gunzip.on('data', (data) => {
            // decompression chunk ready, add it to the buffer
            buffer.push(data.toString());
        }).on("end", () => {
            // response and decompression complete, join the buffer and return
            callback(null, buffer.join(""));
        }).on("error", (e) => {
            callback(e);
        });
    }).on('error', (e) => {
        callback(e);
    });
}