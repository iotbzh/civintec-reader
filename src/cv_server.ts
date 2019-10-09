import * as dgram from 'dgram';
import { Observable, Subject } from 'rxjs';
import { AddressInfo } from 'net';
import { ICVWiegandMode } from './cv_core';
import { CV_CN56 } from '.';

export interface IreaderEvent {
    data: Buffer;
    rinfo: string;
}


export class CV_Server{

    server = dgram.createSocket({'type' : 'udp4', 'reuseAddr' : true});
    private _readerEvent = new Subject<IreaderEvent>();
    readerEvent$: Observable<IreaderEvent>;
    readers: any = {};

    constructor(serverIp: string, readersIps:string[], mode: ICVWiegandMode){
        this.server.bind({
            // address: '224.0.0.255',
            address: serverIp,
            port: 2000,
            exclusive: true,
        });

        this.server.on('listening', () => {
            var address = <AddressInfo>this.server.address();
            console.log('Listening on :', address.address+':'+address.port);
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

        readersIps.forEach((ip,index) => {

            this.readers[ip] = new CV_CN56(this, ip, mode);
            this.readers[ip] = new CV_CN56(this, ip, mode);

        });


        // this.readerEvent$ = this._readerEvent.asObservable();
    }

    send(data: Buffer, offset: number, length: number, port: number, ip: string){
        this.server.send(data, 0, data.length, port, ip);
    }



}