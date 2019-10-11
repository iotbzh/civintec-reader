import { CV_Core, ICVWiegandMode } from "./cv_core";
import { CV_Server, IreaderEventDgram } from "./cv_server";
import { Observable, Subject } from "rxjs";
import * as net from 'net';

export class CV_CT9 extends CV_Core{

    private ip: string;
    private port: number;
    private mode: ICVWiegandMode;
    protected socket: any;
    private _readerEvent = new Subject<Buffer>();
    readerEvent$: Observable<Buffer>;

    constructor(
        server: CV_Server,
        ip: string,
        port: number,
        mode: ICVWiegandMode,
        disableAutoConnect?: boolean,
    ) {
        super();

        this.ip = ip;
        this.port = port;
        this.mode = mode;

        if (disableAutoConnect) {
            this.setWiegandMode(mode, true);
        }
        // With this variable, the reader will have access to
        // its own events
        this.readerEvent$ = this._readerEvent.asObservable();
        this.connect();

    }

    connect(){
        // let i1 = Buffer.from('02e07f4f2400008000001a00001a0000001000001100000000100000110000000010000011000000007503', 'hex');
        // let i2 = Buffer.from('02f07f1810000000261255aa0326020000001000017a03', 'hex');
        // let i3 = Buffer.from('02807fee0601000b006001ffffffffffff10006c03', 'hex');
        // let i4 = Buffer.from('02a07f1d0100c303', 'hex');
        // let i5 = Buffer.from('02b07f12020013cc03', 'hex');
        // let open = Buffer.from('02907fec0b00030001010b03', 'hex');
        // let close = Buffer.from('02907fec0b00130001010b03', 'hex');
        this.socket = net.createConnection({ port: 8888, host: this.ip, localPort: this.port, localAddress: '172.25.50.62' }, () => {});

        this.socket.on('connect', () => {
            console.log('New reader connection Civintec CT9:' + this.ip + ':' + this.port);
            // socket.write(i1);
            // socket.write(i2);
            // socket.write(i3);
            // socket.write(i4);
            // socket.write(i5);
        });
        this.socket.on('data', (data: Buffer) => {
            let answer = data.toString('hex');
            console.log('Reader: '+ this.ip + ' data: ' + answer);
        });
        this.socket.on('error', (err: any) => {
            console.log('Hi error!');

            throw err;
        });
    }

    setWiegandMode(mode: ICVWiegandMode, complete: boolean): any {

        // Set default values
        let wiegandSetting: number[] = [
            0x00, // wiegand_26
            0x00, // indicate the block number for AutoRead
            0x26, // REQUEST mode 0x26 IDLE 0x52 ALL
            0x13, // buzzer 0x13 to bip each time a card is presented

            0x55, // Extra addition not documented
            0xAA, // Extra addition not documented

            0x00, // Key format 0x00 8-bit keypad format 0x01 4-bit keypad format
            0x2E, // Output slect
            0xFF, // Block number of Wiegand data stored on the ISO15693 card. 0xFF basic mode, output card Inventory.
            0x00, // Card type 0x00 Mifare 1
            0x00,
            0x00,
            0x00,
        ];
        '0000261255aa030200000000100001'

        // Set values from ICVWiegandMode param
        if (mode.cardBlockNumber) {
            wiegandSetting[1] = Number(mode.cardBlockNumber.toString(16));
        }

        // Transformation of wiegandSetting (DATA) into a string frame
        let wiegandFrame = wiegandSetting.map((element) => {
            return ('0' + element.toString(16)).slice(-2);
        }).toString().replace(/,/gi, '');

        // Set the complete buffer frame following the UART protocol
        // example of data returned <Buffer 02 80 00 29 0e 00 00 a7 03>
        const wiegandModeBuf = this.setNormalFrame('CMD_WiegandMode', '18', wiegandFrame);

        // this.sendFrame(this.ip, this.port, wiegandModeBuf);
    }
}