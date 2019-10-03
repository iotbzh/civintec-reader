import dgram = require('dgram');
import {Observable} from 'rxjs';

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

    protected server = dgram.createSocket('udp4');

    constructor() {
    }

    setFrame(commandString: string, command: string, data: string): Buffer {
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

        const tram = this.stx + this.seq + this.dadd + this.cmd + this.datalen + this.time + this.data + this.bcc + this.etx;
        return Buffer.from(tram, 'hex');
    }

    sendFrame(ip: string, data: Buffer): Observable<any> {
        return Observable.create((obs: any) => {
            this.server.on('message', (dataSvr, sender) => {
                // pass this information on for further processing?
                obs.onNext({
                    dataSvr,
                    sender,
                });
                obs.onCompleted();  // close this observable so `.concat` switches to next request.
            });

            this.server.send(data, 0, data.length, PORT, ip);
        });
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
