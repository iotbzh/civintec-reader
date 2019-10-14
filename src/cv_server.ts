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
    /**
     * setReaderEvent - Track all readers activity available in this.readerEvent$.subscribe()
     *
     * @param {IreaderEventDgram} event
     * @memberof CV_Server
     */
    setReaderEvent(event: IreaderEventDgram){
        this._readerEvent.next(event);
        // Send data to the specific reader which then it can subscribe()
        // Here you filter the specific reader activity
        let reader = this.getReaderCN56_Instance(event.rinfo.address);
        reader.setReaderEvents(event);
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
}