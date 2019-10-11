import * as dgram from 'dgram';
import * as net from 'net';
import { Observable, Subject } from 'rxjs';
import { AddressInfo } from 'net';
import { CV_CN56 } from './cv_cn56';
import { CV_CT9 } from './cv_ct9';

/**
 * Interface for all received data from dgram "on('message')" function
 *
 * @export
 * @interface IreaderEventDgram
 */
export interface IreaderEventDgram {
    data: Buffer;
    rinfo: any;
}

/**
 *
 * @export
 * @class CV_Server
 */
export class CV_Server {
    private serverCN56 = dgram.createSocket({ 'type': 'udp4', 'reuseAddr': true });

    // private _readerEvent = new Subject<IreaderEventDgram>();
    readerEvent$: Observable<IreaderEventDgram>;
    readers: any = {};
    config: any;

    /**
     *Creates an instance of CV_Server.
     * @param {*} config
     * @memberof CV_Server
     */
    constructor(config: any) {

        /**
         * Store the config.json file.
         */
        this.config = config;

        /**
         * BEGIN of CN56 UDP server configuration
         * --------------------------------------
         */

        this.startCN56();

        /**
         * END of CN56 UDP server configuration
         * --------------------------------------
         */

        /**
        * BEGIN of CT9 TCP server configuration
        * --------------------------------------
        */

        /**
        * END of CT9 TCP server configuration
        * --------------------------------------
        */

        /**
          * Create an observable of the dgram "on('message')" function
          */
        this.readerEvent$ = Observable.create((obs: any) => {
            this.serverCN56.on('message', (data, rinfo) => {
                // Send data to the specific reader which then it can subscribe()
                // Here you filter the specific reader activity
                this.getReaderCN56_Instance(rinfo.address).setReaderEvent({ data, rinfo });

                // Send data to the general server subscribe()
                // Here you have all the readers activity
                obs.next({
                    data,
                    rinfo,
                });
            });
        });
        this.readerEvent$ = Observable.create((obs: any) => {
            this.serverCN56.on('message', (data, rinfo) => {
                // Send data to the specific reader which then it can subscribe()
                // Here you filter the specific reader activity
                this.getReaderCN56_Instance(rinfo.address).setReaderEvent({ data, rinfo });

                // Send data to the general server subscribe()
                // Here you have all the readers activity
                obs.next({
                    data,
                    rinfo,
                });
            });
        });


        /**
         * Foreach readers ip makes an instance of the class CV_CN56 or CV_CT9
         */
        config.readersConfig.forEach((reader: any, index: number) => {

            if (reader.type === 'CN56') {
                this.readers[reader.ip] = new CV_CN56(this, reader.ip, reader.port, reader.wiegandMode, reader.autoConnectReader);
            }
            if (reader.type === 'CT9') {
                this.readers[reader.ip] = new CV_CT9(this, reader.ip, reader.port, reader.wiegandMode, reader.autoConnectReader);
            }
        });
    }

    /**
     * Rewrite the dgram.createSocket.send() function
     *
     * @param {Buffer} data - Buffer frame
     * @param {number} offset
     * @param {number} length
     * @param {number} port
     * @param {string} ip
     */
    send(data: Buffer, offset: number, length: number, port: number, ip: string) {
        this.serverCN56.send(data, 0, data.length, port, ip);
    }

    /**
     * Get an instance of the CN56 reader
     *
     * @param {string} readerIp
     * @returns {CV_CN56} instance
     * @memberof CV_Server
     */
    getReaderCN56_Instance(readerIp: string): CV_CN56 {
        return this.readers[readerIp];
    }

    /**
     * Get an instance of the CT9 reader
     *
     * @param {string} readerIp
     * @returns {CV_CT9}
     * @memberof CV_Server
     */
    getReaderCT9_Instance(readerIp: string): CV_CT9 {
        return this.readers[readerIp];
    }

    startCN56() {
        this.serverCN56.bind({
            address: this.config.serverConfig.ipAddress,
            port: this.config.serverConfig.port,
            exclusive: true,
        });
        /**
         * Once server is bound we check it is working
         */
        this.serverCN56.on('listening', () => {
            var address = <AddressInfo>this.serverCN56.address();
            console.log('Listening on UPD for Civintec reader model CN56 :', address.address + ':' + address.port);
        });
    }
}