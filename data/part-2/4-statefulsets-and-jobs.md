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

In [part 1](/part-1/4-introduction-to-storage) we learned how volumes are used with PersistentVolumes and PersistentVolumeClaims. We used *Deployment* with them and everything worked well enough for our testing purposes. The problem is that *Deployment* creates and scales pods that are *replicas* - they are new copies of the same container that are running in parallel. So the claim is shared by all pods in that deployment, and this might cause non-desired side-effects that could lead e.g. to data corruption.

[StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/) are simillar to *Deployments* except those make sure that if a pod dies the replacement is identical, with the same network identity and name. In addition, if the pod is scaled, each copy will have its own storage. So StatefulSets are for _stateful applications_, where the state is stored inside the app, not outside, such as in a database. You could use StatefulSets to scale video game servers that require state, such as a Minecraft server. Or run a database. For data safety when deleted, StatefulSets will not delete the volumes they are associated with.

<text-box name="ReplicaSets" variant="hint">
Deployment creates pods using a Resource called "ReplicaSet". We're using ReplicaSets through Deployments so we haven't really had to talk about them.
</text-box>

Let's run the key-value database [Redis](https://redis.io) and save some data there. We're going to need a PersistentVolume as well as an application that utilizes the Redis.

StatefulSets require a "Headless Service" to be responsible for the network identity. Let us start by defining a headless service" with `clusterIP: None`, this will instruct Kubernetes not to do proxying or load balancing and instead allow a direct access to the Pods:

**service.yaml**

```yaml
apiVersion: v1 # Includes the Service for lazyness
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
            - name: data
              mountPath: /data
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

Note that since the containers are now inside the same pod, those share the network and the redisfiller app sees Redis in address _localhost:6379_.

The stateful set looks a lot like a *Deployment* but uses a [volumeClaimTemplate](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#volume-claim-templates) to claim a volume for each pod.

In part 1 we jumped through a few hurdles to get ourselves storage, but now we use a K3s-provided *dynamically* provisioned storage by specifying `storageClassName: local-path`

Since the [local-path storage](https://docs.k3s.io/storage#setting-up-the-local-storage-provider) is dynamically provisioned, we don't need to create PersistentVolume for the volume, K3s takes care of that for us.

To learn more, see [Rancher documentation](https://rancher.com/docs/k3s/latest/en/storage/) and read more about [dynamic provisioning](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#dynamic). If you want, you can revisit the examples and exercises of part 1 and use dynamic provisioning instead of manual provisioning in your applications!

You can now open two terminals and run `$ kubectl logs -f redis-stset-X redisfiller` where X is 0 or 1. To confirm it's working we can delete a pod and it will restart and continue right where you left off. In addition, we can delete the StatefulSet and the volume will stay and bind back when you apply the StatefulSet again.

<exercise name='Exercise 2.07: Stateful applications'>

  Run a Postgres database and save the Ping-pong application counter into the database.

  The Postgres database and Ping-pong application should **not be** in the same pod.
  A single Postgres database is enough and it may disappear with the cluster but it should survive even if all pods are taken down.

  You should not write the database password in plain text.

</exercise>

<exercise name='Exercise 2.08: Project v1.2'>

  Create a database and save the todos there, again, the database should have its own pod.

  Use Secrets and/or ConfigMaps to have the backend access the database.

</exercise>

## Jobs and CronJobs ##

_Job_ resource is used to run a container that has an end state once. The status of a job is saved so that they can be monitored after the execution has ended. Jobs can be configured so that it runs multiple instances of the same task in concurrently, sequentially and until a set number of successful completions have been achieved.

An example use case for jobs would be creating backups from a database. Our _Job_ will use environment value URL as the url from which the dump is created and pass it along to a storage server. Our database will be postgres and the tool for creating a backup is pg_dump. Now we just need to do the coding. A simple bash script should be enough.

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

I have the above image ready in `jakousa/simple-backup-example`. Since we don't have any postgres available to us yet let's deploy one first:

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
$ kubectl get po
  NAME                                READY   STATUS    RESTARTS   AGE
  postgres-ss-0                       1/1     Running   0          65s
```

Now if we apply the following job that uses the image

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

_CronJobs_ run a _Job_ on schedule. You may have used cron before, these are essentially the same.

<exercise name='Exercise 2.09: Daily todos'>

  Create a CronJob that generates a new todo every day to remind you to do 'Read < URL >'.

  Where < URL > is a wikipedia article that was decided by the job randomly. It does not have to be a hyperlink, the user can copy paste the url from the todo.

  https://en.wikipedia.org/wiki/Special:Random responds with a redirect to a random wikipedia page so you can ask it to provide a random article for you to read. TIP: Check location header

</exercise>

