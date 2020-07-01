---
layout: page
title: Part 4
inheader: yes
permalink: /part4/
order: 4
---


**HERE BE DRAGONS**

## Update strategies ##

In the last part we did automated updates with a deployment pipeline. The update *just worked* but we have no idea how the update actually happened, other than that a pod was changed, and we can make the update process safer to help us reach a higher number of [nines](https://en.wikipedia.org/wiki/High_availability).

There are multiple update/deployment/release strategies. We will focus on two of them and how to implement them.

- Rolling update
- Canary release

Both of these update are designed to make sure that the application works during and after an update. Rather than updating every pod at the same time the idea is to update the pods one at a time and confirm that the application works.

### Rolling update ###

By default Kubernetes initiates a "rolling update" when we change the image. That means that every pod is updated sequentially. The rolling update is a great default since it enables the application to be available during the update. If we decide to push an image that does not work the update will automatically stop.

I've prepared an application with 5 versions here. v1 works always, v2 never works, v3 works 90% of the time, v4 will die after 20 seconds and v5 works always.

deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flaky-update-dep
spec:
  replicas: 4
  selector:
    matchLabels:
      app: flaky-update
  template:
    metadata:
      labels:
        app: flaky-update
    spec:
      containers:
        - name: flaky-update
          image: jakousa/dwk-app8:v1
```

```console
$ kubectl apply -f deployment.yaml
  deployment.apps/flaky-update-dep created

$ kubectl get po
  NAME                                READY   STATUS    RESTARTS   AGE
  flaky-update-dep-7b5fd9ffc7-27cxt   1/1     Running   0          87s
  flaky-update-dep-7b5fd9ffc7-mp8vd   1/1     Running   0          88s
  flaky-update-dep-7b5fd9ffc7-m4smm   1/1     Running   0          87s
  flaky-update-dep-7b5fd9ffc7-nzl98   1/1     Running   0          88s
```

Now change the tag to v2 and apply it.

```console
$ kubectl apply -f deployment.yaml
$ kubectl get po --watch
...
```

You can see the rolling update performed but unfortunately the application no longer works. The application is running, it's just that there's a bug which prevents it from working correctly. This is where *ReadinessProbes* come in.

With a *ReadinessProbe* Kubernetes can check if a pod is ready to process requests. The application has an endpoint [/healthz](https://stackoverflow.com/questions/43380939/where-does-the-convention-of-using-healthz-for-application-health-checks-come-f) in port 3541 we can test for health. It will simply answer with status code 500 if it's not working and 200 if it is.

Let's roll the version back to v1 as well so we can test the update to v2 again.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flaky-update-dep
spec:
  replicas: 4
  selector:
    matchLabels:
      app: flaky-update
  template:
    metadata:
      labels:
        app: flaky-update
    spec:
      containers:
        - name: flaky-update
          image: jakousa/dwk-app8:v1
          readinessProbe:
            initialDelaySeconds: 10 # Initial delay until the readiness is tested
            periodSeconds: 5 # How often to test
            httpGet:
               path: /healthz
               port: 3541
```

Here the *initalDelay* and *periodSeconds* will mean that the probe is sent 10 seconds after the container is up and every 5 seconds after that. Now if we change the tag to v2 and apply it

```console
$ kubectl apply -f deployment.yaml
  deployment.apps/flaky-update-dep configured

$ kubectl get po
  NAME                                READY   STATUS    RESTARTS   AGE
  flaky-update-dep-f5c79dbc-8lnqm     1/1     Running   0          115s
  flaky-update-dep-f5c79dbc-86fmd     1/1     Running   0          116s
  flaky-update-dep-f5c79dbc-qzs9p     1/1     Running   0          98s
  flaky-update-dep-54888b877b-dkctl   0/1     Running   0          25s
  flaky-update-dep-54888b877b-dbw29   0/1     Running   0          24s
```

Here three of the pods are completely functional, one of v1 was dropped to make way for the v2 ones but since they do not work they are never READY and the update can not continue.

But as the application is working we can just push a new update on top of the v2. Let's try the v4 which our colleague has assured us will "surely" work:

```console
$ kubectl apply -f deployment.yaml
  deployment.apps/flaky-update-dep configured
```

Now the ReadinessProbe may pass for the first 20 seconds but soon enough every pod will break. Unfortunately *ReadinessProbe* cannot do anything about it, the deploy was successful but the application is buggy.

```console
$ kubectl get po
  NAME                               READY   STATUS    RESTARTS   AGE
  flaky-update-dep-dd78944f4-vv27w   0/1     Running   0          111s
  flaky-update-dep-dd78944f4-dnmcg   0/1     Running   0          110s
  flaky-update-dep-dd78944f4-zlh4v   0/1     Running   0          92s
  flaky-update-dep-dd78944f4-zczmw   0/1     Running   0          90s
```

Let's roll back to previous version. This may come in handy if you ever are in a panic mode and need to roll an update back:

```console
$ kubectl rollout undo deployment flaky-update-dep
  deployment.apps/flaky-update-dep rolled back
```

There's another probe that could've helped us in a situation like this. *LivenessProbes* can be configured similarly to *ReadinessProbes*, but if the check fails the container will be restarted. 

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flaky-update-dep
spec:
  replicas: 4
  selector:
    matchLabels:
      app: flaky-update
  template:
    metadata:
      labels:
        app: flaky-update
    spec:
      containers:
        - name: flaky-update
          image: jakousa/dwk-app8:v1
          readinessProbe:
            initialDelaySeconds: 10 # Initial delay until the readiness is tested
            periodSeconds: 5 # How often to test
            httpGet:
               path: /healthz
               port: 3541
          livenessProbe:
            initialDelaySeconds: 20 # Initial delay until the liveness is tested
            periodSeconds: 5 # How often to test
            httpGet:
               path: /healthz
               port: 3541
```

With this let's just deploy the worst of the versions, v3.

```console
$ kubectl apply -f deployment.yaml
  deployment.apps/flaky-update-dep configured
```

After a while it may look something like this, if you're lucky.

```console
$ kubectl get po
  NAME                                READY   STATUS    RESTARTS   AGE
  flaky-update-dep-fd65cd468-4vgwx   1/1     Running   3          2m30s
  flaky-update-dep-fd65cd468-9h877   0/1     Running   4          2m49s
  flaky-update-dep-fd65cd468-jpz2m   0/1     Running   3          2m13s
  flaky-update-dep-fd65cd468-529nr   1/1     Running   4          2m50s
```

At least something is working!

A *StartupProbe* can delay the liveness probe so that an application with a longer startup can take its time. You may require it in real life but is not discussed further on this course

<div class="exercise" markdown="1">
  <h1>Exercise 4.?: Project v??</h1>

  Create the required Probes and endpoint for the application to ensure that it's working and connected to a database.
  
  Test that it's indeed working with a version without database access, for example by supplying a wrong database url or credentials.
</div>

### Canary release ###

With rolling updates, when including the Probes, we could create releases with no downtime for users. Sometimes this is not enough and you need to be able to do a partial release for some users and get data for the new / upcoming release. Canary release is the term used to describe a release strategy in which we introduce a subset of the users to a new version of the application. Then increasing the number of users in the new version until the old version is no longer used.

At the moment of writing this Canary is not a strategy for deployments. This may be due to the ambiguity of the methods for canary release. We will use [Argo Rollouts](https://argoproj.github.io/argo-rollouts/) to test one type of canary release. At the moment of writing the latest release is v0.8.2.

```console
$ kubectl create namespace argo-rollouts
$ kubectl apply -n argo-rollouts -f https://raw.githubusercontent.com/argoproj/argo-rollouts/stable/manifests/install.yaml
```

Now we have a new resource "Rollout" available to us. The Rollout will replace our previously created deployment and enable us to use a new field:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: flaky-update-dep
spec:
  replicas: 4
  selector:
    matchLabels:
      app: flaky-update
  strategy:
    canary:
      steps:
      - setWeight: 25
      - pause:
          duration: 30s
      - setWeight: 50
      - pause:
          duration: 30s
  template:
    ...
```

The above will first move 25% of the pods to a new version (in our case 1 pod) after which it will wait for 20 seconds, move to 50% of pods and then wait for 20 seconds until every pod is updated. A kubectl plugin from Argo also offers us promote command to enable us to pause the rollout indefinitely and then use the promote to move forward.

There are other options such as the familiar *maxUnavailable* but the defaults will work for us. However, simply rolling slowly to production will not be enough for a canary deployment. Just like with rolling updates we need to know the status of the application.

With another custom resource we've already installed with Argo Rollouts called "AnalysisTemplate" we will be able to define a test that doesn't let the broken versions through.

If you don't have Prometheus available go back to part 2 for a reminder. We'll have the analysis done as the version is updating. If the analysis fails it will automatically cancel the rollout. 

```yaml
  ...
  strategy:
    canary:
      steps:
      - setWeight: 50
      - analysis:
          templates:
          - templateName: restart-rate
  template:
  ...
```

The CRD (Custom Resource Definition) AnalysisTemplate will, in our case, use Prometheus and send a query. The query result is then compared to a preset value. In this simplified case if the number of overall restarts over the last 2 minutes is higher than two it will fail the analysis. *initialDelay* will ensure that the test is not run until the data required is gathered. Note that this is not a robust test as the production version may crash and prevent the update even if the update itself is working correctly. The *AnalysisTemplate* is not dependant on Prometheus and could use a different source, such as a json endpoint, instead.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: restart-rate
spec:
  metrics:
  - name: restart-rate
    initialDelay: 2m
    successCondition: result < 2
    provider:
      prometheus:
        address: http://prometheus-operator-159041-prometheus.prometheus.svc.cluster.local:9090 # DNS name for my Prometheus, find yours with kubectl describe svc ...
        query: |
          scalar(
            sum(kube_pod_container_status_restarts_total{namespace="default", container="flaky-update"}) -
            sum(kube_pod_container_status_restarts_total{namespace="default", container="flaky-update"} offset 2m)
          )
```

With the new Rollout and AnalysisTemplate we can safely try to deploy any version. Deploy for v2 is prevented with the Probes we set up. Deploy for v3 will automatically roll back when it notices that it has random crashes. And v4 will also fail. The short 2 minutes to test may still let a version pass. With more steps and pauses for analysis and more robust tests we could be more confident in our solution. Use `kubectl describe ar flaky-update-dep-6d5669dc9f-2-1` to get info for a specific AnalysisRun.

<div class="exercise" markdown="1">
  <h1>Exercise 4.?: Project v??</h1>


</div>

<div class="exercise" markdown="1">
  <h1>Exercise 4.?: Project v??</h1>

Create an AnalysisTemplate for the project that will monitor the memory usage for the first 10 minutes.
</div>

### Other deployment strategies ###

Kubernetes supports Recreate strategy which takes down the previous pods and replaces everything with the updated one. This creates a moment of downtime for the application but ensures that different versions are not running at the same time. Argo Rollouts supports BlueGreen strategy, in which a new version is run side by side to the new one but traffic is switched between the two at a certain point, such as after running update scripts or after your QA team has approved the new version.

## Message Queues ##

Message Queues are a method for communication between services. They have a wide range of use cases and are helpful when you want to scale applications. A number of HTTP REST API services that want to communicate with each other require that the services know each other’s addresses. Whereas when using message queues, messages are sent to and received from the message queue, respectively.

The section headline "Message Queues" can unfortunately be a little bit misleading. We will be using [NATS](https://docs.nats.io/), a "messaging system", to explore the benefits of messaging. Before we get started we will need to discuss the differences between NATS and a more conventional message queue.

With NATS we can implement "at-most-once" messaging between our services. Conventionally message queues can persist the messages until another service consumes it. For example, in a case where none of the handlers for a message are available. "NATS Streaming", or STAN, is the opposite of NATS and would offer us "at-least-once" messaging with persistence.

This in mind we can design our first application that uses messages for communication. 

We have a data set of 100 000 json objects that we need to do some heavy processing on and then save the processed data. Unfortunately processing a single json object takes so long that processing all of the data would require hours of work. To solve this I've split the application into smaller services that we can scale individually.

The application is in 3 parts, for simplification the saving to database and fetching from external API are omitted:

- Fetcher, which fetches unprocessed data and passes it to NATS.
- Mapper, which processes the data from NATS and after processing sends it back to NATS.
- Saver, which receives the processed data from NATS and finally (could) save it.

In this case the application is designed so that Fetcher can not be scaled. Fetcher splits the data into chunks of a 100 objects and keeps a record of which chunks have not been processed. Fetcher will wait for a Mapper to send a message confirming that it's listening before sending data forward. Note how the available Mapper will be the one to receive the message so the fastest Mapper could process a large number of chunks while the some of them might crash or be extremely slow. Saver will send a confirmation to Fetcher when a chunk has been saved and it will mark it as processed. So even if any part of the application crashes all of the data will be processed and saved.

TODO IMAGE HERE