# tftp_server
使用nodejs开发的tftp协议程序

## 参考网站
https://blog.csdn.net/lisayh/article/details/95045663
http://blog.sina.com.cn/s/blog_4b0bee65010007d3.html
https://blog.csdn.net/no_water/article/details/47721585
https://blog.csdn.net/young2415/article/details/91125718
https://github.com/gagle/node-tftp


## 包结构

      |-------------------------------------------------------|
RRQ   |   操作码 |    文件名      |   0    |  模式    |   0    |
读请求|   2Bytes |    n Bytes    | 1 Byte | n Bytes  | 1 Byte |
      |-------------------------------------------------------|


## 用法
node index [--documentRoot=filename] [--port=69]