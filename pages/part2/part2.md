---
layout: page
title: Part 2
inheader: yes
permalink: /part2/
order: 2
---

In this part we'll learn more about management and maintenance as well as expand our knowledge on known features of Kubernetes. By the end of this part you will be able to

- Label and namespace the resources inside a cluster.

- Deploy stateful applications to Kubernetes

- Monitor your application as well as the cluster with advanced tools

## Networking Part 2 ##

In part 1 we managed to setup networking configuration to enable routing traffic from outside of the cluster to a container inside a pod. In Part 2 we'll focus on communication between applications.

Kubernetes includes a DNS service so communication between pods and containers in Kubernetes is as much of a challenge as it was with containers in docker-compose. Containers in a pod share the network. As such every other container inside a pod is accessible from `localhost`. For communication between Pods a *Service* is used as they expose the Pods as a network service. 

The following creates a cluster-internal IP which will enable other pods in the cluster to access the port 8080 of "example" application from http://example-service. ClusterIP is the default type for a Service.

**service.yaml**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: example-service
spec:
  type: ClusterIP
  selector:
    app: example
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 8080
```

> Alternatively each Pod has an IP created by Kubernetes

{% include_relative exercises/2_01.html %}

{% include_relative exercises/2_02.html %}

## Organizing services ##

As you can imagine there may be a lot of resources inside a cluster. In fact, at the moment of writing this Kubernetes supports over 100 000 pods in a single cluster.

### Namespaces ###

Namespaces are used to keep resources separated. A company which uses 1 cluster but has multiple projects can use namespaces to split the cluster into virtual clusters, one for each project. Most commonly they would be used to separate environments such as production, testing, staging. DNS entry for services includes the namespace so you can still have projects communicate with each other if needed through service.namespace address. e.g if the example-service from previous section was in a namespace "ns-test" it could be found from other namespaces via "http://example-service.ns-test".

Accessing namespaces with kubectl is by using `-n` flag. For example you can see what the namespace kube-system has with

```console
$ kubectl get pods -n kube-system 
```

To see everything you can use `--all-namespaces`.

```console
$ kubectl get all --all-namespaces
```

Namespaces should be kept separate - you could run all of the examples and do the exercises of this course in a cluster that is shared with critical software. An administrator should set a *ResourceQuota* for that namespace so that you can safely run anything there. We'll look into resource limits and requests later.

Defining a namespace is a oneliner, but requires the namespace to exist (`kubectl create namespace example-namespace`):

```yaml
...
metadata:
  namespace: example-namespace
  name: example
...
```

If you're using a namespace constantly you can set the namespace to be used by default with `kubectl config set-context --current --namespace=<name>`.

**Kubernetes Best Practices - Organizing Kubernetes with Namespaces**

<iframe width="560" height="315" src="https://www.youtube.com/embed/xpnZX3if9Tc" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

### Labels ###

Labels are used to separate an application from others inside a namespace. They make it possible for having multiple applications as you've used in this course already.

Let's look at the labels in *Deployment* yamls. This is the first yaml we created and you've copy pasted something similar:

**deployment.yaml**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hashgenerator-dep
spec:
  replicas: 1
  selector:
    matchLabels:
      app: hashgenerator
  template:
    metadata:
      labels:
        app: hashgenerator
    spec:
      containers:
        - name: hashgenerator
          image: jakousa/dwk-app1:78031863af07c4c4cc3c96d07af68e8ce6e3afba
```

The *selector* and *matchLabels* reveal that the instructions of the deployment are directed to pods with the following label. *matchLabels* is a key-value pair but we could've used *matchExpressions* instead. While the template metadata includes a label with key-value pair app and hashgenerator. We can use the same label on multiple namespaces and the namespace would keep them from interfering with each other.

{% include_relative exercises/2_03.html %}

{% include_relative exercises/2_04.html %}

## Configuration with Secrets and ConfigMaps ##

*ConfigMaps* help by keeping configuration separate from images. 

*Secrets* help by keeping secrets secret.

Both can be used to introduce variables: Secrets for things like api keys and ConfigMaps for other things you would find as an environment variable.

Let's use [pixabay](https://pixabay.com/) to display images on a simple web app. We will need to utilize authentication with api key.
The api docs are good, we just need to log in to get ourselves a key here https://pixabay.com/api/docs/.

Here's the app available. The application requires a API_KEY environment variable.

```console
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app4/manifests/deployment.yaml \
                -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app4/manifests/ingress.yaml \
                -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app4/manifests/service.yaml
```

