---
path: '/part-2/4-statefulsets-and-jobs'
title: 'StatefulSets and Jobs'
hidden: false
---

<text-box variant='learningObjectives' name='Learning Objectives'>

After this section you

- can deploy a stateful application, such as a database, to Kubernetes

- know how to use jobs and cronjobs to execute periodic or single-time tasks

</text-box>

## StatefulSets ##

In [part 1](/part-1/4-introduction-to-storage) we learned how volumes are used with PersistentVolumes and PersistentVolumeClaims. We used *Deployment* with them and everything worked well enough for our testing purposes. If there is just one pod in a deployment, all is fine. When scaling, things might be different. The problem is that *Deployment* creates and scales pods that are *replicas* - they are new copies of the same container that are running in parallel. So the volume is shared by all pods in that deployment. For read-only volumes this is ok, but for volumes that have read-write access, this might cause problems and can in the worst case cause even data corruption.

[StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/) are similar to *Deployments* except those make sure that if a pod dies the replacement is identical, with the same network identity and name. In addition, if the pod is scaled, each copy will have its own storage. So StatefulSets are for _stateful applications_, where the state is stored inside the app, not outside, such as in a database. You could use StatefulSets to scale video game servers that require state, such as a Minecraft server. Or run a database. For data safety when deleted, StatefulSets will not delete the volumes they are associated with.

<text-box name="ReplicaSets" variant="hint">
Deployment creates pods using a Resource called "ReplicaSet". We're using ReplicaSets through Deployments so we haven't really had to talk about them.
</text-box>

Let's run the key-value database [Redis](https://redis.io) and save some data there. We're going to need a PersistentVolume as well as an application that utilizes the Redis.

StatefulSet requires a "Headless Service" to be responsible for the network identity. Let us start by defining a "headless service" with `clusterIP: None`, this will instruct Kubernetes not to do proxying or load balancing, but instead allow direct access to the Pods:

**service.yaml**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-svc
  labels:
    app: redis
spec:
  ports:
  - port: 6379
    name: web
  clusterIP: None
  selector:
    app: redisapp
```

The stateful set with two containers, Redis and [redisfiller](https://github.com/kubernetes-hy/material-example/tree/master/app5), that is a simple app that uses Redis:

**statefulset.yaml**

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-stset
spec:
  serviceName: redis-svc
  replicas: 2
  selector:
    matchLabels:
      app: redisapp
  template:
    metadata:
      labels:
        app: redisapp
    spec:
      containers:
        - name: redisfiller
          image: jakousa/dwk-app5:54203329200143875187753026f4e93a1305ae26
        - name: redis
          image: redis:5.0
          ports:
            - name: web
              containerPort: 6379
          volumeMounts:
            - name: redis-data-storage
              mountPath: /data
  volumeClaimTemplates:
    - metadata:
        name: redis-data-storage
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: local-path
        resources:
          requests:
            storage: 100Mi
```

Note that since the containers are now inside the same pod, those share the network and the _redisfiller_ app sees Redis in address _localhost:6379_.

