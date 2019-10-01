export class CV_core {
    tram: string;
    constructor(message: string) {
        this.tram = message;
    }
    setTram() {
        return "Hello, " + this.tram;
    }
}