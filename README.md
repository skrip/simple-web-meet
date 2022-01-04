## SIMPLE WEB MEET

check it out live [running web](https://ngobss.com)

## Installation

First, install the dependencies via npm like so:

```
npm i
```

Once those are installed, you can run with:

```
npm run build
npm run start
```

for testing in localhost you can use [mkcert](https://github.com/FiloSottile/mkcert) for generate self-signed certificates  
  
create .env in root project folder with contains 

KEY_FILE=/path/file/key/pem  
CERT_FILE=/path/file/cert/pem  
APP_PORT=3200  
WEBRTC_IP=192.168.1.8  

  
## Dependencies
* [mediasoup](https://github.com/versatica/mediasoup)
* [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js/)



