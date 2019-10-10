import * as dgram from 'dgram';
import { Observable, Subject } from 'rxjs';
import { AddressInfo } from 'net';
import { CV_CN56 } from './cv_cn56';

/**
 * Interface for all received data from dgram "on('message')" function
 *
 * @export
 * @interface IreaderEvent
 */
export interface IreaderEvent {
    data: Buffer;
    rinfo: any;
}

/**
 *
 * @export
 * @class CV_Server
 */
export class CV_Server{
    server = dgram.createSocket({'type' : 'udp4', 'reuseAddr' : true});
    private _readerEvent = new Subject<IreaderEvent>();
    readerEvent$: Observable<IreaderEvent>;
    readers: any = {};
    config: any;

   /**
    *Creates an instance of CV_Server.
    * @param {*} config
    * @memberof CV_Server
    */
   constructor(config:any){

        this.config = config;

        /**
         * Binding dgram function to set the server ip address and port
         */
        this.server.bind({
            address: config.serverConfig.ipAddress,
            port: config.serverConfig.port,
            exclusive: true,
        });
        /**
         * Once server is bound we check it is working
         */
        this.server.on('listening', () => {
            var address = <AddressInfo>this.server.address();
            console.log('Listening on :', address.address+':'+address.port);
        });

        /**
         * Create an observable of the dgram "on('message')" function
         */
        this.readerEvent$ = Observable.create((obs: any) => {
            this.server.on('message', (data, rinfo) => {
                // Send data to the specific reader which then it can subscribe()
                // Here you filter the specific reader activity
                this.getReaderInstance(rinfo.address).setReaderEvent({data, rinfo});

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
        config.readersConfig.forEach((reader: any,index: number) => {

            if(reader.type === 'CN56') {
                this.readers[reader.ip] = new CV_CN56(this, reader.ip, reader.port, reader.wiegandMode, reader.autoConnectReader);
                this.readers[reader.ip] = new CV_CN56(this, reader.ip, reader.port, reader.wiegandMode, reader.autoConnectReader);
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
    send(data: Buffer, offset: number, length: number, port: number, ip: string){
        this.server.send(data, 0, data.length, port, ip);
    }

    /**
     * Get an instance of the reader
     *
     * @param {string} readerIp
     * @returns {CV_CN56} instance
     * @memberof CV_Server
     */
    getReaderInstance(readerIp: string): CV_CN56{
        return this.readers[readerIp];
    }

}