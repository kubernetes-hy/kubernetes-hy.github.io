---
path: '/part-1/1-first-deploy'
title: 'First Deploy'
hidden: false
---

<text-box variant='learningObjectives' name='Learning Objectives'>

After this section you

- are able to create and run a Kubernetes cluster locally with k3d

- can deploy a simple application to Kubernetes

</text-box>

## What are microservices? ##

In this course, we'll talk about microservices and create microservices. Before we get started with anything else we'll need to define what a microservice is. Currently there are a many different definitions for microservices.

For this course we'll choose the definition set by Sam Newman in [Building Microservices](https://www.oreilly.com/library/view/building-microservices/9781491950340/): "**Microservices are small, autonomous services that work together**". The opposite of a microservice is a service that is self-contained and independent called a [Monolith](https://en.wikipedia.org/wiki/Monolithic_application).

The misconception of microservices being a large number of extremely small services is proliferated by large enterprises. If you have an extremely large enterprise where teams don't even know the existence of other teams you may have an unconventionally large number of microservices. Due to the insanity of a large number of small services without any good reasoning we're witnessing the term monolith trending in 2020.

- "Monoliths are the future" - Kelsey Hightower, Staff Developer Advocate at Google, ["Monoliths are the Future"](https://changelog.com/posts/monoliths-are-the-future)

For the context of this unpopular opinion, Kelsey Hightower points out at "The problem people try to solve with microservices doesn't really line up with reality", leading to *Distributed Monoliths* where you have a large number of microservices without a good reason.

- "Run a small team, not a tech behemoth? Embrace the monolith and make it majestic. You Deserve It!" - David Heinemeier Hansson, cofounder & CTO at Basecamp, ["The Majestic Monolith"](https://m.signalvnoise.com/the-majestic-monolith/)

And this evolves into ["The Majestic Monolith can become The Citadel"](https://m.signalvnoise.com/the-majestic-monolith-can-become-the-citadel/) with the following: "next step is The Citadel, which keeps the Majestic Monolith at the center, but supports it with a set of Outposts, each extracting a small subset of application responsibilities."

When to use microservices? In the following video where Sam Newman and Martin Fowler discuss microservices, the answer is: "When you've got a really good reason".

It also includes the top 3 reasons for using microservices:
* Zero-downtime independent deployability
* Isolation of data and of processing around that data
* Use microservices to reflect the organizational structure

**When To Use Microservices (And When Not To!)**

<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/GBTdnfD6s5Q" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

A big topic in the video was also the *Distributed Monolith*, where the services are not independently deployable. This is possibly part of the reason why microservices are so hard to define. A simple definition such as "A microservice is any service that is smaller than a monolith", can be used to claim that a Distributed Monolith is a microservice. So a seemingly microservice architecture that does not have the benefits of a microservice architecture may actually be a disguised monolith.

Since it is so hard to define rather than going first into microservices we should listen to the first two takeaways from the video that are "One should use microservices as a means to obtain a desired outcome rather than for the sake of using a new technology" and "Microservices shouldn't be the default option. If you think a service architecture could help, try it with one of the modules from a very simple monolith typology and let it evolve from there".

However, sometimes during this course we'll do **arbitrary** splits to our services just to show the features of Kubernetes. So even though we are doing "[microservices](https://www.youtube.com/watch?v=y8OnoxKotPQ)" in this course, a healthy amount of scepticism is required around microservices in the real world. We will see at least one actual and well-justified use case for microservices with service scaling during the course.

## What is Kubernetes? ##

Let's say you have 3 processes and 2 computers incapable of running all 3 processes. How would you approach this problem?

You'll have to start by deciding which 2 processes go on the same computer and which 1 will be on the different one. How would you fit them? By having the ones demanding most resources and the least resources on the same machine or having the most demanding be on its own? Maybe you want to add one process and now you have to reorganize all of them. What happens when you have more than 2 computers and more than 3 processes? One of the processes is eating all of the memory and you need to get that away from the "critical-bank-application". Should we virtualize everything? Containers would solve that problem, right? Would you move the most important process to a new computer? Maybe some of the processes need to communicate with each other and now you have to deal with networking. What if one of the computers break? What about your Friday plans to visit the local Craft brewery?

What if you could just define "This process should have 6 copies using X amount of resources." and have the 2..N computers working as a single entity to fulfill your request? That's just one thing Kubernetes makes possible.

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">In essence, Kubernetes is the sum of all the bash scripts and best practices that most system administrators would cobble together over time, presented as a single system behind a declarative set of APIs.</p>&mdash; Kelsey Hightower (@kelseyhightower) <a href="https://twitter.com/kelseyhightower/status/1125440400355782657?ref_src=twsrc%5Etfw">May 6, 2019</a></blockquote>

Or more officially:

“Kubernetes (K8s) is an open-source system for automating deployment, scaling, and management of containerized applications. It groups containers that make up an application into logical units for easy management and discovery.” - [kubernetes.io](https://kubernetes.io/)

A container orchestration system such as Kubernetes is often required when maintaining containerized applications. The main responsibility of an orchestration system is the starting and stopping of containers. In addition, they offer networking between containers and health monitoring. Rather than manually doing `docker run critical-bank-application` every time the application crashes, or restart it if it becomes unresponsive, we want the system to keep the application automatically healthy.

A more familiar orchestration system may be docker-compose, which also does the same tasks; starting and stopping, networking and health monitoring. What makes Kubernetes special is the robust feature set for automating all of it.

Read [this comic](https://cloud.google.com/kubernetes-engine/kubernetes-comic/) and watch the video below to get a fast introduction. You may want to revisit these after this part!

<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/Q4W8Z-D-gcQ" frameborder="0" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

We will get started with a lightweight Kubernetes distribution. [K3s - 5 less than K8s](https://k3s.io/), offers us an actual Kubernetes cluster that we can run in containers using [k3d](https://github.com/rancher/k3d).

### Kubernetes cluster with k3d ###

#### What is a cluster? ####

A cluster is a group of machines, *nodes*, that work together - in this case, they are part of a Kubernetes cluster. Kubernetes cluster can be of any size - a single node cluster would consist of one machine that hosts the Kubernetes control-plane (exposing API and maintaining the cluster) and that cluster can then be expanded with up to 5000 nodes total, as of Kubernetes v1.18.

We will use the term "server node" to refer to nodes with control-plane and "agent node" to refer to the nodes without that role. A basic kubernetes cluster may look like this:

<img src="../img/without_k3d.png">

#### Starting a cluster with k3d ####

We'll use k3d to create a group of docker containers that run k3s. The installation instructions, or at least a link to them, are in [part 0](/part-0#installing-k3d). The reason for using k3d is because it is enables us to create a cluster without worrying about virtual machines or physical machines. With k3d our basic cluster will look like this:

<img src="../img/with_k3d.png">

Because the nodes are containers we are going to need to do a little bit of configuring to get those working like we want them. We will get to that later. Creating our very own Kubernetes cluster with k3d is done by a single command.

```console
$ k3d cluster create -a 2
```

This created a Kubernetes cluster with 2 agent nodes. As they're in docker you can confirm that they exist with `docker ps`.

```console
$ docker ps
  CONTAINER ID        IMAGE                      COMMAND                  CREATED             STATUS              PORTS                             NAMES
  11543a6b5015        rancher/k3d-proxy:5.0.0    "/bin/sh -c nginx-pr…"   16 seconds ago      Up 14 seconds       80/tcp, 0.0.0.0:57734->6443/tcp   k3d-k3s-default-serverlb
  f17e07a77061        rancher/k3s:latest         "/bin/k3s agent"         26 seconds ago      Up 24 seconds                                         k3d-k3s-default-agent-1
  b135b5ac987d        rancher/k3s:latest         "/bin/k3s agent"         27 seconds ago      Up 25 seconds                                         k3d-k3s-default-agent-0
  7e5fbc8db7e9        rancher/k3s:latest         "/bin/k3s server --t…"   28 seconds ago      Up 27 seconds                                         k3d-k3s-default-server-0
```

Here we also see that port 6443 is opened to "k3d-k3s-default-serverlb", a useful "load balancer" proxy, that'll redirect a connection to 6443 into the server node, and that's how we can access the contents of the cluster. The port on our machine, above 57734, is randomly chosen. We could have opted out of the load balancer with `k3d cluster create -a 2 --no-lb` and the port would be open straight to the server node but having a load balancer will offer us a few features we wouldn't otherwise have.

K3d helpfully also set up a *kubeconfig*, the contents of which is output by `k3d kubeconfig get k3s-default`.

The other tool that we will be using on this course is kubectl. Kubectl is the Kubernetes command-line tool and will allow us to interact with the cluster. Kubectl will read kubeconfig from the location in KUBECONFIG environment value or by default from `~/.kube/config` and use the information to connect to the cluster. The contents include certificates, passwords and the address in which the cluster API. You can switch set the context with `kubectl config use-context k3d-k3s-default`.

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
  INFO[0011] Stopped cluster 'k3s-default'

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

Let's launch an application that generates and outputs a hash every 5 seconds or so.

I've prepared one [here](https://github.com/kubernetes-hy/material-example/tree/master/app1) `docker run jakousa/dwk-app1`.

To deploy we need the cluster to have an access to the image. By default, Kubernetes is intended to be used with a registry. K3d offers `import-images` command, but since that won't work when we go to non-k3d solutions we'll use the now possibly very familiar registry *Docker Hub*, which we used in [DevOps with Docker](http://devopswithdocker.com/). If you've never used Docker Hub, it's the place where docker client defaults to, so when you run "docker pull nginx" the nginx comes from Docker Hub. You'll need to register an account there and after that you can use `docker login` to authenticate yourself. If you don't wish to use Docker Hub you can also use local registry: follow the [tutorial here](https://k3d.io/usage/guides/registries/#using-a-local-registry) to set one up.

```console
$ docker tag _image_ _username_/_image_
$ docker push _username_/_image_
```

<text-box name="Example applications" variant="hint">
In the future, the material will use the offered applications in the commands. You may follow along by changing the image to your application. Almost everything is found in the same repository <a href="https://github.com/kubernetes-hy/material-example">https://github.com/kubernetes-hy/material-example</a>.
</text-box>

Now we're finally ready to deploy our first app into Kubernetes!

### Deployment ###

To deploy an application we'll need to create a *Deployment* object with the image.

```console
$ kubectl create deployment hashgenerator-dep --image=jakousa/dwk-app1
  deployment.apps/hashgenerator-dep created
```

This action created a few things for us to look at: a *Deployment* resource and a *Pod* resource.

#### What is a Pod? ####

*Pod* is an abstraction around one or more containers. Pods provide a context for 1..N containers so that they can share storage and a network. It's very much like how you have used containers to define environments for a single process. They can be thought of as a container of containers. *Most* of the same rules apply: it is deleted if the containers stop running and files will be lost with it.

<img src="../img/pods.png">

Reading documentation or searching the internet are not the only ways to find information. In case of Kubernetes we get access to information straight from our command line using `kubectl explain RESOURCE` command.
For example to get information about Pod and its mandatory fields we can use the following command.

```console
$ kubectl explain pod
  KIND:     Pod
  VERSION:  v1

  DESCRIPTION:
       Pod is a collection of containers that can run on a host. This resource is
       created by clients and scheduled onto hosts.
```

In Kubernetes all entities that exist are called objects. You can list all objects of a resource with `kubectl get RESOURCE`.

```
$ kubectl get pods
  NAME                               READY   STATUS    RESTARTS   AGE
  hashgenerator-dep-6965c5c7-2pkxc   1/1     Running   0          2m1s
```

#### What is a Deployment resource? ####

A *Deployment* resource takes care of deployment. It's a way to tell Kubernetes what container you want, how they should be running and how many of them should be running.

While we created the Deployment we also created a *ReplicaSet* object. ReplicaSets are used to tell how many replicas of a Pod you want. It will delete or create Pods until the number of Pods you wanted are running. ReplicaSets are managed by Deployments and you should not have to manually define or modify them. If you want to manage the number of replicas, you can edit the Deployment and it will take care of modifying the ReplicaSet.

You can view the deployment:
```console
$ kubectl get deployments
  NAME                READY   UP-TO-DATE   AVAILABLE   AGE
  hashgenerator-dep   1/1     1            1           54s
```

1/1 replicas are ready! We will try multiple replicas later. If your status doesn't look like this check [this page](/known-problems-solutions#first-deployment).

To see the output we can run `kubectl logs -f hashgenerator-dep-6965c5c7-2pkxc`

<text-box name="Automatic completion" variant="hint">
You can use `source <(kubectl completion bash)` to save yourself from a lot of headaches. Add it to .bashrc for an automatic load. (Also available for zsh). If you've never used completion read this <a href="https://iridakos.com/programming/2018/03/01/bash-programmable-completion-tutorial"> tutorial </a>
</text-box>

A helpful list for other commands from docker-cli translated to kubectl is available here [https://kubernetes.io/docs/reference/kubectl/docker-cli-to-kubectl/](https://kubernetes.io/docs/reference/kubectl/docker-cli-to-kubectl/)

<exercise name='Exercise 1.01: Getting started'>

  **Exercises can be done with any language and framework you want.**

  Create an application that generates a random string on startup, stores this string into memory, and outputs it every 5 seconds with a timestamp. e.g.

  ```plaintext
2020-03-30T12:15:17.705Z: 8523ecb1-c716-4cb6-a044-b9e83bb98e43
2020-03-30T12:15:22.705Z: 8523ecb1-c716-4cb6-a044-b9e83bb98e43
  ```

  Deploy it into your Kubernetes cluster and confirm that it's running with `kubectl logs ...`

  You will keep building this application in the future exercises. This application will be called "Log output".

</exercise>

<exercise name='Exercise 1.02: Project v0.1'>

  **Project can be done with any language and framework you want**

  The project will be a simple todo application with the familiar features of create, read, update, and delete (CRUD). We'll develop it during all parts of this course. Check the title of the exercise if you are unsure if it is building the project.

  Todo is a text like "I need to clean the house" that can be in state of not-done or done.

  <img src="../img/project.png" alt="Project evolution" />

  Dashed lines separate major differences across the course. Some exercises are not included in the picture. The connections between most pods are not included as well. You're free to do them however you want.

  Keep this in mind if you want to avoid doing more work than necessary.

  Let's get started!

  Create a web server that outputs "Server started in port NNNN" when it's started and deploy it into your Kubernetes cluster. You won't have access to the port yet but that'll come soon.

</exercise>

## Declarative configuration with YAML ##

We created the deployment with

```console
$ kubectl create deployment hashgenerator-dep --image=jakousa/dwk-app1
```

If we wanted to scale it 4 times and update the image:

```console
$ kubectl scale deployment/hashgenerator-dep --replicas=4

$ kubectl set image deployment/hashgenerator-dep dwk-app1=jakousa/dwk-app1:78031863af07c4c4cc3c96d07af68e8ce6e3afba
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

<text-box name="Text editor of choice" variant="hint">
  I personally use vscode to create these yaml files. It has helpful autofill, definitions and syntax check for Kubernetes with the extension Kubernetes by Microsoft. Even now it helpfully warns us that we haven't defined resource limitations.
</text-box>

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

Instead of deleting the deployment we could just apply a modified deployment on top of what we already have. Kubernetes will take care of rolling out a new version. By using tags (e.g. `dwk/image:tag`) with the deployments each time we update the image we can modify and apply the new deployment yaml. Previously you may have always used the 'latest' tag, or not thought about tags at all. From the tag Kubernetes will know that the image is a new one and pulls it.

When updating anything in Kubernetes the usage of delete is actually an anti-pattern and you should use it only as the last option. As long as you don't delete the resource Kubernetes will do a rolling update, ensuring minimum (or none) downtime for the application. On the topic of anti-patterns: you should also always avoid doing anything imperatively! If your files don't tell Kubernetes and your team what the state should be and instead you run commands that edit the state you are just lowering the [bus factor](https://en.wikipedia.org/wiki/Bus_factor) for your cluster and application.

<exercise name='Exercise 1.03: Declarative approach'>

  In your "Log output" application create the folder for manifests and move your deployment into a declarative file.

  Make sure everything still works by restarting and following logs.

</exercise>

<exercise name='Exercise 1.04: Project v0.2'>

  Create a deployment for the project.

  You won't have access to the port yet but that'll come soon.

</exercise>

Your basic workflow may look something like this:

```console
$ docker build -t <image>:<new_tag>

$ docker push <image>:<new_tag>
```

Then edit deployment.yaml so that the tag is updated to the \<new_tag\> and

```console
$ kubectl apply -f manifests/deployment.yaml
```

<quiz id="7671ddcf-3b5c-4b83-a705-b3b7bb665baf"></quiz>
