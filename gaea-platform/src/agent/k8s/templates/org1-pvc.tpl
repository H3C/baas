---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: {{clusterName}}-org1-pv
spec:
  capacity:
    storage: 500Mi
  accessModes:
    - ReadWriteMany
  claimRef:
    namespace: {{clusterName}}
    name: {{clusterName}}-org1-pvc
  mountOptions:
  - nfsvers=4.1
  nfs:
    path: /{{clusterName}}/resources/crypto-config/peerOrganizations/org1
    server: {{nfsServer}}  #change to your nfs server ip here

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
 namespace: {{clusterName}}
 name: {{clusterName}}-org1-pvc
spec:
 accessModes:
   - ReadWriteMany
 resources:
   requests:
     storage: 10Mi

---