The requirement for an environment variable inside a secret is added to the deployment like so

**deployment.yaml**

```yaml
...
      containers:
        - name: imageagain
          envFrom:
          - secretRef:
              name: pixabay-apikey
```

The application won't run at first and we can see the reason with `kubectl get po` and a more detailed with `kubectl describe pod imageapi-dep-...`.

Let's use secret to pass the api key environment variable to the application. 

Secrets use base64 encoding to avoid having to deal with special characters. We would like to use encryption to avoid printing our API_KEY for the world to see but for the sake of testing create and apply a new file secret.yaml with the following:

**secret.yaml**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: pixabay-apikey
data:
  API_KEY: aHR0cDovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PWRRdzR3OVdnWGNR # base64 encoded should look something like this, note that this won't work
```

As the containers are already instructed to use the environment from the secret using it happens automatically. We can now confirm that the app is working and then delete the old secret.

For encrypted secrets let's use ["Sealed Secrets"](https://github.com/bitnami-labs/sealed-secrets). It seems to be a solution until proven otherwise. We need to install it into our local machine as well as to our cluster. Install [instructions](https://github.com/bitnami-labs/sealed-secrets/releases) are simple: apply the correct version to kube-system namespace.

```console
$ kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.12.1/controller.yaml
```

It may take a while to start but after that it's ready to convert your secret into a sealed secret and apply it. Before that confirm that we didn't forget to remove the old secret.

```console
$ kubectl get secrets
  NAME                  TYPE                                  DATA   AGE
  default-token-jfr7n   kubernetes.io/service-account-token   3      36m

$ kubeseal -o yaml < secret.yaml > sealedsecret.yaml
$ kubectl apply -f sealedsecret.yaml
$ kubectl get secrets
  NAME                  TYPE                                  DATA   AGE
  default-token-jfr7n   kubernetes.io/service-account-token   3      37m
  pixabay-apikey        Opaque                                1      2s
```

To confirm everything is working we can delete the pod and let it restart with the new environment variable `kubectl delete po imageapi-dep-...`. Using *SealedSecret* was our first time using a custom resource - you can design your own with the help of the Kubernetes [documentation](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/).

ConfigMaps are similar but the data doesn't have to be encoded and is not encrypted.

{% include_relative exercises/2_05.html %}

## StatefulSets ##

In part 1 we learned how volumes are used with PersistentVolumes and PersistentVolumeClaims. We used *Deployment* with them and everything worked well enough for our testing purposes. The problem is that *Deployment* creates and scales pods that are *replicas* - they are a new copy of the same thing. With PersistentVolumeClaims, the method through which a pod reserves persistent storage, this creates a possibly non-desired effect as the claims are **not** pod specific. The claim is shared by all pods in that deployment.

*StatefulSets* are like *Deployments* except it makes sure that if a pod dies the replacement is identical, with the same network identity and name. In addition if the pod is scaled the copies will have their own storage. StatefulSets are for stateful applications. You could use StatefulSets to scale video game servers that require state, such as a Minecraft server. Or run a database. For data safety when deleted or scaled down StatefulSets will not delete the volumes they are associated with.

> Deployment creates pods using a Resource called "ReplicaSet". We're using ReplicaSets through Deployments.

Let's run redis and save some information there. We're going to need a PersistentVolume as well as an application that utilizes the redis. In part 1 we jumped through a few hurdles to get ourselves a storage but k3s includes a helpful storageclass that will streamline local testing.

You can apply the statefulset from `https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app5/manifests/statefulset.yaml`

**statefulset.yaml**

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
    app: redis
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-ss
spec:
  serviceName: redis
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

The Service is responsible for the network identity The redisfiller app is for us to look at. You can open two terminals and run `$ kubectl logs -f redis-ss-X redisfiller` where X is 0 or 1.
You can delete a pod and it will continue right where you left off. In addition you can delete the statefulset and the volume will stay and bind back when you apply the statefulset back.

Looks a lot like *Deployment* but uses volumeClaimTemplate to claim a volume for each pod. We can try killing either of the pods and it continue where it left off.

{% include_relative exercises/2_06.html %}

{% include_relative exercises/2_07.html %}

## Monitoring ##

Our cluster and the apps in in have been pretty much a black box. We've thrown stuff in and then hoped that everything works all right. We're going to use [Prometheus](https://prometheus.io/) to monitor the cluster and [Grafana](https://grafana.com/) to view the data.

Before we can get started let's look into how Kubernetes applications are managed more easily. [Helm](https://helm.sh/) uses packaging format called charts to define the dependencies of an application. Among other things Helm Charts include information for the version of the chart, the requirements of the application such as the Kubernetes version as well as other charts that it may depend on.

Installation instructions are [here](https://helm.sh/docs/intro/install/). After that we can add the official charts repository:

```console
$ helm repo add stable https://kubernetes-charts.storage.googleapis.com/
```

And after that we can install [prometheus-operator](https://hub.helm.sh/charts/stable/prometheus-operator/5.0.6). By default this would put everything to the default namespace.

```console
$ kubectl create namespace prometheus
$ helm install stable/prometheus-operator --generate-name --namespace prometheus
```

This added a lot of stuff to our cluster. You can remove almost everything with `helm delete [name]` with the name found via `helm list`. Custom resource definitions are left and have to be manually removed if the need arises.

Lets open a way into Grafana so we can see the data.

```console
$ kubectl get po -n prometheus
  NAME                                                              READY   STATUS    RESTARTS   AGE
  prometheus-operator-1587733290-kube-state-metrics-78dc98dc295tn   1/1     Running   0          53s
  prometheus-operator-1587733290-prometheus-node-exporter-ztsz8     1/1     Running   0          53s
  prometheus-operator-1587733290-prometheus-node-exporter-grpth     1/1     Running   0          53s
  prometheus-operator-1587733290-prometheus-node-exporter-sdc8b     1/1     Running   0          53s
  prometheus-operator-158773-operator-64dcc96864-c9svm              2/2     Running   0          53s
  alertmanager-prometheus-operator-158773-alertmanager-0            2/2     Running   0          34s
  prometheus-prometheus-operator-158773-prometheus-0                3/3     Running   1          23s
  prometheus-operator-1587733290-grafana-668cf4f5bb-k8xk7           1/2     Running   0          53s

