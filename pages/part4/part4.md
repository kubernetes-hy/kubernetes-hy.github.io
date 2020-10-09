---
layout: page
title: Part 4
inheader: no
permalink: /part4/
order: 4
---

In this part we'll go over common practices and examples on how to implement them in Kubernetes. By the end of this part you will be able to

- **Confidently** deploy software with canary releases

- Use and monitor messaging systems (NATS) in Kubernetes

## Update strategies ##

In the last part we did automated updates with a deployment pipeline. The update *just worked* but we have no idea how the update actually happened, other than that a pod was changed, and we can make the update process safer to help us reach a higher number of [nines](https://en.wikipedia.org/wiki/High_availability).

There are multiple update/deployment/release strategies. We will focus on two of them and how to implement them.

- Rolling update
- Canary release

Both of these update strategies are designed to make sure that the application works during and after an update. Rather than updating every pod at the same time the idea is to update the pods one at a time and confirm that the application works.

### Rolling update ###

By default Kubernetes initiates a "rolling update" when we change the image. That means that every pod is updated sequentially. The rolling update is a great default since it enables the application to be available during the update. If we decide to push an image that does not work the update will automatically stop.

I've prepared an application with 5 versions here. v1 works always, v2 never works, v3 works 90% of the time, v4 will die after 20 seconds and v5 works always.

**deployment.yaml**

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

**Kubernetes Best Practices - Kubernetes Health Checks with Readiness and Liveness Probes**

<iframe width="560" height="315" src="https://www.youtube.com/embed/mxEvAPQRwhw" frameborder="0" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

With a *ReadinessProbe* Kubernetes can check if a pod is ready to process requests. The application has an endpoint [/healthz](https://stackoverflow.com/questions/43380939/where-does-the-convention-of-using-healthz-for-application-health-checks-come-f) in port 3541 we can test for health. It will simply answer with status code 500 if it's not working and 200 if it is.

Let's roll the version back to v1 as well so we can test the update to v2 again.

**deployment.yaml**

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

{% include_relative exercises/4_01.html %}

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

Let's roll back to the previous version. This may come in handy if you ever are in a panic mode and need to roll an update back:

```console
$ kubectl rollout undo deployment flaky-update-dep
  deployment.apps/flaky-update-dep rolled back
```

There's another probe that could've helped us in a situation like this. *LivenessProbes* can be configured similarly to *ReadinessProbes*, but if the check fails the container will be restarted. 

**deployment.yaml**

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

After a while it may look something like this (if you're lucky).

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

{% include_relative exercises/4_02.html %}

### Canary release ###

With rolling updates, when including the Probes, we could create releases with no downtime for users. Sometimes this is not enough and you need to be able to do a partial release for some users and get data for the new / upcoming release. Canary release is the term used to describe a release strategy in which we introduce a subset of the users to a new version of the application. Then increasing the number of users in the new version until the old version is no longer used.

At the moment of writing this Canary is not a strategy for deployments. This may be due to the ambiguity of the methods for canary release. We will use [Argo Rollouts](https://argoproj.github.io/argo-rollouts/) to test one type of canary release. At the moment of writing the latest release is v0.8.2.

```console
$ kubectl create namespace argo-rollouts
$ kubectl apply -n argo-rollouts -f https://raw.githubusercontent.com/argoproj/argo-rollouts/stable/manifests/install.yaml
```

Now we have a new resource "Rollout" available to us. The Rollout will replace our previously created deployment and enable us to use a new field:

**rollout.yaml**

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

{% include_relative exercises/4_03.html %}

The CRD (Custom Resource Definition) AnalysisTemplate will, in our case, use Prometheus and send a query. The query result is then compared to a preset value. In this simplified case if the number of overall restarts over the last 2 minutes is higher than two it will fail the analysis. *initialDelay* will ensure that the test is not run until the data required is gathered. Note that this is not a robust test as the production version may crash and prevent the update even if the update itself is working correctly. The *AnalysisTemplate* is not dependant on Prometheus and could use a different source, such as a JSON endpoint, instead.

**analysistemplate.yaml**

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
        address: http://kube-prometheus-stack-1602-prometheus.prometheus.svc.cluster.local:9090 # DNS name for my Prometheus, find yours with kubectl describe svc ...
        query: |
          scalar(
            sum(kube_pod_container_status_restarts_total{namespace="default", container="flaky-update"}) -
            sum(kube_pod_container_status_restarts_total{namespace="default", container="flaky-update"} offset 2m)
          )
```

With the new Rollout and AnalysisTemplate we can safely try to deploy any version. Deploy for v2 is prevented with the Probes we set up. Deploy for v3 will automatically roll back when it notices that it has random crashes. And v4 will also fail. The short 2 minutes to test may still let a version pass. With more steps and pauses for analysis and more robust tests we could be more confident in our solution. Use `kubectl describe ar flaky-update-dep-6d5669dc9f-2-1` to get info for a specific AnalysisRun.

{% include_relative exercises/4_04.html %}

### Other deployment strategies ###

Kubernetes supports Recreate strategy which takes down the previous pods and replaces everything with the updated one. This creates a moment of downtime for the application but ensures that different versions are not running at the same time. Argo Rollouts supports BlueGreen strategy, in which a new version is run side by side to the new one but traffic is switched between the two at a certain point, such as after running update scripts or after your QA team has approved the new version.

{% include_relative exercises/4_05.html %}

## Message Queues ##

Message Queues are a method for communication between services. They have a wide range of use cases and are helpful when you want to scale applications. A number of HTTP REST API services that want to communicate with each other require that the services know each other’s addresses. Whereas when using message queues, messages are sent to and received from the message queue, respectively.

The section headline "Message Queues" can unfortunately be a little bit misleading. We will be using [NATS](https://docs.nats.io/), a "messaging system", to explore the benefits of messaging. Before we get started we will need to discuss the differences between NATS and a more conventional message queue.

With NATS we can implement "at-most-once" messaging between our services. Conventionally message queues can persist the messages until another service consumes it. For example, in a case where none of the handlers for a message are available. "NATS Streaming", or STAN, is the opposite of NATS and would offer us "at-least-once" messaging with persistence.

This in mind we can design our first application that uses messages for communication. 

We have a data set of 100 000 JSON objects that we need to do some heavy processing on and then save the processed data. Unfortunately processing a single json object takes so long that processing all of the data would require hours of work. To solve this I've split the application into smaller services that we can scale individually.

The application is in 3 parts, for simplification the saving to a database and fetching from external API are omitted:

- Fetcher, which fetches unprocessed data and passes it to NATS.
- Mapper, which processes the data from NATS and after processing sends it back to NATS.
- Saver, which receives the processed data from NATS and finally (could) save it.

![]({{ "/images/part4/app9-plan.png" | absolute_url }})

**deployment.yaml**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mapper-dep
spec:
  replicas: 10
  selector:
    matchLabels:
      app: mapper
  template:
    metadata:
      labels:
        app: mapper
    spec:
      containers:
        - name: mapper
          image: jakousa/dwk-app9-mapper:0bcd6794804c367684a9a79bb142bb4455096974
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fetcher-dep
spec:
  replicas: 1
  selector:
    matchLabels:
      app: fetcher
  template:
    metadata:
      labels:
        app: fetcher
    spec:
      containers:
        - name: fetcher
          image: jakousa/dwk-app9-fetcher:0bcd6794804c367684a9a79bb142bb4455096974
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: saver-dep
spec:
  replicas: 1
  selector:
    matchLabels:
      app: saver
  template:
    metadata:
      labels:
        app: saver
    spec:
      containers:
        - name: saver
          image: jakousa/dwk-app9-saver:0bcd6794804c367684a9a79bb142bb4455096974
```

In this case the application is designed so that Fetcher can not be scaled. Fetcher splits the data into chunks of 100 objects and keeps a record of which chunks have not been processed. Fetcher will wait for a Mapper to send a message confirming that it's listening before sending data forward. Note how the available Mapper will be the one to receive the message so the fastest Mapper could process a large number of chunks while some of them might crash or be extremely slow. Saver will send a confirmation to Fetcher when a chunk has been saved and it will mark it as processed. So even if any part of the application crashes all of the data will be processed and saved.

We're going to use Helm to install NATS into our cluster.

```console
$ helm repo add nats https://nats-io.github.io/k8s/helm/charts/
  ...
$ helm repo update
...
$ helm install my-nats nats/nats
  NAME: my-nats
  LAST DEPLOYED: Thu Jul  2 15:04:56 2020
  NAMESPACE: default
  STATUS: deployed
  REVISION: 1
  TEST SUITE: None
  NOTES:
  You can find more information about running NATS on Kubernetes
  in the NATS documentation website:
  
    https://docs.nats.io/nats-on-kubernetes/nats-kubernetes
  
  NATS Box has been deployed into your cluster, you can
  now use the NATS tools within the container as follows:
  
    kubectl exec -n default -it my-nats-box -- /bin/sh -l
  
    nats-box:~# nats-sub test &
    nats-box:~# nats-pub test hi
    nats-box:~# nc my-nats 4222
  
  Thanks for using NATS!
```

This added NATS into the cluster. At this state however, the applications don't know where the NATS is so we'll add that to each of the deployments

**deployment.yaml**

```yaml
      ...
      containers:
        - name: mapper
          image: jakousa/dwk-app9-mapper:0bcd6794804c367684a9a79bb142bb4455096974
          env:
            - name: NATS_URL
              value: nats://my-nats:4222
      ...
          image: jakousa/dwk-app9-fetcher:0bcd6794804c367684a9a79bb142bb4455096974
          env:
            - name: NATS_URL
              value: nats://my-nats:4222
      ...
          image: jakousa/dwk-app9-saver:0bcd6794804c367684a9a79bb142bb4455096974
          env:
            - name: NATS_URL
              value: nats://my-nats:4222
```

After applying the modified deployments we can confirm that everything is working here by reading the logs of the fetcher - `kubectl logs fetcher-dep-7d799bb6bf-zz8hr -f`. We'll want to monitor the state of NATS as well. Fortunately it already has a Prometheus Exporter included in port 7777. We can access from browser with `kubectl port-forward my-nats-0 7777:7777` in [http://127.0.0.1:7777/metrics](http://127.0.0.1:7777/metrics) to confirm that it works. Connecting Prometheus to the exporter will require a new resource ServiceMonitor, a CRD (Custom Resource Definition).

**servicemonitor.yaml**

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: monitoring-nats
  namespace: prometheus
  # We need a label so that Prometheus knows to listen to this
spec:
  selector:
    matchLabels:
      app: my-nats
  endpoints:
    - interval: 10s
      path: /metrics
      port: # We need to define the port which should be listened
  namespaceSelector:
    matchNames:
      - default
```

Let's fill in the missing data with a bit of detective work. Let's use the label the already existing ServiceMonitors use for now. We can check it with the following.

```console
$ kubectl -n prometheus get prometheus
  NAME                                    VERSION   REPLICAS   AGE
  prometheus-operator-159378-prometheus   v2.18.1   1          110s

$ kubectl describe prometheus prometheus-operator-159378-prometheus
...
  Service Monitor Selector:
    Match Labels:
      Release:  prometheus-operator-1593782473
...
```

So the label needs to be "release: prometheus-operator-1593782473" unless we'd like to define a new Prometheus resource. The port has been set by my-nats so we can find out the name with 

```console
$ kubectl describe svc my-nats
  Port:              metrics  7777/TCP
  TargetPort:        7777/TCP
  Endpoints:         10.42.1.31:7777
```

So finally we can fill it with 

```console
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: monitoring-nats
  namespace: prometheus
  labels:
    release: prometheus-operator-1593782473
spec:
  selector:
    matchLabels:
      app: my-nats
  endpoints:
    - interval: 10s
      path: /metrics
      port: metrics
  namespaceSelector:
    matchNames:
      - default
```

And now Prometheus has access to the new data. Let's check Prometheus:

```console
$ kubectl -n prometheus port-forward prometheus-prometheus-operator-159378-prometheus-0 9090
Forwarding from 127.0.0.1:9090 -> 9090
Forwarding from [::1]:9090 -> 9090
```

And then Prometheus API should return a result:

```console
$ curl 'http://localhost:9090/api/v1/query?query=nats_varz_cpu' 
  {"status":"success","data":{"resultType":"vector","result":[{"metric":{"__name__":"nats_varz_cpu","endpoint":"metrics","instance":"10.42.1.31:7777","job":"my-nats","namespace":"default","pod":"my-nats-0","server_id":"NDYRLXL5ULWCAH7F3HRSIGHEENDQJGCJRLREAZY46FBPREIED4F24YQS","service":"my-nats"},"value":[1593781676.273,"2"]}]}}
```

If the result here is empty then something is wrong, the result may be a success even if the query doesn't make sense.

Now we just need to add a Grafana dashboard for the data. Let's import a dashboard from [here](https://raw.githubusercontent.com/nats-io/prometheus-nats-exporter/5084a32850823b59069f21f3a7dde7e488fef1c6/walkthrough/grafana-nats-dash.json) instead of configuring our own. Note that the dashboard resources are defined as "gnatsd_XXXX" whereas our resources as seen from the Prometheus Exporter `kubectl port-forward my-nats-0 7777:7777` in [http://127.0.0.1:7777/metrics](http://127.0.0.1:7777/metrics) are "nats_XXXX". Quick replace all later we can paste it into Grafana.

```console
$ kubectl -n prometheus port-forward prometheus-operator-1593782473-grafana-7d457dff56-m2r6d 3000
```

Here we can paste the JSON to "import via panel json" and then choose Prometheus as the source on the following page.

![]({{ "/images/part4/grafana_import.png" | absolute_url }})

And now we have a simple dashboard with data:

![]({{ "/images/part4/grafana_nats.png" | absolute_url }})

This is now the final configuration:

![]({{ "/images/part4/app9-nats-prometheus-grafana.png" | absolute_url }})

{% include_relative exercises/4_06.html %}

{% include_relative exercises/4_07.html %}

## Summary ##

Submit your completed exercises through the [submission application](https://studies.cs.helsinki.fi/stats/courses/kubernetes2020)

By this point you have a grasp on the variety of decisions that are made during application development and how it may affect the operations side.

We're now at the stage where we are using some of the best web development practices and all of it using Kubernetes.

* Deployments to multiple branch-specific environments

* Canary releases with automatic malfunction detection

* State of the art monitoring with Grafana and Prometheus


