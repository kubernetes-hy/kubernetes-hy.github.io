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

## First Deploy ##

### Preparing for first deploy ###

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

### Deployment ###

To deploy an application we'll need to create a *Deployment* with the image.

```
$ kubectl create deployment hashgenerator-dep --image=jakousa/dwk-app1
deployment.apps/hashgenerator-dep created
```

This action created a few things for us to look at: a *Deployment* and a *Pod*.

#### What is a Pod? ####

A *Pod* is an abstraction around one or more containers. Similarly as you've now used containers to define environments for a single process. Pods provide an context for 1..N containers so that they can share a storage and a network. They can be thought of as a container of containers. _Most_ of the same rules apply: it is deleted if the containers stop running and files will be lost with it.

TODO: Image of a pod

As you created a deployment there should be a pod that you can view:

#### What is a Deployment? ####

A *Deployment* takes care of deployment. It's a way to tell Kubernetes what container you want, how they should be running and how many of them should be running.

The Deployment also created a *ReplicaSet*, which is a way to tell how many replicas of a Pod you want. It will delete or create Pods until the the number of Pods you wanted are running. ReplicaSets are managed by Deployments and you should not have to manually define or modify them.

You can view the deployment:
```
$ kubectl get deployments
NAME                READY   UP-TO-DATE   AVAILABLE   AGE
hashgenerator-dep   1/1     1            1           54s
```

And the pods:
```
$ kubectl get pods
NAME                               READY   STATUS    RESTARTS   AGE
hashgenerator-dep-6965c5c7-2pkxc   1/1     Running   0          2m1s
```

1/1 replicas are ready and it's status is Running! We will try multiple replicas later.

To see the output we can run `kubectl logs -f hashgenerator-dep-6965c5c7-2pkxc`

A helpful list for other commands from docker-cli translated to kubectl is available here [https://kubernetes.io/docs/reference/kubectl/docker-cli-to-kubectl/](https://kubernetes.io/docs/reference/kubectl/docker-cli-to-kubectl/)

Exercise 1:

**Exercises can be done with any language and framework you want. We'll get to submitting the exercises when you have the application in a sufficient state.**

Create an application that generates a random string on startup, stores this hash into memory and outputs it every 5 seconds with a timestamp. e.g.

```
2020-03-30T12:15:17.705Z: 8523ecb1-c716-4cb6-a044-b9e83bb98e43
```

Deploy it into your kubernetes cluster and confirm that it's running with `kubectl logs`

## Switch to YAML ##

We created the deployment with 

`kubectl create deployment hashgenerator-dep --image=jakousa/dwk-app1`.

If we wanted to scale it 4 times and update the image:

`kubectl scale deployment/hashgenerator-dep --replicas=4`

`kubectl set image deployment/hashgenerator-dep dwk-app1=jakousa/dwk-app1:78031863af07c4c4cc3c96d07af68e8ce6e3afba`

Things start to get really cumbersome. Let's not even image a world where a deployment is created by running commands after each other in a "correct" order. In production using a declarative approach, where we define how things should be, rather than iterative is more sustainable in the long term.

Before redoing the previous let's take the deployment down.
```
$ kubectl delete deployment hashgenerator-dep
deployment.apps "hashgenerator-dep" deleted
```

and create a new folder named `manifests` to the project and a file called deployment.yaml with the following contents (you can check the example [here](https://github.com/kubernetes-hy/material-example/tree/master/app1)): 

```
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

> I personally use vscode to create these yaml files. It has helpful autofill, definitions and syntax check for Kubernetes with the extension Kubernetes by Microsoft. Even now it helpfully warns us that we haven't defined resource limitations.

Let's ignore what we don't know for now (mainly labels) and focus on the things that we know:

* We're declaring what kind it is (kind: Deployment)
* We're declaring it a name as metadata (name: hashgenerator-dep)
* We're declaring that there should be one of them (replicas: 1)
* We're declaring that it has a container that is from a certain image with a name

Now we can `apply` it with:

```
$ kubectl apply -f manifests/deployment.yaml
deployment.apps/hashgenerator-dep created
```

That's it, but for revisions sake lets delete it and create it again:

```
$ kubectl delete -f manifests/deployment.yaml
deployment.apps "hashgenerator-dep" deleted

$ kubectl apply -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app1/manifests/deployment.yaml
deployment.apps/hashgenerator-dep created
```

Woah! The fact that you can apply manifest from the internet just like that will come in handy.

Exercise 2:

In your project create the folder for manifests and move your deployment into a declarative file. Make sure everything still works by restarting and following logs.

## Networking ##

Restarting and following logs has been a treat. Next we'll open an endpoint to the application and access it via HTTP.

TODO