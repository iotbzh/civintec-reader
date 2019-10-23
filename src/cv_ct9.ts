import { CV_Core } from "./cv_core";
import { CV_Server, IreaderEvent } from "./cv_server";
import { Observable, Subject, throwError } from "rxjs";
import { map, take, catchError } from "rxjs/operators";
import * as net from 'net';

/**
 *
 *
 * @export
 * @class CV_CT9
 * @extends {CV_Core}
 */
export class CV_CT9 extends CV_Core {

    private ip: string;
    private port: number;
    private serverIp: string;
    private serverPort: number;
    private mode: any;
    public active: boolean = false;
    private socket: any;
    private _readerEvent = new Subject<IreaderEvent>();
    readerEvent$: Observable<IreaderEvent>;
    private server: CV_Server;

    /**
     *Creates an instance of CV_CT9.
     * @param {CV_Server} server
     * @param {string} ip
     * @param {number} port
     * @param {ICVWiegandMode} mode
     * @param {boolean} autoConnect
     * @memberof CV_CT9
     */
    constructor(
        server: CV_Server,
        ip: string,
        port: number,
        mode: any,
        autoConnect: boolean,
        serverIp: string,
        serverPort: number
    ) {
        super();

        this.ip = ip;
        this.port = port;
        this.mode = mode;
        this.serverIp = serverIp;
        this.serverPort = serverPort;
        this.server = server;

        if (autoConnect) {
            this.connect();
        }
        // With this variable, the reader will have access to
        // its own events
        this.readerEvent$ = this._readerEvent.asObservable();

    }

    /**
     * if reader mode disableAutoConnect is false
     * then you can connect ir manually
     *
     * @memberof CV_CT9
     */
    connect() {
        this.socket = net.createConnection({ port: this.serverPort, host: this.ip, localPort: this.port, localAddress: this.serverIp }, () => {
            this.active = true;
        });

        this.socket.on('connect', () => {
            console.log('New reader connection Civintec CT9:' + this.ip + ':' + this.port);
            this.setWiegandMode(this.mode);
        });
        this.socket.on('data', (data: Buffer) => {
            let rinfo = { address: this.ip, port: this.port, size: data.byteLength }
            this._readerEvent.next({ rinfo, data });
            this.server.setCT9ReaderEvent({ rinfo, data });
        });
        this.socket.on('error', (err: any) => {
            this.active = false;
            console.error('this.socket.on(\'error\'). Trying to re connect to Reader ip: ' + this.ip);
            // this.connect();
            // throw err;
        });
    }

    /**
     * Set wiegand mode
     *
     * @param {ICVWiegandMode} mode
     * @returns {*}
     * @memberof CV_CT9
     */
    setWiegandMode(mode: any): any {

        // Set default values
        let wiegandSetting: number[] = [
            0x00, // wiegand_26
            0x01, // indicate the block number for AutoRead
            0x26, // REQUEST mode 0x26 IDLE 0x52 ALL
            0x12, // buzzer 0x13 to bip each time a card is presented

            0x55, // Extra addition not documented
            0xAA, // Extra addition not documented

            0x03, // Key format 0x00 8-bit keypad format 0x01 4-bit keypad format
            0x06, // Output slect
            0x01, // Block number of Wiegand data stored on the ISO15693 card. 0xFF basic mode, output card Inventory.
            0x00, // Card type 0x00 Mifare 1
            0x00,
            0x00,
            0x10,
            0x00,
            0x01,
        ];

        if (mode.multipleBlockMode) {
            wiegandSetting[14] = 0x00;
        }

        // Transformation of wiegandSetting (DATA) into a string frame
        let wiegandFrame = wiegandSetting.map((element) => {
            return ('0' + element.toString(16)).slice(-2);
        }).toString().replace(/,/gi, '');

        // Set the complete buffer frame following the UART protocol
        // example of data returned <Buffer 02 80 00 29 0e 00 00 a7 03>
        const wiegandModeBuf = this.setNormalCommand('CMD_WiegandMode', '18', wiegandFrame, '10');

        this.sendFrame(wiegandModeBuf);
    }

    /**
     * open relay - CMD_GPIO_CARD (Civintec command)
     *
     * @memberof CV_CT9
     */
    open() {
        const openCommand = this.setExtendedCommand('CT_CMD_ Door', '0b', '01', '01', '03', '00');
        this.sendFrame(openCommand);
    }

    /**
     * close relay - CMD_GPIO_CARD (Civintec command)
     *
     * @memberof CV_CT9
     */
    refuse() {
        const closeCommand = this.setExtendedCommand('CT_CMD_ Door', '0b', '01', '00', '03', '00');
        this.sendFrame(closeCommand);
    }

    /**
     * Send the frame command to get the Firmware Version of reader.
     * The answer will be receive through readerEvent$.subscribe()
     * and should be parsed as follows:
     * variable.data.toString('utf-8').replace(/[^\x20-\x7E]/g, '')
     *
     * @memberof CV_CN56
     */
    getFirmwareVersion(): Observable<string> {
        const getVersionNum = this.setExtendedCommand('GetVerNum', '0a', '01', '', '02', '00');
        let seq = this.getSeq();
        this.sendFrame(getVersionNum);
        return this.readerEvent$.pipe(
            take(1),
            map((x: any) => {

                let data = x.data.toString('hex');
                if (this.getNormalFrameDetail(data).seq === seq) {
                    let firmware = x.data.toString('utf-8').replace(/[^\x20-\x7E]/g, '');
                    console.log('Firmware version ' + x.rinfo.address + ': ' + firmware);
                    return firmware;
                }
                throw ('Fail firmware');
            })
        )
    }

    /**
     * Send hexadecimal frame to the reader
     *
     * @param {Buffer} wiegandModeBuf
     * @memberof CV_CT9
     */
    sendFrame(wiegandModeBuf: Buffer): Error {
        try {
            this.socket.write(wiegandModeBuf);
            this.increaseSeq();

        } catch (err) {
            console.error('Problem sending CT9 frame.');
            return err;
        }
    }
}