import { CV_Core } from "./cv_core";
import { Subject, Observable } from "rxjs";
import { AddressInfo } from "net";
import * as cluster from 'cluster'

// ICVWiegandMode : used to config Wiegand mode reader
export interface ICVWiegandMode {
    buzzer_led: boolean;         // set to true to bip and light up each time a card is presented
    cardBlockNumber: number;    // block number to read on card (accepted value: 0 - 63)
}

export interface IreaderEvent {
    data: Buffer;
    rinfo: string;
}

export class CV_CN56 extends CV_Core {

    readerEvent$: Observable<IreaderEvent>;

    private ip: string;
    private _readerEvent = new Subject<IreaderEvent>();
    private mode: ICVWiegandMode;

    constructor(
        ip: string,
        mode: ICVWiegandMode,
        disableAutoConnect?: boolean
    ) {
        super();
        this.ip = ip;
        this.mode = mode;


        this.readerEvent$ = this._readerEvent.asObservable();

        if (disableAutoConnect !== undefined) {
        }
        this.connect(mode);
    }

    getIp() {
        return this.ip;
    }

    /**
     * Connect
     */
    connect(mode: ICVWiegandMode) {
        try {
            this.mode = mode;

            this.server.bind({
                // address: '224.0.0.255',
                address: '172.25.50.62',
                port: 2000,
                exclusive: true,
            });

            this.server.on('listening', () => {
                var address = <AddressInfo>this.server.address();
                console.log(address);
                // this.server.setMulticastLoopback(true)
                // this.server.setBroadcast(true);
                // this.server.setMulticastTTL(128);
                // this.server.addMembership(this.ip);
            });

            this.readerEvent$ = Observable.create((obs: any) => {
                this.server.on('message', (data, rinfo) => {
                    // pass this information on for further processing?
                    obs.next({
                        data,
                        rinfo,
                    });
                });
            });

            this.setWiegandModeObs(mode, true);

        } catch (error) {
            console.log(error);
        }

    }

    /**
     * setWiegandMode - Config reader mode
     * @param mode
     */
    // setWiegandMode(mode: ICVWiegandMode): Error {

    //     this.setWiegandModeObs(mode).subscribe((xx) => {
    //         return null;
    //     }, (err) => {
    //         console.log("ERROR: setWiegandMode ", err);
    //     });
    //     return null;
    // }

    /**
    * setWiegandMode - Config reader mode
    * @param mode
    */


    setWiegandModeObs(mode: ICVWiegandMode, complete: boolean): any {

        // Set default values
        let wiegandSetting: number[] = [
            0x00, //wiegand_26
            0x00, // indicate the block number for AutoRead
            0x26, //REQUEST mode 0x26 IDLE 0x52 ALL
            0x10, // buzzer 0x13 to bip each time a card is presented

            0x55, // Extra addition not documented
            0xAA, // Extra addition not documented

            0x00, //Key format 0x00 8-bit keypad format 0x01 4-bit keypad format
            0x2E, // Output slect
            0xFF, // Block number of Wiegand data stored on the ISO15693 card. 0xFF basic mode, output card Inventory.
            0x00, // Card type 0x00 Mifare 1
            0x00,
            0x00,
            0x00,
        ];

        let fixFrame1;
        let fixFrame2;
        let getWiegandFormat;
        let setWiegandStatus;
        // Set values from ICVWiegandMode param
        if (mode.buzzer_led) {
            wiegandSetting[3] |= 0x3;

            fixFrame1 = Buffer.from('02a00046030060008503', 'hex');
            fixFrame2 = Buffer.from('02b0004709006000ffffffffffff9e03', 'hex');
            getWiegandFormat = Buffer.from('02d0001d0100cc03', 'hex');
            setWiegandStatus = Buffer.from('02e00012020013e303', 'hex');

        } else {
            // wiegandSetting[3] |= 0x1;
            wiegandSetting[3] |= 0x10;

            fixFrame1 = Buffer.from('02a00046030060008503', 'hex');
            fixFrame2 = Buffer.from('02b0004709006000ffffffffffff9e03', 'hex');
            getWiegandFormat = Buffer.from('02d0001d0100cc03', 'hex');
            setWiegandStatus = Buffer.from('02e00012020011e103', 'hex');
        }
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


        // Return an Observable that contains the message to the reader to start the wiegandmode (autoread)
        if (!complete) {
            this.sendFrame(this.ip, wiegandModeBuf);
        } else {

            this.sendFrame(this.ip, fixFrame1);
            this.sendFrame(this.ip, fixFrame2);
            this.sendFrame(this.ip, wiegandModeBuf);
            // this.sendFrame(this.ip, reset3);
            this.sendFrame(this.ip, getWiegandFormat);
            this.sendFrame(this.ip, setWiegandStatus);
        }
    }

    /**
     *
     * openRelay - Open the door
     * @param CV_CN56
     */
    openRelay() {
        console.log(this.ip);

        const openRelayBuf = this.setFrame('CV_ReaderC_EXT', '29', '02', '02');
        this.sendFrame(this.ip, openRelayBuf);
        this.setWiegandModeObs(this.mode, false);
    }

    getFirmwareVersion() {
        const getVersionlNum = this.setFrame('CV_GetVersionlNum', '0a', '00', '01');
        // let getVersionlNum = Buffer.from('02a0000a0100ab03', 'hex');
        this.sendFrame(this.ip, getVersionlNum);
        this.setWiegandModeObs(this.mode, false);
    }
    getMac() {
        const getMac = this.setFrame('CV_GetMAC', '2b', '00', '01');
        this.sendFrame(this.ip, getMac);
        this.setWiegandModeObs(this.mode, false);
    }

    refuse() {
        const ledBinking = this.setFrame('CV_ActiveLED', '25', '01010a', '04');
        const ledRed = this.setFrame('CV_ActiveLED', '24', '01', '02');
        this.setTime('04');
        const beeping = this.setFrame('CV_ActiveBuzzer', '26', '0100010002', '07');

        this.sendFrame(this.ip, ledBinking);
        let asd = this.sendFrame(this.ip, beeping);
        // console.log(beeping.toString('hex'));
        // console.log('028000260700040100010002a703');

        this.setWiegandModeObs(this.mode, false);
    }
}