The stateful set looks a lot like a *Deployment* but uses a [volumeClaimTemplate](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#volume-claim-templates) to claim its own volume for each pod.

In part 1 we jumped through a few hurdles to get ourselves storage, but now we use a K3s-provided *dynamically* provisioned storage by specifying `storageClassName: local-path`

Since the [local-path storage](https://docs.k3s.io/storage#setting-up-the-local-storage-provider) is dynamically provisioned, we don't need to create PersistentVolume for the volume, K3s takes care of that for us.

To learn more, see [Rancher documentation](https://rancher.com/docs/k3s/latest/en/storage/) and read more about [dynamic provisioning](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#dynamic). If you want, you can revisit the examples and exercises of part 1 and use dynamic provisioning instead of manual provisioning in your applications!

You can now open two terminals and run `$ kubectl logs -f redis-stset-X redisfiller` where X is 0 or 1. To confirm it's working we can delete a pod and it will restart and continue right where you left off. In addition, we can delete the StatefulSet and the volume will stay and bind back when you apply the StatefulSet again.

Let us once more stress the point, that a StatefulSet creates a separate volume for all the replicas. We can see, that there are indeed two PersistentVolumeClaims for our app:

```bash
$ kubectl get pvc
NAME              STATUS   VOLUME                   CAPACITY   ACCESS MODES   STORAGECLASS   AGE
data-redis-ss-0   Bound    pvc-f318ca82-d584-4e10   100Mi      RWO            local-path     53m
data-redis-ss-1   Bound    pvc-d8e5b81a-05ec-420b   100Mi      RWO            local-path     53m
```

So the `volumeClaimTemplates` in the StatefulSet definition is used to create an individual PersistentVolumeClaim for each of the replicas in the set.

Let us observe a bit more carefully how the headless Service works. As seen in the above definition, it was defined with `clusterIP: None`, so the service has now cluster IP and the access should be done directly to the pods.

Let us try to _ping_ to the service from our busybox pod:

```bash
$ ping redis-svc
PING redis-svc (10.42.2.25): 56 data bytes
64 bytes from 10.42.2.25: seq=0 ttl=64 time=0.165 ms
```

So it seems that it is possible to reach the service by using just the service name _redis-svc_, it resolved to IP address _10.42.2.25_.

With the command [nslookup](https://en.wikipedia.org/wiki/Nslookup) we can see that actually the domain name of the service _redis-svc_ resolves to two different IP addresses:

```bash
$ nslookup redis-svc
Name:	redis-svc.default.svc.cluster.local
Address: 10.42.2.25
Name:	redis-svc.default.svc.cluster.local
Address: 10.42.1.32
```

So, the ping just picked the first of the  IP address. All the replicas of the set have actually own domain names:

```bash
$ ping redis-stset-0.redis-svc
PING redis-ss-0.redis-svc (10.42.2.25): 56 data bytes
64 bytes from 10.42.2.25: seq=0 ttl=64 time=0.214 ms

$ ping redis-stsets-1.redis-svc
PING redis-ss-1.redis-svc (10.42.1.32): 56 data bytes
64 bytes from 10.42.1.32: seq=0 ttl=62 time=0.140 ms
```

The identities of the pods are permanent, so if e.g. the pod _redis-stset-0_ dies, it is guaranteed to have the same name when it is scheduled again, and it is still attached to the same volume.


Note that it is possible to define the StatefulSet and the corresponding headless Service in the same file by separating those with three - characters:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-stset
spec:
  serviceName: redis-svc
  replicas: 2
  selector:
    matchLabels:
      app: redisapp
  # more rows
---
apiVersion: v1
kind: Service
metadata:
  name: redis-svc
  labels:
    app: redis
spec:
  ports:
  - port: 6379
    name: web
  clusterIP: None
  selector:
    app: redisapp
```

<exercise name='Exercise 2.07: Stateful applications'>

  Run a Postgres database and save the Ping-pong application counter into the database.

  The Postgres database and Ping-pong application should **not be** in the same pod.
  A single Postgres database is enough and it may disappear with the cluster but it should survive even if all pods are taken down.

  **Hint:** it might be a good idea to ensure that the database is operational and available for connections before you try connecting it from the Ping-pong app. For that purpose, you might just start a stand-alone pod that runs a Postgres image:

```bash
  kubectl run -it --rm --restart=Never --image postgres psql-for-debugging sh
  $ psql postgres://yourpostgresurlhere
  psql (16.2 (Debian 16.2-1.pgdg120+2))
  Type "help" for help.
  postgres=# \d
  Did not find any relations.
```

</exercise>

<exercise name='Exercise 2.08: Project v1.2'>

  Create a database and save the todos there. Again, the database should have its own pod.

  Use Secrets and/or ConfigMaps to have the backend access the database.

</exercise>

## Jobs and CronJobs ##

[Job](https://kubernetes.io/docs/concepts/workloads/controllers/job/) resource is used to run workloads that are not continuous services, but are supposed to run from start to end. The status of a job is saved so that it can be monitored after the execution has ended. Jobs can be configured so that they run multiple instances of the same task concurrently, sequentially and until a set number of successful completions have been achieved.

An example use case for jobs would be creating backups from a database. Our _Job_ will use the environment value URL as the url from which the dump is created and pass it along to a storage server. Our database will be Postgres and the tool for creating a backup is [pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html). Now we just need to do the coding. A simple bash script should be enough.

```bash
#!/usr/bin/env bash
set -e

if [ $URL ]
then
  pg_dump -v $URL > /usr/src/app/backup.sql

  echo "Not sending the dump actually anywhere"
  # curl -F ‘data=@/usr/src/app/backup.sql’ https://somewhere
fi
```

The above script has already been packed to an image [jakousa/simple-backup-example](https://hub.docker.com/r/jakousa/simple-backup-example).

Since we don't have any Postgres available to us yet, let's deploy one first:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-svc
  labels:
    app: postgres
spec:
  ports:
  - port: 5432
    name: web
  clusterIP: None
  selector:
    app: postgres
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-ss
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:13.0
          ports:
            - name: postgres
              containerPort: 5432
          env:
          - name: POSTGRES_PASSWORD
            value: "example"
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: local-path
        resources:
          requests:
            storage: 100Mi
```

Apply the above and check it's running:

```console
$ kubectl get pods
  NAME                                READY   STATUS    RESTARTS   AGE
  postgres-ss-0                       1/1     Running   0          65s
```

Now we can apply the following job that uses the image:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: backup
spec:
  template:
    spec:
      containers:
      - name: backup
        image: jakousa/simple-backup-example
        env:
          - name: URL
            value: "postgres://postgres:example@postgres-svc:5432/postgres"
      restartPolicy: Never # This time we'll run it only once
```

Pods have a few available configurations. For example, we can force it to retry for a number of times by defining `backoffLimit`.

```console
$ kubectl get jobs
  NAME     COMPLETIONS   DURATION   AGE
  backup   1/1           7s         35s

$ kubectl logs backup-wj9r5
  ...
  pg_dump: saving encoding = UTF8
  pg_dump: saving standard_conforming_strings = on
  pg_dump: saving search_path =
  pg_dump: implied data-only restore
  Not sending the dump actually anywhere
```

[CronJobs](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/) are similar to Jobs but they run on schedule. You may have already used [cron](https://fi.wikipedia.org/wiki/Cron) schedule tasks on your server, CronJobs are essentially the same for the containers.

<exercise name='Exercise 2.09: Daily todos'>

  Create a CronJob that generates a new todo every hour to remind you to do 'Read < URL >'.

  Where < URL > is a Wikipedia article that was decided by the job randomly. It does not have to be a hyperlink, the user can copy-paste the URL from the todo.

  https://en.wikipedia.org/wiki/Special:Random responds with a redirect to a random Wikipedia page so you can ask it to provide a random article for you to read. TIP: Check location header

</exercise>

