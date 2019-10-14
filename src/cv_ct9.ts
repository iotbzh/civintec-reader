import { CV_Core, ICVWiegandMode } from "./cv_core";
import { CV_Server, IreaderEventDgram } from "./cv_server";
import { Observable, Subject } from "rxjs";
import * as net from 'net';

export class CV_CT9 extends CV_Core {

    private ip: string;
    private port: number;
    private mode: ICVWiegandMode;
    private connected: boolean = false;
    socket: any;
    private _readerEvent = new Subject<Buffer>();
    readerEvent$: Observable<Buffer>;

    constructor(
        server: CV_Server,
        ip: string,
        port: number,
        mode: ICVWiegandMode,
        autoConnect?: boolean,
    ) {
        super();

        this.ip = ip;
        this.port = port;
        this.mode = mode;

        if (autoConnect) {
            this.connect();
        }
        // With this variable, the reader will have access to
        // its own events
        this.readerEvent$ = this._readerEvent.asObservable();

    }

    connect() {
        this.socket = net.createConnection({ port: 8888, host: this.ip, localPort: this.port, localAddress: '172.25.50.62' }, () => {
            this.connected = true;
        });

        this.socket.on('connect', () => {
            console.log('New reader connection Civintec CT9:' + this.ip + ':' + this.port);
            this.setWiegandMode(this.mode);
        });
        this.socket.on('data', (data: Buffer) => {
            this._readerEvent.next(data);
        });
        this.socket.on('error', (err: any) => {
            console.log('this.socket.on(\'error\'). Trying to re connect to Reader ip: ' + this.ip);
            // this.connect();
            throw err;
        });
    }

    setWiegandMode(mode: ICVWiegandMode): any {

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

        this.sendFrame(wiegandModeBuf);
    }

    sendFrame(wiegandModeBuf: Buffer) {
        try {
            this.socket.write(wiegandModeBuf);
        } catch (err) {
            console.log('Problem sending CT9 frame.');
            throw err;
        }
    }
}