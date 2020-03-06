# tftp_server
使用nodejs开发的tftp协议程序

## 协议文档
RFC_index https://www.rfc-editor.org/rfc-index2.html 
RFC1350 https://tools.ietf.org/html/rfc1350 


## 参考网站
https://blog.csdn.net/lisayh/article/details/95045663 
http://blog.sina.com.cn/s/blog_4b0bee65010007d3.html 
https://blog.csdn.net/no_water/article/details/47721585 
https://blog.csdn.net/young2415/article/details/91125718 
https://github.com/gagle/node-tftp 


## 包结构
![data_packet.jpg](https://github.com/bhoold/tftp_server/raw/master/screenshots/data_packet.png)

## 工作流程
![rrq_workflow.jpg](https://github.com/bhoold/tftp_server/raw/master/screenshots/rrq_workflow.png)
![wrq_workflow.jpg](https://github.com/bhoold/tftp_server/raw/master/screenshots/wrq_workflow.png)


## 用法
node index [--documentRoot=filename] [--port=69]