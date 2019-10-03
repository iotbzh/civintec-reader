"use strict";
exports.__esModule = true;
var CV_Core = /** @class */ (function () {
    function CV_Core() {
        this.stx = '02';
        this.etx = '03';
        this.seq = '80';
        this.dadd = '00';
        this.data = '';
        this.datalen = '';
        this.time = '00';
        this.bcc = '';
        // Only from host to reader
        this.cmd = '';
        // Only from reader to host
        this.status = '';
        this.dgram = require('dgram');
        this.server = this.dgram.createSocket('udp4');
        this.tram = '';
    }
    CV_Core.prototype.setFrame = function (commandString, command, data) {
        this.data = data;
        this.cmd = command;
        this.datalen = ('0' + commandString.length.toString(16)).slice(-2);
        this.bcc = this.seq + this.dadd + this.cmd + this.datalen + this.time + this.data;
        var hexArray = Buffer.from(this.bcc, 'hex');
        var bccLength = 0x00;
        hexArray.forEach(function (element) {
            bccLength = bccLength ^ element;
        });
        this.bcc = bccLength.toString(16);
        this.tram = this.stx + this.seq + this.dadd + this.cmd + this.datalen + this.time + this.data + this.bcc + this.etx;
        return this.tram;
    };
    CV_Core.prototype.getFrameDetail = function (frameString) {
        var split = frameString.split('');
        var splitFrame = {
            'stx': split[0] + split[1],
            'seq': split[2] + split[3],
            'dadd': split[4] + split[5],
            'datalen': split[6] + split[7],
            'status': split[8] + split[9],
            'data': split.map(function (val, ind, spl) { return (ind > 9 && ind < spl.length - 5) ? val : ','; }).toString().replace(/,/gi, ''),
            'bcc': split[split.length - 3] + split[split.length - 4],
            'etx': split[split.length - 2] + split[split.length - 1]
        };
        return splitFrame;
    };
    return CV_Core;
}());
exports.CV_Core = CV_Core;
