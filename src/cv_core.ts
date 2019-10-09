import * as dgram from 'dgram';

const PORT = 2000;

export class CV_Core {
    private tram: string;
    private stx: string = '02';
    private etx: string = '03';
    private seq: string = '80';
    private dadd: string = '00';
    private data: string = '';
    private datalen: string = '';
    private time: string = '00';
    private bcc: string = '';
    // Only from host to reader
    private cmd: string = '';
    // Only from reader to host
    private status: string = '';

    protected server = dgram.createSocket({'type' : 'udp4', 'reuseAddr' : true});

    constructor() {}

    setFrame(commandString: string, command: string, data: string, datalen?: string): Buffer {
        this.data = data;

        this.cmd = command;

        if (datalen === undefined) {
            this.datalen = ('0'+commandString.length.toString(16)).slice(-2);
        } else {
            this.datalen = ('0'+datalen).slice(-2);
        }

        this.bcc = this.seq + this.dadd + this.cmd + this.datalen + this.time + this.data;
        let hexArray = Buffer.from(this.bcc, 'hex');
        let bccLength = 0x00;
        hexArray.forEach(element => {
            bccLength = bccLength ^ element;
        });
        this.bcc = ('0'+bccLength.toString(16)).slice(-2);



        const tram = this.stx + this.seq + this.dadd + this.cmd + this.datalen + this.status + this.time + this.data + this.bcc + this.etx;


        return Buffer.from(tram, 'hex');
    }

    sendFrame(ip: string, data: Buffer): any {

        this.server.send(data, 0, data.length, PORT, ip);
    }

    getFrameDetail(frameString: string) {
        let split = frameString.split('');

        let splitFrame = {
            'stx': split[0] + split[1],
            'seq': split[2] + split[3],
            'dadd': split[4] + split[5],
            'datalen': split[6] + split[7],
            'status': split[8] + split[9],
            'data': split.map((val, ind, spl) => { return (ind > 9 && ind < spl.length - 4) ? val : ',' }).toString().replace(/,/gi, ''),
            'bcc': split[split.length - 3] + split[split.length - 4],
            'etx': split[split.length - 2] + split[split.length - 1]
        };
        return splitFrame;
    }

    getFrameCmdDetail(frameString: string) {
        let split = frameString.split('');

        let splitFrame = {
            'stx': split[0] + split[1],
            'seq': split[2] + split[3],
            'dadd': split[4] + split[5],
            'cmd': split[6] + split[7],
            'datalen': split[8] + split[9],
            'time': split[10] + split[11],
            'data': split.map((val, ind, spl) => { return (ind > 11 && ind < spl.length - 4) ? val : ',' }).toString().replace(/,/gi, ''),
            'bcc': split[split.length - 4] + split[split.length - 3],
            'etx': split[split.length - 2] + split[split.length - 1]
        };

        return splitFrame;
    }

    setTime(time: string){
        this.time = time;
    }
}
