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

After a while it may look something like this if you're lucky.

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

### Canary release ###

TODO: I have no idea what will happen here, but canary release sounds nice in theory

### Other strategies ###

There are also update strategies that support A/B testing where a group of users (or QA testers) are using a different version. 
