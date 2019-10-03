export class CV_Core {
    tram: string;
    stx: string = '02';
    etx: string = '03';
    seq: string = '80';
    dadd: string = '00';
    data: string = '';
    datalen: string = '';
    time: string = '00';
    bcc: string = '';
    // Only from host to reader
    cmd: string = '';
    // Only from reader to host
    status: string = '';

    dgram = require('dgram');
    server = this.dgram.createSocket('udp4');

    constructor() {
        this.tram = '';
    }

    setFrame(commandString: string, command: string, data: string) {
        this.data = data;
        this.cmd = command;

        this.datalen = ('0'+commandString.length.toString(16)).slice(-2);


        this.bcc = this.seq + this.dadd + this.cmd + this.datalen + this.time + this.data;
        let hexArray = Buffer.from(this.bcc, 'hex');
        let bccLength = 0x00;
        hexArray.forEach(element => {
            bccLength = bccLength ^ element;
        });
        this.bcc = bccLength.toString(16);

        this.tram = this.stx + this.seq + this.dadd + this.cmd + this.datalen + this.time + this.data + this.bcc + this.etx;
        return this.tram;
    }

    getFrameDetail(frameString: string) {
        let split = frameString.split('');

        let splitFrame = {
            'stx': split[0] + split[1],
            'seq': split[2] + split[3],
            'dadd': split[4] + split[5],
            'datalen': split[6] + split[7],
            'status': split[8] + split[9],
            'data': split.map((val, ind, spl) => { return (ind > 9 && ind < spl.length - 5) ? val : ',' }).toString().replace(/,/gi, ''),
            'bcc': split[split.length - 3] + split[split.length - 4],
            'etx': split[split.length - 2] + split[split.length - 1]
        };
        return splitFrame;
    }
}