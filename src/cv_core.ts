/**
 * @license
 * Copyright (C) 2019 IoT.bzh Company
 * Contact: https://www.iot.bzh/licensing
 *
 * This file is part of the civintec-reader module of the IoT.bzh project.
 *
 * $CV_BEGIN_LICENSE$
 * Commercial License Usage
 *  Licensees holding valid commercial IoT.bzh licenses may use this file in
 *  accordance with the commercial license agreement provided with the
 *  Software or, alternatively, in accordance with the terms contained in
 *  a written agreement between you and The IoT.bzh Company. For licensing terms
 *  and conditions see https://www.iot.bzh/terms-conditions. For further
 *  information use the contact form at https://www.iot.bzh/contact.
 *
 * GNU General Public License Usage
 *  Alternatively, this file may be used under the terms of the GNU General
 *  Public license version 3. This license is as published by the Free Software
 *  Foundation and appearing in the file LICENSE.GPLv3 included in the packaging
 *  of this file. Please review the following information to ensure the GNU
 *  General Public License requirements will be met
 *  https://www.gnu.org/licenses/gpl-3.0.html.
 * $CV_END_LICENSE$
 */


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
    private status: string = '00';

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
    setNormalCommand(commandString: string, command: string, data: string, datalen?: string): Buffer {

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
        const frame = this.stx + this.seq + this.dadd + this.cmd + this.datalen + this.time + this.data + this.bcc + this.etx;

        return Buffer.from(frame, 'hex');
    }

    /**
     * Set Extended Command
     *
     * @param {string} commandString
     * @param {string} highCommand
     * @param {string} lowCommand
     * @param {string} data
     * @param {string} [datalen]
     * @param {string} [status]
     * @returns
     * @memberof CV_Core
     */
    setExtendedCommand(commandString: string, highCommand: string, lowCommand: string, data: string, datalen?: string){
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

        return Buffer.from(frame, 'hex');
    }

    /**
     * Set FormatEx1 command
     *
     * @param {string} commandString
     * @param {string} command
     * @param {string} data
     * @param {string} [datalen]
     * @param {string} [status]
     * @returns
     * @memberof CV_Core
     */
    setEECommand(commandString: string, command: string, data: string, datalen?: string){
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

        /**
         * Begin 'eight-bit block check sum' calculation.
         *
         * a. The calculation of the check sum includes all the bytes
         *    within the package but excludes the STX, ETX
         * b. The string concatenation (seq+dadd+cmd...) is transformed into a buffer
         * c. The byte length of the buffer is calculated
         * d. The final 'bcc' checksum is converted into an hexadecimal string
         */
        this.bcc = this.seq + this.dadd + 'ee' + command + this.status + this.datalen + this.time + this.data;
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
        const frame = this.stx + this.seq + this.dadd + 'ee' + command + this.status + this.datalen + this.time + this.data + this.bcc + this.etx;

        return Buffer.from(frame, 'hex');
    }

    /**
     * A detail split of the elements that form the command frame (server to reader)
     *
     * @param {string} frameString
     * @returns - array of the command components
     * @memberof CV_Core
     */
    getNormalFrameDetail(frameString: string) {
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
    getNormalFrameCmdDetail(frameString: string) {
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

    /**
     * Get detail Extended Command frame composition (when send from host to reader )
     *
     * @param {string} frameString
     * @returns
     * @memberof CV_Core
     */
    getExtendedCmdFrameDetail(frameString: string) {
        let split = frameString.split('');

        let splitFrame = {
            'stx': split[0] + split[1],
            'seq': split[2] + split[3],
            'dadd': split[4] + split[5],
            'xee': split[6] + split[7],
            'highCmd': split[8] + split[9],
            'lowCmd': split[10] + split[11],
            'status': split[12] + split[13],
            'datalen': split[14] + split[15],
            'time': split[16] + split[17],
            'data': split.map((val, ind, spl) => { return (ind > 17 && ind < spl.length - 4) ? val : ',' }).toString().replace(/,/gi, ''),
            'bcc': split[split.length - 4] + split[split.length - 3],
            'etx': split[split.length - 2] + split[split.length - 1]
        };

        return splitFrame;
    }

    /**
     * Get detail FormatEx Command frame composition (when send from host to reader )
     *
     * @param {string} frameString
     * @returns
     * @memberof CV_Core
     */
    getFormatExCmdFrameDetail(frameString: string) {
        let split = frameString.split('');

        let splitFrame = {
            'stx': split[0] + split[1],
            'seq': split[2] + split[3],
            'dadd': split[4] + split[5],
            'xee': split[6] + split[7],
            'highCmd': split[8] + split[9],
            'lowCmd': split[10] + split[11],
            'status': split[12] + split[13],
            'datalen': split[14] + split[15],
            'time': split[16] + split[17],
            'data': split.map((val, ind, spl) => { return (ind > 17 && ind < spl.length - 4) ? val : ',' }).toString().replace(/,/gi, ''),
            'bcc': split[split.length - 4] + split[split.length - 3],
            'etx': split[split.length - 2] + split[split.length - 1]
        };

        return splitFrame;
    }
    /**
     * Packet sequence number: this field acts as
     * error control. Each packet sent from the Host
     * associates with a sequence number that will be
     * increased circularly. The reader returns the reply
     * message with the same SEQ number. The HOST can check
     * the SEQ for the occurrence of the ‘OUT of SEQUENCE’ error.
     * Bit 7: Always set to ‘1’
     * Bit 6-4: Sequence Number. Change from 0 to 7 cyclically.
     * Bit 3-0: Extend Device Address.
     *
     * @memberof CV_Core
     */
    increaseSeq(){
        if (this.seq == 'f0') {
            this.seq = '80';
        } else {
            let seq = parseInt(this.seq, 16);
            this.seq = (seq+0x10).toString(16);
        }
    }

    /**
     *
     * @returns SEQ number (Packet sequence number)
     * @memberof CV_Core
     */
    getSeq(){
        return this.seq;
    }
}
