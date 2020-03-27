---
layout: page
title: Part 1
inheader: yes
permalink: /part1/
order: 1
---

## What is Kubernetes? ##

“Kubernetes (K8s) is an open-source system for automating deployment, scaling, and management of containerized applications. It groups containers that make up an application into logical units for easy management and discovery.” - [kubernetes.io](https://kubernetes.io/)

A container orchestration system such as Kubernetes is often required when maintaining containerized applications. The main responsibility of an orchestration system is the starting and stopping of containers. In addition, they offer networking between containers and health monitoring. Rather than manually doing `docker run critical-bank-application` every time the application crashes, or restart it if it becomes unresponsive, we want the system to keep the application automatically healthy.

A more familiar orchestration system may be docker-compose, which also does the same tasks; starting and stopping, networking and health monitoring. What makes Kubernetes special is the robust feature set for automating all of it.

We can get started with a lightweight Kubernetes distribution. [K3s - 5 less than K8s](https://k3s.io/), offers us an actual Kubernetes cluster that we can run in containers using [k3d](https://github.com/rancher/k3d).

### Kubernetes cluster with k3d ###

#### What is a cluster? ####

TODO

#### Starting a cluster with k3d ####

We'll use K3d to create a Kubernetes cluster inside docker containers.

```
k3d create -w 2
```

This created a kubernetes cluster with 2 worker nodes. As they're in docker you can confirm that they exist with `docker ps`.

```
CONTAINER ID        IMAGE                COMMAND                  CREATED             STATUS              PORTS                    NAMES
57f8952c0cb3        rancher/k3s:v1.0.1   "/bin/k3s agent"         7 seconds ago       Up 6 seconds                                 k3d-k3s-default-worker-1
324954c08977        rancher/k3s:v1.0.1   "/bin/k3s agent"         9 seconds ago       Up 7 seconds                                 k3d-k3s-default-worker-0
088cd949015e        rancher/k3s:v1.0.1   "/bin/k3s server --h…"   10 seconds ago      Up 8 seconds        0.0.0.0:6443->6443/tcp   k3d-k3s-default-server
```

Here we also see that port 6443 is opened to "k3d-k3s-default-server", our master node, and that's how we can access the contents of the cluster. K3d helpfully set up a *kubeconfig*, the location of which is output by `k3d get-kubeconfig --name='k3s-default'`. kubectl will read kubeconfig from the location in KUBECONFIG environment value so set it: `export KUBECONFIG="$(k3d get-kubeconfig --name='k3s-default')"`.

Now kubectl will be able to access the cluster: `kubectl cluster-info` outputs the address of the master in port 6443. 

### First deploy ###

Before we can deploy anything we'll need to do a small application to deploy. During the course you will develop your own application. The technologies used for the application do not matter - for the examples we're going to use [node.js](https://nodejs.org/en/) but the example application will be offered through GitHub as well as Docker Hub.

Let's create an application that generates and outputs a hash every 5 seconds or so.

I've prepared one [here](https://github.com/kubernetes-hy/material-example/tree/master/app1) `docker run jakousa/dwk-app1`.

To deploy we need the cluster to have an access to the image. K3d offers `import-images` command, but since that won't work when we go to non-k3d solutions we'll use the now very familiar registry *Docker Hub*.

```
$ docker tag _image_ _username_/_image_
$ docker push _username_/_image_
```

> In the future the material will use the offered applications in the commands. Follow along by changing the image to your application

Now we're finally ready to deploy our first app into Kubernetes!

#### Deployment ####

To deploy an application we'll need to create a *Deployment* with the image.

```
$ kubectl create deployment hashgenerator-dep --image=jakousa/dwk-app1
deployment.apps/hashgenerator-dep created
```

This created a deployment that you can view with
```
$ kubectl get deployments
NAME                READY   UP-TO-DATE   AVAILABLE   AGE
hashgenerator-dep   1/1     1            1           54s
```

TODO what is a deployment?

TODO what is a pod?

You can view the pods with
```
$ kubectl get pods
NAME                               READY   STATUS    RESTARTS   AGE
hashgenerator-dep-6965c5c7-2pkxc   1/1     Running   0          2m1s
```

It's status is Running!

To see the output we can run `kubectl logs -f hashgenerator-dep-6965c5c7-2pkxc`

A helpful list for other commands from docker-cli translated to kubectl is available here (https://kubernetes.io/docs/reference/kubectl/docker-cli-to-kubectl/)[https://kubernetes.io/docs/reference/kubectl/docker-cli-to-kubectl/]


Exercise 1:

## Switch to YAML ##

TODO

Exercise 2:

## Networking ##