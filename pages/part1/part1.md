---
layout: page
title: Part 1
inheader: yes
permalink: /part1/
order: 1
---

In this part, we'll go over a lot of things you need to get yourself started with using Kubernetes. This includes terminology, your first deploy, a little bit of networking, and an introduction to volumes. By the end of this part, you will be able to

- Create and run a Kubernetes cluster locally with k3d

- Deploy applications to Kubernetes

## What are microservices? ##

In this course, we'll talk about microservices and create microservices. Before we get started with anything else we'll need to define what a microservice is.

**A microservice is any service that is smaller than a monolith.**

As such the easiest method to achieve microservice architecture is by splitting off a single piece out of a monolith - they are then both less than a monolith. Why would you do this? For example, to scale a piece of the application separately or to have a separate team that works on a piece of the application.

The misconception of microservices being a large number of extremely small services is proliferated by large enterprises. If you have an extremely large enterprise where teams don't even know the existence of other teams you may have an unconventionally large number of microservices. Due to the insanity of a large number of small services without any good reasoning we're witnessing the term monolith trending in 2020.

- "Monoliths are the future" - Kelsey Hightower, Staff Developer Advocate at Google, ["Monoliths are the Future"](https://changelog.com/posts/monoliths-are-the-future)

For the context of this unpopular opinion, Kelsey Hightower points the fault at *Distributed Monoliths* where you have a large number of microservices without a good reason.

- "Run a small team, not a tech behemoth? Embrace the monolith and make it majestic. You Deserve It!" - David Heinemeier Hansson, cofounder & CTO at Basecamp, ["The Majestic Monolith"](https://m.signalvnoise.com/the-majestic-monolith/)

And this evolves into ["The Majestic Monolith can become The Citadel"](https://m.signalvnoise.com/the-majestic-monolith-can-become-the-citadel/) with the following: "next step is The Citadel, which keeps the Majestic Monolith at the center, but supports it with a set of Outposts, each extracting a small subset of application responsibilities."

Sometimes during this course we'll do **arbitrary** splits to our services just to show the features of Kubernetes. We will also see at least one actual use case for [microservices](https://www.youtube.com/watch?v=y8OnoxKotPQ).

## What is Kubernetes? ##

Let's say you have 3 processes and 2 computers incapable of running all 3 processes. How would you approach this problem?

You'll have to start by deciding which 2 processes go on the same computer and which 1 will be on the different one. How would you fit them? By having the ones demanding most resources and the least resources on the same machine or having the most demanding be on its own? Maybe you want to add one process and now you have to reorganize all of them. What happens when you have more than 2 computers and more than 3 processes? One of the processes is eating all of the memory and you need to get that away from the "critical-bank-application". Should we virtualize everything? Containers would solve that problem, right? Would you move the most important process to a new computer? Maybe some of the processes need to communicate with each other and now you have to deal with networking. What if one of the computers break? What about your Friday plans to visit the local Craft brewery?

What if you could just define "This process should have 6 copies using X amount of resources." and have the 2..N computers working as a single entity to fulfill your request? That's just one thing Kubernetes makes possible.

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">In essence, Kubernetes is the sum of all the bash scripts and best practices that most system administrators would cobble together over time, presented as a single system behind a declarative set of APIs.</p>&mdash; Kelsey Hightower (@kelseyhightower) <a href="https://twitter.com/kelseyhightower/status/1125440400355782657?ref_src=twsrc%5Etfw">May 6, 2019</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

Or more officially:

“Kubernetes (K8s) is an open-source system for automating deployment, scaling, and management of containerized applications. It groups containers that make up an application into logical units for easy management and discovery.” - [kubernetes.io](https://kubernetes.io/)

A container orchestration system such as Kubernetes is often required when maintaining containerized applications. The main responsibility of an orchestration system is the starting and stopping of containers. In addition, they offer networking between containers and health monitoring. Rather than manually doing `docker run critical-bank-application` every time the application crashes, or restart it if it becomes unresponsive, we want the system to keep the application automatically healthy.

A more familiar orchestration system may be docker-compose, which also does the same tasks; starting and stopping, networking and health monitoring. What makes Kubernetes special is the robust feature set for automating all of it.

Read [this comic](https://cloud.google.com/kubernetes-engine/kubernetes-comic/) and watch the video below to get a fast introduction. You may want to revisit these after this part!

<iframe width="560" height="315" src="https://www.youtube.com/embed/Q4W8Z-D-gcQ" frameborder="0" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

We will get started with a lightweight Kubernetes distribution. [K3s - 5 less than K8s](https://k3s.io/), offers us an actual Kubernetes cluster that we can run in containers using [k3d](https://github.com/rancher/k3d).

### Kubernetes cluster with k3d ###

#### What is a cluster? ####

A cluster is a group of machines, *nodes*, that work together - in this case, they are part of a Kubernetes cluster. Kubernetes cluster can be of any size - a single node cluster would consist of one machine that hosts the Kubernetes control-plane (exposing API and maintaining the cluster) and that cluster can then be expanded with up to 5000 nodes total, as of Kubernetes v1.18.

We will use the term "server node" to refer to nodes with control-plane and "agent node" to refer to the nodes without that role.

#### Starting a cluster with k3d ####

We'll use K3d to create a group of docker containers that run k3s. Thus creating our very own Kubernetes cluster.

```console
$ k3d cluster create -a 2
```

If you are getting an error message saying as below,
```console
ERRO[0006] Failed to get HostIP
```

Run the command with the below flag
```console
k3d cluster create -a 2 --no-hostip
```

This created a Kubernetes cluster with 2 agent nodes. As they're in docker you can confirm that they exist with `docker ps`.

```console
$ docker ps
  CONTAINER ID        IMAGE                      COMMAND                  CREATED             STATUS              PORTS                             NAMES
  11543a6b5015        rancher/k3d-proxy:v3.0.0   "/bin/sh -c nginx-pr…"   16 seconds ago      Up 14 seconds       80/tcp, 0.0.0.0:57734->6443/tcp   k3d-k3s-default-serverlb
  f17e07a77061        rancher/k3s:latest         "/bin/k3s agent"         26 seconds ago      Up 24 seconds                                         k3d-k3s-default-agent-1
  b135b5ac987d        rancher/k3s:latest         "/bin/k3s agent"         27 seconds ago      Up 25 seconds                                         k3d-k3s-default-agent-0
  7e5fbc8db7e9        rancher/k3s:latest         "/bin/k3s server --t…"   28 seconds ago      Up 27 seconds                                         k3d-k3s-default-server-0
```

Here we also see that port 6443 is opened to "k3d-k3s-default-serverlb", a useful "load balancer" proxy, that'll redirect a connection to 6443 into the server node, and that's how we can access the contents of the cluster. The port on our machine, above 57734, is randomly chosen. We could have opted out of the load balancer with `k3d cluster create -a 2 --no-lb` and the port would be open straight to the server node but having a load balancer will offer us a few features we wouldn't otherwise have.

K3d helpfully also set up a *kubeconfig*, the contents of which is output by `k3d kubeconfig get k3s-default`. Kubectl will read kubeconfig from the location in KUBECONFIG environment value or by default from `~/.kube/config` and use the information to connect to the cluster. The contents include certificates, passwords and the address in which the cluster API. You can manually set the config with `k3d kubeconfig merge k3d-default --switch-context`.

Now kubectl will be able to access the cluster

```console
$ kubectl cluster-info
  Kubernetes master is running at https://0.0.0.0:57734
  CoreDNS is running at https://0.0.0.0:57545/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
  Metrics-server is running at https://0.0.0.0:57545/api/v1/namespaces/kube-system/services/https:metrics-server:/proxy
```

We can see that kubectl is connected to the container *k3d-k3s-default-serverlb* through (in this case) port 57734.

If you want to stop / start the cluster you can simply run

```console
$ k3d cluster stop
  INFO[0000] Stopping cluster 'k3s-default'

$ k3d cluster start
  INFO[0000] Starting cluster 'k3s-default'
  INFO[0000] Starting Node 'k3d-k3s-default-agent-1'
  INFO[0000] Starting Node 'k3d-k3s-default-agent-0'
  INFO[0000] Starting Node 'k3d-k3s-default-server-0'
  INFO[0001] Starting Node 'k3d-k3s-default-serverlb'
```

For now, we're going to need the cluster but if we want to remove the cluster we can run `k3d cluster delete`.

## First Deploy ##

### Preparing for first deploy ###

Before we can deploy anything we'll need to do a small application to deploy. During the course, you will develop your own application. The technologies used for the application do not matter - for the examples we're going to use [node.js](https://nodejs.org/en/) but the example application will be offered through GitHub as well as Docker Hub.

Let's create an application that generates and outputs a hash every 5 seconds or so.

I've prepared one [here](https://github.com/kubernetes-hy/material-example/tree/master/app1) `docker run jakousa/dwk-app1`.

To deploy we need the cluster to have an access to the image. By default, Kubernetes is intended to be used with a registry. K3d offers `import-images` command, but since that won't work when we go to non-k3d solutions we'll use the now very familiar registry *Docker Hub*.

```console
$ docker tag _image_ _username_/_image_
$ docker push _username_/_image_
```

> In the future, the material will use the offered applications in the commands. Follow along by changing the image to your application.

Now we're finally ready to deploy our first app into Kubernetes!

### Deployment ###

To deploy an application we'll need to create a *Deployment* with the image.

```console
$ kubectl create deployment hashgenerator-dep --image=jakousa/dwk-app1
  deployment.apps/hashgenerator-dep created
```

This action created a few things for us to look at: a *Deployment* and a *Pod*.

#### What is a Pod? ####

*Pod* is an abstraction around one or more containers. Similarly, as you've now used containers to define environments for a single process. Pods provide a context for 1..N containers so that they can share storage and a network. They can be thought of as a container of containers. *Most* of the same rules apply: it is deleted if the containers stop running and files will be lost with it.

![]({{ "/images/part1/pods.png" | absolute_url }})

#### What is a Deployment? ####

A *Deployment* takes care of deployment. It's a way to tell Kubernetes what container you want, how they should be running and how many of them should be running.

The Deployment also created a *ReplicaSet*, which is a way to tell how many replicas of a Pod you want. It will delete or create Pods until the number of Pods you wanted are running. ReplicaSets are managed by Deployments and you should not have to manually define or modify them.

You can view the deployment:
```console
$ kubectl get deployments
  NAME                READY   UP-TO-DATE   AVAILABLE   AGE
  hashgenerator-dep   1/1     1            1           54s
```

And the pods:
```console
$ kubectl get pods
  NAME                               READY   STATUS    RESTARTS   AGE
  hashgenerator-dep-6965c5c7-2pkxc   1/1     Running   0          2m1s
```

1/1 replicas are ready and its status is Running! We will try multiple replicas later.

To see the output we can run `kubectl logs -f hashgenerator-dep-6965c5c7-2pkxc`

> Use `source <(kubectl completion bash)` to save yourself from a lot of headaches. Add it to .bashrc for an automatic load. (Also available for zsh)

A helpful list for other commands from docker-cli translated to kubectl is available here [https://kubernetes.io/docs/reference/kubectl/docker-cli-to-kubectl/](https://kubernetes.io/docs/reference/kubectl/docker-cli-to-kubectl/)

{% include_relative exercises/1_01.html %}

{% include_relative exercises/1_02.html %}

## Declarative configuration with YAML ##

We created the deployment with 

```console
$ kubectl create deployment hashgenerator-dep --image=jakousa/dwk-app1
```

If we wanted to scale it 4 times and update the image:

```console
$ kubectl scale deployment/hashgenerator-dep --replicas=4`

$ kubectl set image deployment/hashgenerator-dep dwk-app1=jakousa/dwk-app1:78031863af07c4c4cc3c96d07af68e8ce6e3afba`
```

Things start to get really cumbersome. In the dark ages, deployments were created similarly by running commands after each other in "correct" order. We'll now use a declarative approach where we define how things should be. This is more sustainable in the long term than the iterative approach.

Before redoing the previous let's take the deployment down.

```console
$ kubectl delete deployment hashgenerator-dep
  deployment.apps "hashgenerator-dep" deleted
```

and create a new folder named `manifests` to the project and a file called deployment.yaml with the following contents (you can check the example [here](https://github.com/kubernetes-hy/material-example/tree/master/app1)): 

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

> I personally use vscode to create these yaml files. It has helpful autofill, definitions and syntax check for Kubernetes with the extension Kubernetes by Microsoft. Even now it helpfully warns us that we haven't defined resource limitations.

This looks a lot like the docker-compose.yamls we have previously written. Let's ignore what we don't know for now, which is mainly labels, and focus on the things that we know:

* We're declaring what kind it is (kind: Deployment)
* We're declaring it a name as metadata (name: hashgenerator-dep)
* We're declaring that there should be one of them (replicas: 1)
* We're declaring that it has a container that is from a certain image with a name

Apply the deployment with `apply` command:

```console
$ kubectl apply -f manifests/deployment.yaml
  deployment.apps/hashgenerator-dep created
```

That's it, but for the sake of revision let's delete it and create it again:

```console
$ kubectl delete -f manifests/deployment.yaml
  deployment.apps "hashgenerator-dep" deleted

$ kubectl apply -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app1/manifests/deployment.yaml
  deployment.apps/hashgenerator-dep created
```

Woah! The fact that you can apply manifest from the internet just like that will come in handy.

{% include_relative exercises/1_03.html %}

{% include_relative exercises/1_04.html %}

## Debugging ##

Kubernetes is a "self-healing" system, and we'll get back to what Kubernetes consists of and how it actually works in part 5. But at this stage "self-healing" is an excellent concept: Often you (the maintainer or developer) don't have to do anything in case something goes wrong with a pod or a container.

Sometimes you need to interfere, or you might have problems with your own configuration. As you are trying to find bugs in your configuration start by eliminating all possibilities one by one. The key is to be systematic and **to question everything**. Here are the preliminary tools to solve problems.

The first is `kubectl describe` which can tell you most of everything you need to know about any resource.

The second is `kubectl logs` with which you can follow the logs of your possibly broken software.

The third is `kubectl delete` which will simply delete the resource and in some cases, like with pods in deployment, a new one will be automatically released.

Finally, we have the overarching tool [Lens "The Kubernetes IDE"](https://k8slens.dev/). Which you should start using right now to familiarize yourself with the usage.

During exercises, you also have our Telegram group available (which you joined in [part0](/part0)).

Let's test these tools and experiment using Lens. You will likely face a real debugging challenge during the exercises and there is another preplanned one in part 5 when we have a larger set of moving parts available to us.

Let's deploy the application and see what's going on.

```console
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app1/manifests/deployment.yaml
  deployment.apps/hashgenerator-dep created

$ kubectl describe deployment hashgenerator-dep
  Name:                   hashgenerator-dep
  Namespace:              default
  CreationTimestamp:      Wed, 16 Sep 2020 16:17:39 +0300
  Labels:                 <none>
  Annotations:            deployment.kubernetes.io/revision: 1
  Selector:               app=hashgenerator
  Replicas:               1 desired | 1 updated | 1 total | 1 available | 0 unavailable
  StrategyType:           RollingUpdate
  MinReadySeconds:        0
  RollingUpdateStrategy:  25% max unavailable, 25% max surge
  Pod Template:
    Labels:  app=hashgenerator
    Containers:
     hashgenerator:
      Image:        jakousa/dwk-app1:78031863af07c4c4cc3c96d07af68e8ce6e3afba
      Port:         <none>
      Host Port:    <none>
      Environment:  <none>
      Mounts:       <none>
    Volumes:        <none>
  Conditions:
    Type           Status  Reason
    ----           ------  ------
    Available      True    MinimumReplicasAvailable
    Progressing    True    NewReplicaSetAvailable
  OldReplicaSets:  <none>
  NewReplicaSet:   hashgenerator-dep-75bdcc94c (1/1 replicas created)
  Events:
    Type    Reason             Age    From                   Message
    ----    ------             ----   ----                   -------
    Normal  ScalingReplicaSet  8m39s  deployment-controller  Scaled up replica set hashgenerator-dep-75bdcc94c to 1
```

There's a lot of information we are not ready to evaluate yet. But take a moment to read through everything. There're at least a few key information pieces we know, mostly because we defined them earlier in the yaml. The events are often the place to look for errors.

The command `describe` can be used for other resources as well. Let's see the pod next:

```console
$ kubectl describe pod hashgenerator-dep-75bdcc94c-whwsm
  ...
  Events:
    Type    Reason     Age   From                              Message
    ----    ------     ----  ----                              -------
    Normal  Scheduled  15m   default-scheduler                 Successfully assigned default/hashgenerator-dep-75bdcc94c-whwsm to k3d-k3s-default-agent-0
    Normal  Pulling    15m   kubelet, k3d-k3s-default-agent-0  Pulling image "jakousa/dwk-app1:78031863af07c4c4cc3c96d07af68e8ce6e3afba"
    Normal  Pulled     15m   kubelet, k3d-k3s-default-agent-0  Successfully pulled image "jakousa/dwk-app1:78031863af07c4c4cc3c96d07af68e8ce6e3afba"
    Normal  Created    15m   kubelet, k3d-k3s-default-agent-0  Created container hashgenerator
    Normal  Started    15m   kubelet, k3d-k3s-default-agent-0  Started container hashgenerator
```

There's again a lot of information but let's focus on the events this time. Here we can see everything that happened. Scheduler put the pod to the node with the name "k3d-k3s-default-agent-0" successfully pulled the image and started the container. Everything is working as intended, excellent. The application is running.

Next, let's check that the application is actually doing what it should by reading the logs.

```console
$ kubectl logs hashgenerator-dep-75bdcc94c-whwsm
  jst944
  3c2xas
  s6ufaj
  cq7ka6
```

Everything seems to be in order. However, wouldn't it be great if there was a dashboard to see everything going on? Let's see what the Lens can do.

First, you'll need to add the cluster to Lens. If the config is not available in the dropdown you can get the kubeconfig for custom with `kubectl config view --minify --raw`. After you've added the cluster open Workloads/Overview tab. A view similar to the following should open up

![]({{ "/images/part1/lens_during_deploy.png" | absolute_url }})

At the bottom, we can see every event, and at the top, we can see the status of different resources in our cluster. Try deleting and reapplying the deployment and you should see events in the dashboard. Next, let's navigate to the tab Workloads/Pods and click our pod with the name "hashgenerator-dep-...".

![]({{ "/images/part1/lens_pod.png" | absolute_url }})

The view shows us the same information as was in the description. But the GUI offers us actions as well. The three numbered in the top right corner are:
1. Open terminal into a container in the pod
2. Show logs
3. Delete the resource

In addition, at the bottom, you can open a terminal with the correct context.

"The best feature in my opinion is that when I do kubectl get pod in the terminal, the dashboard you are looking at is always in the right context. Additionally, I don't need to worry about working with stale information because everything is real-time." - [Matti Paksula](http://github.com/matti)

## Networking Part 1 ##

Now back to development! Restarting and following logs has been a treat. Next, we'll open an endpoint to the application and access it via HTTP.

#### Simple networking application ####

Let's develop our application so that it has an HTTP server responding with two hashes: a hash that is stored until the process is exited and a hash that is request specific. The response body can be something like "Application abc123. Request 94k9m2". Choose any port to listen to.

I've prepared one [here](https://github.com/kubernetes-hy/material-example/tree/master/app2). By default, it will listen on port 3000.

```console
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app2/manifests/deployment.yaml
  deployment.apps/hashresponse-dep created
```

### Connecting from outside of the cluster ###

We can confirm that the hashresponse-dep is working with the `port-forward` command. Let's see the name of the pod first and then port forward there:

```console
$ kubectl get po
  NAME                                READY   STATUS    RESTARTS   AGE
  hashgenerator-dep-5cbbf97d5-z2ct9   1/1     Running   0          20h
  hashresponse-dep-57bcc888d7-dj5vk   1/1     Running   0          19h

$ kubectl port-forward hashresponse-dep-57bcc888d7-dj5vk 3003:3000
  Forwarding from 127.0.0.1:3003 -> 3000
  Forwarding from [::1]:3003 -> 3000
```

Now we can view the response from http://localhost:3003 and confirm that it is working as expected.

{% include_relative exercises/1_05.html %}

External connections with docker used the flag -p `-p 3003:3000` or in docker-compose ports declaration. Unfortunately, Kubernetes isn't as simple. We're going to use either a *Service* resource or an *Ingress* resource.

#### Before anything else ####

Because we are running our cluster inside docker with k3d we will have to do a few preparations.
Opening a route from outside of the cluster to the pod will not be enough if we have no means of accessing the cluster inside the containers!

```console
$ docker ps
  CONTAINER ID        IMAGE                      COMMAND                  CREATED             STATUS              PORTS                             NAMES
  b60f6c246ebb        rancher/k3d-proxy:v3.0.0   "/bin/sh -c nginx-pr…"   2 hours ago         Up 2 hours          80/tcp, 0.0.0.0:58264->6443/tcp   k3d-k3s-default-serverlb
  553041f96fc6        rancher/k3s:latest         "/bin/k3s agent"         2 hours ago         Up 2 hours                                            k3d-k3s-default-agent-1
  aebd23c2ef99        rancher/k3s:latest         "/bin/k3s agent"         2 hours ago         Up 2 hours                                            k3d-k3s-default-agent-0
  a34e49184d37        rancher/k3s:latest         "/bin/k3s server --t…"   2 hours ago         Up 2 hours                                            k3d-k3s-default-server-0
```

K3d has helpfully prepared us a port to access the API in 6443 and, in addition, has opened a port to 80. All requests to the load balancer here will be proxied to the same ports of all server nodes of the cluster. However, for testing purposes, we'll want an individual port open for a single node. Let's delete our old cluster and create a new one with port 8082 open:

```console
$ k3d cluster delete
  INFO[0000] Deleting cluster 'k3s-default'               
  ...
  INFO[0002] Successfully deleted cluster k3s-default!    

$ k3d cluster create --port '8082:30080@agent[0]' -p 8081:80@loadbalancer --agents 2
  INFO[0000] Created network 'k3d-k3s-default'
  ...
  INFO[0021] Cluster 'k3s-default' created successfully!
  INFO[0021] You can now use it like this:
  kubectl cluster-info

$ kubectl apply -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app2/manifests/deployment.yaml
  deployment.apps/hashresponse-dep created
```

Now we have access through port 8081 to our server node (actually all nodes) and 8082 to one of our agent nodes port 30080. They will be used to showcase different methods of communicating with the servers.

> We will have a limited amount of ports available in the future but that's ok for your own machine.

> Your OS may support using the host network so no ports need to be opened.

#### What is a Service? ####

As *Deployment* resources took care of deployments for us. *Service* resource will take care of serving the application to connections from outside of the cluster. 

Create a file service.yaml into the manifests folder and we need the service to do the following things:

1. Declare that we want a Service
2. Declare which port to listen to
3. Declare the application where the request should be directed to
4. Declare the port where the request should be directed to

This translates into a yaml file with contents

**service.yaml**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: hashresponse-svc
spec:
  type: NodePort
  selector:
    app: hashresponse
  ports:
    - name: http
      nodePort: 30080 # This is the port that is available outside. Value for nodePort can be between 30000-32767
      protocol: TCP
      port: 1234 # This is a port that is available to the cluster, in this case it can be ~ anything
      targetPort: 3000 # This is the target port
```

```console
$ kubectl apply -f manifests/service.yaml
  service/hashresponse-svc created
```

As we've published 8082 as 30080 we can access it now via http://localhost:8082.

We've now defined a nodeport with `type: NodePort`. *NodePorts* simply ports that are opened by Kubernetes to **all of the nodes** and the service will handle requests in that port. NodePorts are not flexible and require you to assign a different port for every application. As such NodePorts are not used in production but are helpful to know about.

What we'd want to use instead of NodePort would be a *LoadBalancer* type service but this "only" works with cloud providers as it configures a, possibly costly, load balancer for it. We'll get to know them in part 3.

There's one additional resource that will help us with serving the application, *Ingress*.

{% include_relative exercises/1_06.html %}

#### What is an Ingress? ####

Incoming Network Access resource *Ingress* is a completely different type of resource from *Services*. If you've got your OSI model memorized, it works in layer 7 while services work on layer 4. You could see these used together: first the aforementioned *LoadBalancer* and then Ingress to handle routing. In our case, as we don't have a load balancer available we can use the Ingress as the first stop. If you're familiar with reverse proxies like Nginx, Ingress should seem familiar.

Ingresses are implemented by various different "controllers". This means that ingresses do not automatically work in a cluster, but gives you the freedom of choosing which ingress controller works for you the best. K3s has [Traefik](https://containo.us/traefik/) installed already. Other options include Istio and Nginx Ingress Controller, [more here](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/).

Switching to Ingress will require us to create an Ingress resource. Ingress will route incoming traffic forward to a *Services*, but the old *NodePort* Service won't do. 

```console
$ kubectl delete -f manifests/service.yaml
  service "hashresponse-svc" deleted
```

A ClusterIP type Service resource gives the Service an internal IP that'll be accessible in the cluster.

The following will let TCP traffic from port 2345 to port 3000.

**service.yaml**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: hashresponse-svc
spec:
  type: ClusterIP
  selector:
    app: hashresponse
  ports:
    - port: 2345
      protocol: TCP
      targetPort: 3000
```

For resource 2 the new *Ingress*.

1. Declare that it should be an Ingress
2. And route all traffic to our service

**ingress.yaml**

```yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: dwk-material-ingress
spec:
  rules:
  - http:
      paths:
      - path: /
        backend:
          serviceName: hashresponse-svc
          servicePort: 2345
```

Then we can apply everything and view the result

```console
$ kubectl apply -f manifests/service.yaml
  service/hashresponse-svc created
$ kubectl apply -f manifests/ingress.yaml
  ingress.extensions/dwk-material-ingress created

$ kubectl get svc
  NAME               TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)    AGE
  kubernetes         ClusterIP   10.43.0.1      <none>        443/TCP    23h
  hashresponse-svc   ClusterIP   10.43.236.27   <none>        2345/TCP   4m23s

$ kubectl get ing
  NAME                    HOSTS   ADDRESS      PORTS   AGE
  dwk-material-ingress    *       172.28.0.4   80      77s
```

We can see that the ingress is listening on port 80. As we already opened port there we can access the application on http://localhost:8081.

{% include_relative exercises/1_07.html %}

{% include_relative exercises/1_08.html %}

{% include_relative exercises/1_09.html %}


## Volumes Part 1 ##

Storage in Kubernetes is **hard**. In part 1 we will look into a very basic method of using storage and return to this topic later. Where almost everything else in Kubernetes is very much dynamic, moving between nodes and replicating with ease, storage does not have the same possibilities.

There are multiple types of volumes and we'll get started with two of them.

### Simple Volume ###

Where in docker and docker-compose it would essentially mean that we had something persistent here that is not the case. There are multiple types of volumes *emptyDir* volumes are shared filesystems inside a pod, this means that their lifecycle is tied to a pod. When the pod is destroyed the data is lost.

Before we can get started with this, we need an application that shares data with another application. In this case, it will work as a method to share simple log files with each other. We'll need to develop the apps:

App 1 will check if /usr/src/app/files/image.jpg exists and if not download a random image and save it as image.png. Any HTTP request will trigger a new image generation.

App 2 will check for /usr/src/app/files/image.jpg and show it if it is available.

They share a deployment so that both of them are inside the same pod. My version available [here](https://github.com/kubernetes-hy/material-example/tree/master/app3). The example includes ingress and service to access the application.

**deployment.yaml**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: images-dep
spec:
  replicas: 1
  selector:
    matchLabels:
      app: images
  template:
    metadata:
      labels:
        app: images
    spec:
      volumes: # Define volume
        - name: shared-image
          emptyDir: {}
      containers:
        - name: image-finder
          image: jakousa/dwk-app3-image-finder:e11a700350aede132b62d3b5fd63c05d6b976394
          volumeMounts: # Mount volume
          - name: shared-image
            mountPath: /usr/src/app/files
        - name: image-response
          image: jakousa/dwk-app3-image-response:e11a700350aede132b62d3b5fd63c05d6b976394
          volumeMounts: # Mount volume
          - name: shared-image
            mountPath: /usr/src/app/files
```

As the display is dependant on the volume we can confirm that it works by accessing the image-response and getting the image. The provided ingress used the previously opened port 8081 <http://localhost:8081>

Note that all data is lost when the pod goes down.

{% include_relative exercises/1_10.html %}

### Persistent Volumes ###

This type of storage is what you probably had in mind when we started talking about volumes. Unfortunately, we're quite limited with the options here and will return to *PersistentVolumes* briefly in Part 2 and again in Part 3 with GKE.

The reason for the difficulty is because you should not store data with the application or create a dependency on the filesystem by the application. Kubernetes supports cloud providers very well and you can run your own storage system. During this course, we are not going to run our own storage system as that would be a huge undertaking and most likely "in real life" you are going to use something hosted by a cloud provider. This topic would probably be a part of its own, but let's scratch the surface and try something you can use to run something at home.

A *local* volume is a *PersistentVolume* that binds a path from the node to use as a storage. This ties the volume to the node.

For the _PersistentVolume_ to work you first need to create the local path in the node we are binding it to. Since our k3d cluster runs via docker let's create a directory at `/tmp/kube` in the `k3d-k3s-default-agent-0` container. This can simply be done via `docker exec k3d-k3s-default-agent-0 mkdir -p /tmp/kube` 

**persistentvolume.yaml**

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: example-pv
spec:
  storageClassName: manual
  capacity:
    storage: 1Gi # Could be e.q. 500Gi. Small amount is to preserve space when testing locally
  volumeMode: Filesystem # This declares that it will be mounted into pods as a directory
  accessModes:
  - ReadWriteOnce
  local:
    path: /tmp/kube
  nodeAffinity: ## This is only required for local, it defines which nodes can access it
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - k3d-k3s-default-agent-0
```

> As this is bound into that node avoid using this in production.

The type of *local* we're using now can not be dynamically provisioned. A new *PersistentVolume* needs to be defined only rarely, for example to your personal cluster once a new physical disk is added. After that, a *PersistentVolumeClaim* is used to claim a part of the storage for an application. If we create multiple *PersistentVolumeClaims* the rest will stay in Pending state, waiting for a suitable *PersistentVolume*.

**persistentvolumeclaim.yaml**

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: image-claim
spec:
  storageClassName: manual
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

Modify the previously introduced deployment to use it:

**deployment.yaml**
```yaml
...
    spec:
      volumes:
        - name: shared-image
          persistentVolumeClaim:
            claimName: image-claim
      containers:
        - name: image-finder
          image: jakousa/dwk-app3-image-finder:e11a700350aede132b62d3b5fd63c05d6b976394
          volumeMounts:
          - name: shared-image
            mountPath: /usr/src/app/files
        - name: image-response
          image: jakousa/dwk-app3-image-response:e11a700350aede132b62d3b5fd63c05d6b976394
          volumeMounts:
          - name: shared-image
            mountPath: /usr/src/app/files
```

And apply it

```console
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app3/manifests/deployment-persistent.yaml
```

With the previous service and ingress we can access it from http://localhost:8081. To confirm that the data is persistent we can run

```console
$ kubectl delete -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app3/manifests/deployment-persistent.yaml
  deployment.apps "images-dep" deleted
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app3/manifests/deployment-persistent.yaml
  deployment.apps/images-dep created
```

And the same file is available again.

If you are interested in learning more about running your own storage you can check out.

[StorageOS](https://storageos.com/)

{% include_relative exercises/1_11.html %}

{% include_relative exercises/1_12.html %}

{% include_relative exercises/1_13.html %}

## Summary ##

Submit your completed exercises through the [submission application](https://studies.cs.helsinki.fi/stats/courses/kubernetes2020)

In this part, we learned about k8s, k3s, and k3d. We learned about resources that are used in Kubernetes to run any software as well as resources to manage storage for some use cases, for example, caching and sharing data between Pods.

By now we know what the following are and how to use them:
 - Pods
 - Deployments
 - Services
 - Ingress
 - Volume

With them, we're ready to deploy simple software to a Kubernetes cluster. In the next part we'll learn more about management as well as a number of cases where the tools we have acquired so far are not enough. [Part 2](/part2)
