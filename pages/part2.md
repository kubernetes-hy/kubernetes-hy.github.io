---
layout: page
title: Part 2
inheader: yes
permalink: /part2/
order: 2
---

In this part TODO

## Networking Part 2 ##

In part 1 we managed to setup networking configuration to enable routing traffic from outside of the cluster to a container inside a pod. In Part 2 we'll focus on communication between applications.

Kubernetes includes a DNS service so communication between pods and containers in Kubernetes is as much of a challenge as it was with containers in docker-compose. Use the container name to refer to a container in a pod, this way containers can communicate with each other in a pod. Or use a *Service* to communicate between pods.

<div class="exercise" markdown="1">
Exercise 7:

Connect the two applications from exercise 3 and exercise 4. Instead of sharing data via files use HTTP endpoints to respond with the number of pongs. Deprecate all of the volumes for the time being. The output will stay the same:

```
2020-03-30T12:15:17.705Z: 8523ecb1-c716-4cb6-a044-b9e83bb98e43.
Ping / Pongs: 3
```
</div>

## Namespaces and labels ##

As you can imagine there may be a lot of resources inside a cluster. In fact, at the moment of writing this Kubernetes supports over 100 000 pods in a single cluster.

Namespaces are used to keep resources separated. A company which uses 1 cluster but has multiple projects can use namespaces to split the cluster into virtual clusters, one for each project. Most commonly they would be used to separate environments such as production, testing, staging. DNS entry for services includes the namespace so you can still have projects communicate with each other if needed.

Accessing namespaces with kubectl is by using `-n` flag. For example you can see what the namespace kube-system has with

```console
$ kubectl get pods -n kube-system 
```

To see everything you can use `--all-namespaces`.

```console
$ kubectl get all --all-namespaces
```

Namespaces should be kept separate - you could run all of the examples and do the exercises of this course in a cluster that is shared with critical software. An administator should set a *ResourceQuota* for that namespace so that you can safely run anything there. We'll look into resource limits and requests later.

Labels are used to separate an application from others inside a namespace. They make it possible for having multiple applications as you've used in this course already.

Let's look at the labels in *Deployment* yamls. This is the first yaml we created and you've copy pasted something similar:

```yml
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

The *selector* and *matchLabels* reveal that the instructions of the deployment are directed to pods with the following label. *matchLabels* is a key value pair but we could've used *matchExpressions* instead. While the template metadata includes label with key value pair app and hashgenerator. We can use the same label on multiple namespaces and the namespace would keep them from interfering with each other.

<div class="exercise" markdown="1">
Exercise 8:

Create a namespace for the applications in the exercises. Move the applications to that namespace and use that in the future for all of the exercises. You can follow the material in the default namespace.
</div>

## Configuration with Secrets and ConfigMaps ##

*ConfigMaps* help by keeping configuration separate from images. 

*Secrets* help by keeping secrets secret.

Both can be used to introduce variables: Secrets for things like api keys and ConfigMaps for other things you would find as an environment variable.

Let's use [pixabay](https://pixabay.com/) to display images on a simple web app. We will need to utilize authentication with api key.
The api docs are good, we just need to log in to get ourselves a key here https://pixabay.com/api/docs/.

Here's the app available
```console
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app4/manifests/deployment.yaml 
                -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app4/manifests/ingress.yaml 
                -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app4/manifests/service.yaml
```

Let's use secret to pass the api key to the application. For this application we need to forcibly restart it after setting the secret.

```yml
todo: this
```

<div class="exercise" markdown="1">
Exercise 9:

Create a ConfigMap for a "dotenv file". A file where you define environment variables that are loaded by the application.
For this use an environment variable "MESSAGE" with value "Hello" 
</div>

## StatefulSets ##

In part 1 we learned how volumes are used with PersistentVolumes and PersistentVolumeClaims. We used *Deployment* with them and everything worked well enough for our testing purposes. The problem is that *Deployment* creates and scales pods that are *replicas* - they are a new copy of the same thing. With PersistentVolumeClaims, the method through which a pod reserves persistent storage, this creates a possibly non-desired effect as the claims are **not** pod specific. The claim is shared by all pods in that deployment.

*StatefulSets* are like *Deployments* except it makes sure that if a pod dies the replacement is identical, with the same network identity and name. In addition if the pod is scaled the copies will have their own storage. StatefulSets are for stateful applications. You could use StatefulSets to scale video game servers that require state, such as a minecraft server. Or run a database. For data safety when deleted or scaled down StatefulSets will not delete the volumes they are associated with.

> Deployment creates pods using a Resource called "ReplicaSet". We're using ReplicaSets through Deployments.

Let's run mongo database and save some information there.

TODO: mongo database and connection using Secret from previous section
```yml
todo: this
```

<div class="exercise" markdown="1">
Exercise 10:

Let's run a postgres database and save some information there.
</div>

## CronJobs ##

Now that we have a database we might as well learn how to create backups of it. *CronJobs* run a container on schedule.

```yml
todo: this
```

## Monitoring and updating ##

### DaemonSets ###

## Compute Resources ##

# Summary #