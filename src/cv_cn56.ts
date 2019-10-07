import { CV_Core } from "./cv_core";
import { Subject, Observable } from "rxjs";
import { map } from "rxjs/operators";

// ICVWiegandMode : used to config Wiegand mode reader
export interface ICVWiegandMode {
    buzzer_led: boolean;         // set to true to bip and light up each time a card is presented
    cardBlockNumber: number;    // block number to read on card (accepted value: 0 - 63)
}

export interface ICardEvent {
    data: string;
    rinfo: string;
}

export class CV_CN56 extends CV_Core {

    cardEvent$: Observable<ICardEvent>;

    private ip: string;
    private _cardEvent = new Subject<ICardEvent>();
    private mode: ICVWiegandMode;

    constructor(
        ip: string,
        mode: ICVWiegandMode,
        disableAutoConnect?: boolean
    ) {
        super();
        this.ip = ip;
        this.mode = mode;


        this.cardEvent$ = this._cardEvent.asObservable();

        if (disableAutoConnect !== undefined) {
        }
        this.connect(mode);
    }

    getIp(){
        return this.ip;
    }

    /**
     * Connect
     */
    connect(mode: ICVWiegandMode) {

        if ('bindState' in this.server.bind === false) {

            this.server.bind({
                address: '172.25.50.62',
                port: 2000,
                exclusive: false
            });
        }

        this.cardEvent$ = this.setWiegandModeObs(mode);
    }

    /**
     * setWiegandMode - Config reader mode
     * @param mode
     */
    setWiegandMode(mode: ICVWiegandMode): Error {

        this.setWiegandModeObs(mode).subscribe((xx) => {
            return null;
        }, (err) => {
            console.log("ERROR: setWiegandMode ", err);
        });
        return null;
    }

     /**
     * setWiegandMode - Config reader mode
     * @param mode
     */


    setWiegandModeObs(mode: ICVWiegandMode): Observable<any> {

        // Set default values
        let wiegandSetting: number[] = [
            // 0x00, //wiegand_26
            0x01, // indicate the block number for AutoRead
            0x26, //REQUEST mode 0x26 IDLE 0x52 ALL
            0x10, // buzzer 0x13 to bip each time a card is presented

            0x55, // Extra addition not documented
            0xAA, // Extra addition not documented

            0x03, //Key format 0x00 8-bit keypad format 0x01 4-bit keypad format
            0x2E, // Output slect
            0xFF, // Block number of Wiegand data stored on the ISO15693 card. 0xFF basic mode, output card Inventory.
            0x00, // Card type 0x00 Mifare 1
            0x00,
            0x00,
            0x00,
        ];

        // Set values from ICVWiegandMode param
        if (mode.buzzer_led) {
            wiegandSetting[2] |= 0x3;

        } else {
            wiegandSetting[2] |= 0x1;
        }
        if (mode.cardBlockNumber) {
            wiegandSetting[0] = Number(mode.cardBlockNumber.toString(16));
        }

        // Transformation of wiegandSetting (DATA) into a string frame
        let wiegandFrame = wiegandSetting.map((element) => {
            return ('0' + element.toString(16)).slice(-2);
        }).toString().replace(/,/gi, '');

        // Set the complete buffer frame following the UART protocol
        // example of data returned <Buffer 02 80 00 29 0e 00 00 a7 03>
        const wiegandModeBuf = this.setFrame('CV_WiegandMode', '18', wiegandFrame);


        // Return an Observable that contains the message to the reader to start the wiegandmode (autoread)
        return this.sendFrame(this.ip, wiegandModeBuf);
    }

    /**
     *
     * openRelay - Open the door
     * @param CV_CN56
     */
    openRelay(){
        const openRelayBuf = this.setFrame('CV_ReaderC_EXT', '29', '02', '02');
        // this.sendFrame(this.ip, openRelayBuf).subscribe();
        this.setWiegandModeObs(this.mode).subscribe();
    }
}
