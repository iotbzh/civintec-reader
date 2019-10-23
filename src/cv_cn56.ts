import { CV_Core, ICVWiegandMode } from "./cv_core";
import { CV_Server, IreaderEvent } from "./cv_server";
import { Observable, Subject } from "rxjs";
import * as dgram from 'dgram';
import { AddressInfo } from "net";

/**
 * CV_CN56 class containing the functions to manage the reader
 *
 * @export
 * @class CV_CN56
 * @extends {CV_Core}
 */
export class CV_CN56 extends CV_Core {

    private ip: string;
    private port: number;
    private serverIp: string;
    private serverPort: number;
    private mode: ICVWiegandMode;
    public active: boolean = false;
    private _readerEvent = new Subject<IreaderEvent>();
    readerEvent$: Observable<IreaderEvent>;
    private socket = dgram.createSocket({ 'type': 'udp4', 'reuseAddr': true });
    private server: CV_Server;

    /**
     * Creates an instance of CV_CN56.
     * @param {CV_Server} server
     * @param {string} ip
     * @param {ICVWiegandMode} mode
     * @param {boolean} [disableAutoConnect] if 'true' reader is set in wiegand mode
     * @memberof CV_CN56
     */
    constructor(
        server: CV_Server,
        ip: string,
        port: number,
        mode: ICVWiegandMode,
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
     * @memberof CV_CN56
     */
    connect() {

        /**
         * Bound the server with the ip address and port
         */
        this.socket.bind({
            address: this.serverIp,
            port: this.serverPort,
            exclusive: true,
        });
        /**
         * Once server is bound we check it is working
         */
        this.socket.on('listening', () => {
            var address = <AddressInfo>this.socket.address();
            console.log('Listening on UPD for Civintec reader model CN56 ['+this.ip+'] on', address.address + ':' + address.port);
        });

        /**
         * Once server is bound we set the 'listening events' function
         */
        this.socket.on('message', (data, rinfo) => {
            // Send data to the general server subscribe()
            // to have all the readers activity
            this.server.setCN56ReaderEvent({ data, rinfo });
        });

        /**
         * Set wiegand mode
         */
        this.setWiegandMode(this.mode, true);
    }

    /**
     * Set wiegand mode
     *
     * @param {ICVWiegandMode} mode
     * @param {boolean} complete
     * @returns {*}
     * @memberof CV_CN56
     */
    setWiegandMode(mode: ICVWiegandMode, complete: boolean): any {

        // Set default values
        let wiegandSetting: number[] = [
            0x00, // wiegand_26
            0x00, // indicate the block number for AutoRead
            0x26, // REQUEST mode 0x26 IDLE 0x52 ALL
            0x10, // buzzer 0x13 to bip each time a card is presented

            0x55, // Extra addition not documented
            0xAA, // Extra addition not documented

            0x00, // Key format 0x00 8-bit keypad format 0x01 4-bit keypad format
            0x2E, // Output select
            0xFF, // Block number of Wiegand data stored on the ISO15693 card. 0xFF basic mode, output card Inventory.
            0x00, // Card type 0x00 Mifare 1
            0x00,
            0x00,
            0x00,
        ];

        // Two non documented frames necessary to set the wiegandmode
        let fixFrame1 = Buffer.from('02a00046030060008503', 'hex');
        let fixFrame2 = Buffer.from('02b0004709006000ffffffffffff9e03', 'hex');

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
        const wiegandModeBuf = this.setNormalCommand('CV_WiegandMode', '18', wiegandFrame);

        // if @param {boolean} complete is set to false
        // it will send only the wiegandmode frame
        if (!complete) {
            this.sendFrame(this.ip, this.port, wiegandModeBuf);
        } else {
            // else it will send the two non documented frames necessary to set the wiegand mode
            this.sendFrame(this.ip, this.port, fixFrame1);
            this.sendFrame(this.ip, this.port, fixFrame2);
            this.sendFrame(this.ip, this.port, wiegandModeBuf);
        }
    }

    /**
     * From the CV_Server class events are filtered by ip and then
     * set to the CV_CN56 reader instance.
     *
     * @param {IreaderEvent} event
     * @memberof CV_CN56
     */
    setReaderEvents(event: IreaderEvent){
        this._readerEvent.next(event);
    }

    /**
     * Send the frame command to open relay
     *
     * @memberof CV_CN56
     */
    openRelay() {
        const openRelayBuf = this.setNormalCommand('CV_ReaderC_EXT', '29', '02', '02');
        this.sendFrame(this.ip, this.port, openRelayBuf);
    }

    /**
     *
     * @returns the reader's ip address
     * @memberof CV_CN56
     */
    getIp() {
        return this.ip;
    }

    /**
     * Send the frame command to get the Firmware Version of reader.
     * The answer will be receive through readerEvent$.subscribe()
     * and should be parsed as follows:
     * variable.data.toString('utf-8').replace(/[^\x20-\x7E]/g, '')
     *
     * @memberof CV_CN56
     */
    getFirmwareVersion() {
        const getVersionlNum = this.setNormalCommand('CV_GetVersionlNum', '0a', '00', '01');
        this.sendFrame(this.ip, this.port, getVersionlNum);
        this.setWiegandMode(this.mode, false);
    }

    /**
     * Send the frame command to get the MAC address of reader.
     *
     * @memberof CV_CN56
     */
    getMac() {
        const getMac = this.setNormalCommand('CV_GetMAC', '2b', '00', '01');
        this.sendFrame(this.ip, this.port, getMac);
        this.setWiegandMode(this.mode, false);
    }

    /**
     * If the card data is allowed, the following process begins:
     * a. read the reader config to know if led should turn on.
     * b. read the reader config to know if buzzer (bip) should turn on.
     * c. call openRelay() function to open the relay.
     * d. call close() function to end process after 3 seconds and re set reader 'wiegand mode'.
     *
     * @memberof CV_CN56
     */
    open() {
        if (this.mode.onAccessSuccessful.led) {
            this.startLed('green');
        }
        if (this.mode.onAccessSuccessful.buzzer) {
            this.bipAccess();
        }
        this.openRelay();
        setTimeout(() => {
            this.close();
        }, 3000);
    }

    /**
     * End the process started with the open() function.
     * Mainly, it turns off the led (if 'true' in the reader config)
     * and re sets the reader 'wiegand mode' to continue listening.
     *
     * @memberof CV_CN56
     */
    close() {
        if (this.mode.onAccessSuccessful.led || this.mode.onAccessDeny.led) {
            this.stopLed();
        }
        this.setWiegandMode(this.mode, false);
    }

    /**
     * If the card data is not allowed, the following process begins:
     * a. read the reader config to know if led should turn on.
     * b. read the reader config to know if buzzer (bip) should turn on.
     * c. call close() function to end process after 3 seconds and re set reader 'wiegand mode'.
     *
     * @memberof CV_CN56
     */
    refuse() {
        if (this.mode.onAccessDeny.led) {
            this.startLed('red');
        }
        if (this.mode.onAccessDeny.buzzer) {
            this.bipRefuse();
        }
        setTimeout(() => {
            this.close();
        }, 3000);
    }

    /**
     * Turn on the led
     *
     * @param {string} color
     * @memberof CV_CN56
     */
    startLed(color: string) {

        let dataN: number[] = [
            (color == 'green' ? 0x02 : 0x01),
        ];
        let data = dataN.map((element) => {
            return ('0' + element.toString(16)).slice(-2);
        }).toString().replace(/,/gi, '');

        let fram = this.setNormalCommand('CV_ActiveLED', '24', data, '02');
        this.sendFrame(this.ip, this.port, fram);
    }

    /**
     * Turn off the led
     *
     * @memberof CV_CN56
     */
    stopLed() {

        let dataN: number[] = [
            0x00,
        ];
        let data = dataN.map((element) => {
            return ('0' + element.toString(16)).slice(-2);
        }).toString().replace(/,/gi, '');
        let fram = this.setNormalCommand('CV_ActiveLED', '24', data, '02');
        this.sendFrame(this.ip, this.port, fram);
    }

    /**
     * A pattern that sounds when the card is refused
     *
     * @memberof CV_CN56
     */
    bipRefuse() {

        let dataN: number[] = [
            4,                                                  // 0x04 allows to play a pattern
            this.mode.onAccessDeny.soundPattern.firstBip,       // Units of first on time. Each unit is 100ms.
            this.mode.onAccessDeny.soundPattern.offFirstBip,    // Units of first off time.
            this.mode.onAccessDeny.soundPattern.secondBip,      // Units of second on time.
            this.mode.onAccessDeny.soundPattern.offSecondBip,   // Units of second off time.
            this.mode.onAccessDeny.soundPattern.cycle           // Cycle
        ];

        let data = dataN.map((element) => {
            return ('0' + element.toString(16)).slice(-2);
        }).toString().replace(/,/gi, '');
        let fram = this.setNormalCommand('CV_ActiveBuzzer', '26', data, '07');
        this.sendFrame(this.ip, this.port, fram);
    }

    /**
     * A pattern that sounds when the card is allowed
     *
     * @memberof CV_CN56
     */
    bipAccess() {
        let dataN: number[] = [
            4,                                                        // 0x04 allows to play a pattern
            this.mode.onAccessSuccessful.soundPattern.firstBip,       // Units of first on time. Each unit is 100ms.
            this.mode.onAccessSuccessful.soundPattern.offFirstBip,    // Units of first off time.
            this.mode.onAccessSuccessful.soundPattern.secondBip,      // Units of second on time.
            this.mode.onAccessSuccessful.soundPattern.offSecondBip,   // Units of second off time.
            this.mode.onAccessSuccessful.soundPattern.cycle           // Cycle
        ];
        let data = dataN.map((element) => {
            return ('0' + element.toString(16)).slice(-2);
        }).toString().replace(/,/gi, '');
        let fram = this.setNormalCommand('CV_ActiveBuzzer', '26', data, '07');
        this.sendFrame(this.ip, this.port, fram);
    }

    /**
     * Send hexadecimal frame to the reader
     *
     * @param {string} ip
     * @param {number} port
     * @param {Buffer} data
     * @memberof CV_CN56
     */
    sendFrame(ip: string, port: number, data: Buffer) {
        this.socket.send(data, 0, data.length, port, ip, () => {});
        this.increaseSeq();
    }
}
