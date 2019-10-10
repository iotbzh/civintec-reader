import { CV_Core, ICVWiegandMode } from "./cv_core";
import { CV_Server, IreaderEvent } from "./cv_server";
import { Observable, Subject } from "rxjs";

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
    private mode: ICVWiegandMode;
    private _readerEvent = new Subject<IreaderEvent>();
    readerEvent$: Observable<IreaderEvent>;
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
        disableAutoConnect?: boolean,
    ) {
        super();
        super.setServer(server);

        this.ip = ip;
        this.port = port;
        this.mode = mode;

        if (disableAutoConnect) {
            this.setWiegandMode(mode, true);
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
    connect(){
        this.setWiegandMode(this.mode, true);
    }

    /**
     * The reader could access to its own listener events
     * through _readerEvent.subscribe()
     *
     * @param {IreaderEvent} event
     * @memberof CV_CN56
     */
    setReaderEvent(event: IreaderEvent){

        this._readerEvent.next(event)
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
     *
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
            0x2E, // Output slect
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
        const wiegandModeBuf = this.setFrame('CV_WiegandMode', '18', wiegandFrame);

        // if @param {boolean} complete is set to false
        // it will send only the wiegandmode frame
        if (!complete) {
            this.sendFrame(this.ip, this.port,wiegandModeBuf);
        } else {
            // else it will send the two non documented frames necessary to set the wiegandmode
            this.sendFrame(this.ip, this.port, fixFrame1);
            this.sendFrame(this.ip, this.port, fixFrame2);
            this.sendFrame(this.ip, this.port, wiegandModeBuf);
        }
    }

    /**
     * Send the frame command to open relay
     *
     * @memberof CV_CN56
     */
    openRelay() {
        const openRelayBuf = this.setFrame('CV_ReaderC_EXT', '29', '02', '02');
        this.sendFrame(this.ip, this.port, openRelayBuf);
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
        const getVersionlNum = this.setFrame('CV_GetVersionlNum', '0a', '00', '01');
        this.sendFrame(this.ip, this.port, getVersionlNum);
        this.setWiegandMode(this.mode, false);
    }

    /**
     * Send the frame command to get the MAC address of reader.
     *
     * @memberof CV_CN56
     */
    getMac() {
        const getMac = this.setFrame('CV_GetMAC', '2b', '00', '01');
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
        if (this.mode.led) {
            this.startLed('green');
        }
        if (this.mode.buzzer) {
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
        if (this.mode.led) {
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
        if (this.mode.led) {
            this.startLed('red');
        }
        if (this.mode.buzzer) {
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

        let fram = this.setFrame('CV_ActiveLED', '24', data, '02');
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
        let fram = this.setFrame('CV_ActiveLED', '24', data, '02');
        this.sendFrame(this.ip, this.port, fram);
    }

    /**
     * A pattern that sounds when the card is refused
     *
     * @memberof CV_CN56
     */
    bipRefuse() {
        // This config makes 3 bips
        let dataN: number[] = [
            0x04, // 0x04 allows to play a pattern
            0x01, // Units of first on time. Each unit is 100ms.
            0x01, // Units of first off time.
            0x01, // Units of second on time.
            0x01, // Units of second off time.
            0x02  // Cycle
        ];
        let data = dataN.map((element) => {
            return ('0' + element.toString(16)).slice(-2);
        }).toString().replace(/,/gi, '');
        let fram = this.setFrame('CV_ActiveBuzzer', '26', data, '07');
        this.sendFrame(this.ip, this.port, fram);
    }

    /**
     * A pattern that sounds when the card is allowed
     *
     * @memberof CV_CN56
     */
    bipAccess() {
        // This config makes 1 long bip
        let dataN: number[] = [
            0x04,
            0x01,
            0x00,
            0x01,
            0x01,
            0x01
        ];
        let data = dataN.map((element) => {
            return ('0' + element.toString(16)).slice(-2);
        }).toString().replace(/,/gi, '');
        let fram = this.setFrame('CV_ActiveBuzzer', '26', data, '07');
        this.sendFrame(this.ip, this.port, fram);
    }
}
