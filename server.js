
const dgram = require('dgram');
const fs = require('fs');
const path = require('path');

const chalk = require('chalk');

const TFTP_PORT = 69;
const DOCUMENTROOT = process.cwd()+path.sep;

/**
 * WRQ和DATA包由ACK或ERROR数据包确认，RRQ包由DATA或ERROR数据包确认
 * 
 * RRQ/WRQ包
 * | Opcode | Filename | 0 | Mode | 0 | 
 * Opcode: 1-5
 * Mode: netascii/octet/mail
 * 
 * DATA包
 * | Opcode | Block # | Data |
 * 
 * ACK包
 * | Opcode | Block # |
 * 
 * ERROR包
 * | Opcode | ErrorCode | ErrMsg | 0 |
 */
const RRQ = 1;
const WRQ = 2;
const DATA = 3;
const ACK = 4;
const ERROR = 5;

const DATASIZE = 512;

// 传输模式
const MASCII = 1;
const MOCTET = 2;
const MMAIL = 3;


// 错误代码
const ERROR_NOTFOUND = 1;
const ERROR_ACCESS = 2;
const ERROR_DISKFULL = 3;
const ERROR_UNKNOW = 4;
const ERROR_ID = 5;
const ERROR_FILEEXIST = 6;
const ERROR_USER = 6;




class Server {
    constructor(config) {
        this.config = config;
        config.port = this.port = config.port ? config.port : TFTP_PORT;

        config.documentRoot = this.documentRoot = config.documentRoot ? config.documentRoot : DOCUMENTROOT;
        try {
            fs.accessSync(this.documentRoot, fs.constants.F_OK);
        } catch (err) {
            config.documentRoot = this.documentRoot = DOCUMENTROOT;
        }

        this.server = dgram.createSocket('udp4');
        this.mode = '';
        this.dataPacketNo = 0; //数据包编号
        this.data = ''; //要发送的数据
        this.errorNo = 0; //错误号
        this.errorMsg = '';
        this.fd = null; //文件句柄
    }

    run() {
        const server = this.server;

        server.on('error', (err) => {
            console.log(`服务器异常：\n${err.stack}`);
            server.close();
        });
        server.on('message', (msg, rinfo) => {
            this.task(msg, rinfo); //todo: 启动子进程处理
        });
        server.on('listening', () => {
            const address = server.address();
            console.log(chalk`{black.bgGreen tftp服务运行在${address.address}:${address.port}} `);
            console.log(chalk`{black.bgGreen 目录${this.documentRoot}} `);
        });
        server.bind(this.config.port);
    }

    stop() {
        this.server.close();
        console.log(`服务关闭`);
    }

    /**
     * 
     * @param {Buffer} msg 
     * @param {object} rinfo 
     */
    task(msg, rinfo) {

        //Buffer支持的字符编码ascii utf8 utf16le(ucs2) base64 latin1(binary) hex
        const server = this.server;
        const opcode = msg.readUInt8(1);

        msg = msg.slice(2); //去掉opcode
        //数据包分段
        let msgStart = 0;
        let msgArr = [];
        for(let i = 0; i < msg.length; i++) {
            if(msg[i] === 0) {
                msgArr.push(msg.slice(msgStart, i));
                msgStart = i + 1;
            }
        }

        let filename, mode; //文件名、传输模式
        let packetNo; //数据包编号
        let buf; //要发送的buffer
        
        switch(opcode){
            case RRQ:
                console.log('get');
                filename = Buffer.from(msgArr[0]).toString('ascii'); //tftp的文件名只能是ascii字符
                mode = Buffer.from(msgArr[1]).toString('ascii'); //tftp的文件名只能是ascii字符
                console.log(mode, filename);
                switch(mode) {
                    case 'netascii':
                        this.mode = MASCII;
                        try {
                            this.data = fs.readFileSync(this.documentRoot+filename);
                            this.dataPacketNo = 1;
                            buf = this.makePack(DATA);
                        } catch (err) {
                            this.errorNo = ERROR_NOTFOUND;
                            this.errorMsg = err.message;
                            buf = this.makePack(ERROR);
                        }
                        
                        break;
                    case 'octet':
                        this.mode = MOCTET;
                        try {
                            let readBuf = Buffer.alloc(DATASIZE);
                            if(this.fd === null)
                                this.fd = fs.openSync(this.documentRoot+filename);
                            let nbyte = fs.readSync(this.fd, readBuf, 0, DATASIZE);

                            if(nbyte < DATASIZE && this.fd) {
                                fs.closeSync(this.fd);
                                this.fd = null;
                            }
                            this.data = readBuf;
                            this.dataPacketNo = 1;
                            buf = this.makePack(DATA);
                        } catch (err) {
                            this.errorNo = ERROR_NOTFOUND;
                            this.errorMsg = err.message;
                            buf = this.makePack(ERROR);
                        }
                        
                        break;
                    case 'mail':
                        this.mode = MMAIL;
                        break;
                }
                break;
            case WRQ:
                console.log('put');
                filename = Buffer.from(msgArr[0]).toString('ascii'); //tftp的文件名只能是ascii字符
                mode = Buffer.from(msgArr[1]).toString('ascii'); //tftp的文件名只能是ascii字符
                console.log(mode, filename);
                buf = this.makePack(ACK);
                break;
            case DATA:
                console.log('data');
                console.log(msg);
                packetNo = msg.readUInt16BE(0);
                this.dataPacketNo = packetNo;
                buf = this.makePack(ACK);
                console.log(buf);
                console.log('_________________')
                break;
            case ACK:
                //console.log('ack');
                packetNo = msg.readUInt16BE(0);
                this.dataPacketNo = packetNo + 1;

                if(this.mode == MOCTET) {
                    let readBuf = Buffer.alloc(DATASIZE);
                    let nbyte = 0;
                    if(this.fd) {
                        nbyte = fs.readSync(this.fd, readBuf, 0, DATASIZE);
                        this.data = readBuf;
                    } else {
                        this.data = '';
                    }

                    if(nbyte < DATASIZE && this.fd) {
                        fs.closeSync(this.fd);
                        this.fd = null;
                    }
                }

                buf = this.makePack(DATA);
                break;
            case ERROR:
                console.log(`客户端报错: ${String.fromCharCode(...msg.slice(2))}`);
                if(this.fd) {
                    fs.closeSync(this.fd);
                    this.fd = null;
                }

                break;
                        
        }
        if(buf !== undefined) {
            server.send(buf, rinfo.port, rinfo.address);
        }

    }

