---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: {{clusterName}}-ordererorg-pv
spec:
  capacity:
    storage: 500Mi
  accessModes:
    - ReadWriteMany
  claimRef:
    namespace: {{clusterName}}
    name: {{clusterName}}-ordererorg-pvc
  mountOptions:
  - nfsvers=4.1
  nfs:
    path: /{{clusterName}}/resources/crypto-config/ordererOrganizations/ordererorg
    server: {{nfsServer}}  #change to your nfs server ip here

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
 namespace: {{clusterName}}
 name: {{clusterName}}-ordererorg-pvc
spec:
 accessModes:
   - ReadWriteMany
 resources:
   requests:
     storage: 10Mi

---