$ kubectl -n prometheus port-forward prometheus-operator-1587733290-grafana-668cf4f5bb-k8xk7 3000
  Forwarding from 127.0.0.1:3000 -> 3000
  Forwarding from [::1]:3000 -> 3000
```

Access [http://localhost:3000](http://localhost:3000) with browser and use the credentials admin / prom-operator. At the top left you can browse different dashboards.

The dashboards are nice but we'd like to know more about the apps we're running as well. Let's add [Loki](https://grafana.com/oss/loki/) so that we can see logs. To confirm everything works for us let's create a simple application that'll output something to stdout.

Let's run the redisapp from previously `https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app5/manifests/statefulset.yaml`. We can keep it running as it'll generate a good amount of log output for us.

The [Loki Chart](https://github.com/grafana/loki/tree/master/production/helm) includes almost everything:

```console
$ helm repo add loki https://grafana.github.io/loki/charts
$ helm repo update
$ kubectl create namespace loki-stack
  namespace/loki-stack created

$ helm upgrade --install loki --namespace=loki-stack loki/loki-stack

$ kubectl get all -n loki-stack
  NAME                      READY   STATUS    RESTARTS   AGE
  pod/loki-promtail-n2fgs   1/1     Running   0          18m
  pod/loki-promtail-h6xq2   1/1     Running   0          18m
  pod/loki-promtail-8l84g   1/1     Running   0          18m
  pod/loki-0                1/1     Running   0          18m
  
  NAME                    TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)    AGE
  service/loki            ClusterIP   10.43.170.68   <none>        3100/TCP   18m
  service/loki-headless   ClusterIP   None           <none>        3100/TCP   18m
  
  NAME                           DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
  daemonset.apps/loki-promtail   3         3         3       3            3           <none>          18m
  
  NAME                    READY   AGE
  statefulset.apps/loki   1/1     18m
```

Here we see that Loki is running in port 3100. Open Grafana and go to settings and "Add data source". Choose Loki and then insert the correct URL. From the output above we can guess that the port should be 3100, namespace is loki-stack and the service is loki. So the answer would be: http://loki.loki-stack:3100. No other fields need to be changed.

Now we can use the Explore tab (compass) to explore the data.

![]({{ "/images/part2/loki_app_redisapp.png" | absolute_url }})

{% include_relative exercises/2_08.html %}

Submit your completed exercises through the [submission application](https://studies.cs.helsinki.fi/stats/)

## Summary ##

We're now at the state where we have the knowledge to deploy most software we'd develop into a Kubernetes cluster. Googling and reading documentation will still be necessary, as always, but we can confidently move from our own local Kubernetes cluster and start using Google Kubernetes Engine. [Part 3](/part3)