    makePack(opcode) {
        let cBuf, //opcode_buf
            nBuf, //block_number_buf
            eBuf, //error_buf
            dataBuf,
            buf;
        switch(opcode) {
            case RRQ:
                cBuf = new Uint8Array([0,DATA]);
                nBuf = new Uint8Array([0,this.dataPacketNo]);

                switch(this.mode) {
                    case MASCII:
                        dataBuf = Buffer.from(this.data);
                        if(dataBuf.length >= this.dataPacketNo*DATASIZE) {
                            dataBuf = dataBuf.slice((this.dataPacketNo-1)*DATASIZE, this.dataPacketNo*DATASIZE)
                        } else {
                            dataBuf = dataBuf.slice((this.dataPacketNo-1)*DATASIZE, dataBuf.length)
                        }
                        break;
                    case MOCTET:
                        dataBuf = this.data;
                        break;
                }

                buf = Buffer.concat([cBuf, nBuf, dataBuf]);
                break;
            case WRQ:
                break;
            case DATA:
                cBuf = new Uint8Array([0,DATA]);
                nBuf = new Uint16Array([this.dataPacketNo]);

                switch(this.mode) {
                    case MASCII:
                        dataBuf = Buffer.from(this.data);
                        if(dataBuf.length >= this.dataPacketNo*DATASIZE) {
                            dataBuf = dataBuf.slice((this.dataPacketNo-1)*DATASIZE, this.dataPacketNo*DATASIZE);
                        } else {
                            dataBuf = dataBuf.slice((this.dataPacketNo-1)*DATASIZE, dataBuf.length);
                        }
                        break;
                    case MOCTET:
                        dataBuf = this.data;
                        break;
                }

                if(!dataBuf) {
                    dataBuf = Buffer.alloc(0);
                }
                buf = Buffer.concat([cBuf, new Uint8Array(nBuf.buffer, 1, 1), new Uint8Array(nBuf.buffer, 0, 1), dataBuf]); //Uint16Array转Uint8Array注意大小端排序

                break;
            case ACK:
                cBuf = new Uint8Array([0,ACK]);
                nBuf = new Uint16Array([this.dataPacketNo]);
                buf = Buffer.concat([cBuf, new Uint8Array(nBuf.buffer, 1, 1), new Uint8Array(nBuf.buffer, 0, 1)]);
                break;
            case ERROR:
                cBuf = new Uint8Array([0,ERROR]);
                eBuf = new Uint8Array([0,this.errorNo]);
                dataBuf = Buffer.from(this.errorMsg);
                buf = Buffer.concat([cBuf, eBuf, dataBuf]);
                break;
        }
        return buf;
    }

}

module.exports = Server