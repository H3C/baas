apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  namespace: {{clusterName}}
  name: ca-org1
spec:
  replicas: 1
  strategy: {}
  template:
    metadata:
      labels:
       app: hyperledger
       role: ca
       org: org1
       name: ca
    spec:
     containers:
       - name: ca
         image: hyperledger/fabric-ca:x86_64-1.0.5
         env:
         - name:  FABRIC_CA_HOME
           value: /etc/hyperledger/fabric-ca-server
         - name:  FABRIC_CA_SERVER_CA_NAME
           value: ca
         - name:  FABRIC_CA_SERVER_TLS_ENABLED
           value: "false"
         - name:  FABRIC_CA_SERVER_TLS_CERTFILE
           value: /etc/hyperledger/fabric-ca-server-config/ca.org1-cert.pem
         - name:  FABRIC_CA_SERVER_TLS_KEYFILE
           value: /etc/hyperledger/fabric-ca-server-config/2e6853c0049bf2a37b9811bd8804f610ad834b85118919393f298c19ac4c5639_sk
         ports:
          - containerPort: 7054
         command: ["sh"]
         args:  ["-c", " fabric-ca-server start --ca.certfile /etc/hyperledger/fabric-ca-server-config/ca.org1-cert.pem --ca.keyfile /etc/hyperledger/fabric-ca-server-config/2e6853c0049bf2a37b9811bd8804f610ad834b85118919393f298c19ac4c5639_sk -b admin:adminpw -d "]
         volumeMounts:
          - mountPath: /etc/hyperledger/fabric-ca-server-config
            name: certificate
            subPath: ca/
          - mountPath: /etc/hyperledger/fabric-ca-server
            name: certificate
            subPath: fabric-ca-server/
     volumes:
       - name: certificate
         persistentVolumeClaim:
             claimName: {{clusterName}}-org1-pvc

---
apiVersion: v1
kind: Service
metadata:
   namespace: {{clusterName}}
   name: ca-org1
spec:
 selector:
   app: hyperledger
   role: ca
   org: org1
   name: ca
 type: NodePort
 ports:
   - name: endpoint
     protocol: TCP
     port: 7054
     targetPort: 7054
     nodePort: {{nodePort}}
