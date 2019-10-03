import { CV_Core } from "./cv_core";

export class CV_CN56 extends CV_Core {

    private ip: string;
    private wiegandMode?: Buffer;

    constructor(
        ip: string,
    ) {
        super();
        this.ip = ip;
    }

    wiegandModeFn(): any {
        let wiegandSetting: number[] = [
            0x00, //wiegand_26
            0x00, // indicate the block number for AutoRead
            0x26, //REQUEST mode 0x26 IDLE 0x52 ALL
            0x11, // buzzer 0x13 to bip each time a card is presented

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


        // Transformation of wiegandSetting (DATA) into a string frame
        let wiegandFrame = wiegandSetting.map((element) => {
            return ('0' + element.toString(16)).slice(-2);
        }).toString().replace(/,/gi, '');

        this.setFrame('CV_WiegandMode', '18', wiegandFrame);
        this.wiegandMode = Buffer.from(this.tram, 'hex');
    }

    wiegandModeUp() {

        this.server.send(this.wiegandMode, 0, this.wiegandMode.byteLength, 2000, this.ip, function (err: any, bytes: any) {

            if (err) {
                console.log(err);
            }
            if (bytes != 21) {
                console.warn('Frame was not correctly send');
            }
        });
    }
    connect(ipServer: string) {

        if (this.server.bindState === undefined) {
            this.server.bind({
                address: ipServer,
                port: 2000,
                exclusive: false
            });

            this.server.on('listening', () => {
                const address = this.server.address();
                console.log(`server listening ${address.address}:${address.port}`);
            });

            this.wiegandModeUp();
            this.server.on('message', (msg: any, rinfo: any) => {
                console.log('Mensaje recibido ' + msg.toString('hex'));


                if (msg.toString('hex') == '0000000000000000000000000000000f') {

                    let readerIp = rinfo.address;

                    this.server.send(this.wiegandMode, 0, this.wiegandMode.byteLength, 2000, readerIp, function (err: any, bytes: any) {
                        if (err) {
                            console.log(err);
                        }
                        if (bytes != 21) {
                            console.warn('Frame was not correctly send');
                        }
                    });

                    console.log(rinfo);
                } else {
                    // console.log('mess' + msg.toString('hex'));
                }


            });
        }



        return true;
    }
}