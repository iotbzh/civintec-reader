import { CV_Server } from './cv_server';
import { CV_CT9 } from './cv_ct9';

/**
 * ICVWiegandMode : used to config Wiegand mode reader
 *
 * @export
 * @interface ICVWiegandMode
 */
export interface ICVWiegandMode {
    cardBlockNumber: number;    // block number to read on card (accepted value: 0 - 63)
    onAccessSuccessful: {
        buzzer: boolean;            // set to true to bip and light up each time a card is presented
        led: boolean;               // set to true to bip and light up each time a card is presented
        soundPattern: any;
    },
    onAccessDeny: {
        buzzer: boolean;            // set to true to bip and light up each time a card is presented
        led: boolean;               // set to true to bip and light up each time a card is presented
        soundPattern: any;
    }
}

/**
 *
 *
 * @export
 * @class CV_Core
 */
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

    // protected server: CV_Server;
    // protected socket: CV_CT9;

    constructor() {}

    /**
     * UART Protocol logic to construct the frames
     *
     * @param {string} commandString - string command, e.g. 'CV_WiegandMode'.
     * @param {string} command       - command hex number, e.g. '18'.
     * @param {string} data          - each command has its own data configuration.
     * @param {string} [datalen]     - some commands do not obtain the length from the commandString, so it is send.
     * @returns {Buffer}             - final frame to send to the reader
     * @memberof CV_Core
     */
    setNormalFrame(commandString: string, command: string, data: string, datalen?: string): Buffer {

        this.data = data;
        this.cmd = command;

        // If the length of the command is not send, it is obtained from the length of the string
        if (datalen === undefined) {
            this.datalen = ('0'+commandString.length.toString(16)).slice(-2);
        } else {
            // else, the datalen if formed with the given parameter.
            this.datalen = ('0'+datalen).slice(-2);
        }
        /**
         * Begin 'eight-bit block check sum' calculation.
         *
         * a. The calculation of the check sum includes all the bytes
         *    within the package but excludes the STX, ETX
         * b. The string concatenation (seq+dadd+cmd...) is transformed into a buffer
         * c. The byte length of the buffer is calculated
         * d. The final 'bcc' checksum is converted into an hexadecimal string
         */
        this.bcc = this.seq + this.dadd + this.cmd + this.datalen + this.time + this.data;
        let hexArray = Buffer.from(this.bcc, 'hex');
        let bccLength = 0x00;
        hexArray.forEach(element => {
            bccLength = bccLength ^ element;
        });
        this.bcc = ('0'+bccLength.toString(16)).slice(-2);
        /**
         * End of 'eight-bit block check sum' calculation.
         */

        // Final frame composition
        const frame = this.stx + this.seq + this.dadd + this.cmd + this.datalen + this.status + this.time + this.data + this.bcc + this.etx;

        return Buffer.from(frame, 'hex');
    }

    setExtendedCommand(commandString: string, highCommand: string, lowCommand: string, data: string, datalen?: string, status?: string){
        this.data = data;

        // If the length of the command is not send, it is obtained from the length of the string
        if (datalen === undefined) {
            let hexLen = 0x00;
            Buffer.from(this.time+this.status+data, 'hex').forEach( element => {
                hexLen = hexLen ^ element;
            });
            this.datalen = ('0'+hexLen.toString(16)).slice(-2);

        } else {
            // else, the datalen if formed with the given parameter.
            this.datalen = ('0'+datalen).slice(-2);
        }

        if (status !== undefined) {
            this.status = status;
        }
        /**
         * Begin 'eight-bit block check sum' calculation.
         *
         * a. The calculation of the check sum includes all the bytes
         *    within the package but excludes the STX, ETX
         * b. The string concatenation (seq+dadd+cmd...) is transformed into a buffer
         * c. The byte length of the buffer is calculated
         * d. The final 'bcc' checksum is converted into an hexadecimal string
         */
        this.bcc = this.seq + this.dadd + 'ec' + highCommand + this.status + this.datalen + this.time + this.data;
        let hexArray = Buffer.from(this.bcc, 'hex');
        let bccLength = 0x00;
        hexArray.forEach(element => {
            bccLength = bccLength ^ element;
        });
        this.bcc = ('0'+bccLength.toString(16)).slice(-2);

        /**
         * End of 'eight-bit block check sum' calculation.
         */

        // Final frame composition
        const frame = this.stx + this.seq + this.dadd + 'ec' + highCommand + this.status + this.datalen + this.time + lowCommand + this.data + this.bcc + this.etx;
        console.log(frame);



        return Buffer.from(frame, 'hex');
    }

    /**
     * A detail split of the elements that form the command frame (server to reader)
     *
     * @param {string} frameString
     * @returns - array of the command components
     * @memberof CV_Core
     */
    getFrameDetailCN56(frameString: string) {
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

    /**
     * A detail split of the elements that form the response frame (reader to server)
     *
     * @param {string} frameString
     * @returns
     * @memberof CV_Core
     */
    getFrameCmdDetailCN56(frameString: string) {
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

    getFrameDetailCT9(frameString: string) {
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

    getFrameExtendedCmdDetailCT9(frameString: string) {
        let split = frameString.split('');

        let splitFrame = {
            'stx': split[0] + split[1],
            'seq': split[2] + split[3],
            'dadd': split[4] + split[5],
            'xee': split[6] + split[7],
            'highCmd': split[8] + split[9],
            'status': split[10] + split[11],
            'datalen': split[12] + split[13],
            'time': split[14] + split[15],
            'lowCmd': split[16] + split[17],
            'data': split.map((val, ind, spl) => { return (ind > 17 && ind < spl.length - 4) ? val : ',' }).toString().replace(/,/gi, ''),
            'bcc': split[split.length - 4] + split[split.length - 3],
            'etx': split[split.length - 2] + split[split.length - 1]
        };

        return splitFrame;
    }
}
