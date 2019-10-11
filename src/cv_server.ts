import * as net from 'net';
import { Observable, Subject } from 'rxjs';
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

    private connectionUDPInit: boolean = false;
    private _readerEvent = new Subject<IreaderEventDgram>();
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
         * Create an observable of the dgram "on('message')" function
         */
        this.readerEvent$ = this._readerEvent.asObservable();


        /**
         * Foreach readers ip makes an instance of the class CV_CN56 or CV_CT9
         */
        config.readersConfig.forEach((reader: any, index: number) => {

            if (reader.type === 'CN56') {
                this.readers[reader.ip] = new CV_CN56(this, reader.ip, reader.port, reader.wiegandMode, reader.autoConnectReader, this.config.serverConfig.ipAddress, this.config.serverConfig.port);
            }
            if (reader.type === 'CT9') {
                this.readers[reader.ip] = new CV_CT9(this, reader.ip, reader.port, reader.wiegandMode, reader.autoConnectReader);
            }
        });

    }

    getConnectionUDPInit(){
        return this.connectionUDPInit;
    }

    setConnectionUDPInit(value: boolean){
        this.connectionUDPInit = value;
    }

    setReaderEvent(event: IreaderEventDgram){
        this._readerEvent.next(event);
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
    // send(data: Buffer, offset: number, length: number, port: number, ip: string) {
    //     this.serverCN56.send(data, 0, data.length, port, ip);
    // }

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
}