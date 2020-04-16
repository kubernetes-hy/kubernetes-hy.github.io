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

## StatefulSets ##

## CronJobs ##

## Monitoring and updating ##

## Compute Resources ##

# Summary #