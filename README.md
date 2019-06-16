h3c baas system:

编译方法：

请先安装node 8.11.3，地址在
https://nodejs.org/download/release/v8.11.3/

cd src/static/dashboard/

yarn install

npm run build

cd ../../../user-dashboard/src/

yarn install

npm run build

cd packages/fabric-1.0/

yarn install

cd ../fabric-1.1/

yarn install

cd ../fabric-1.4/

yarn install

cd ../../../..

make docker

启动方法 make start

使用方法:

访问operate-dashboard

http://ip:8071

访问user-dashboard

http://ip:8081

