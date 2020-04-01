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

```bash
k3d create -w 2
```

This created a kubernetes cluster with 2 worker nodes. As they're in docker you can confirm that they exist with `docker ps`.

```bash
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

```bash
$ docker tag _image_ _username_/_image_
$ docker push _username_/_image_
```

> In the future the material will use the offered applications in the commands. Follow along by changing the image to your application

Now we're finally ready to deploy our first app into Kubernetes!

### Deployment ###

To deploy an application we'll need to create a *Deployment* with the image.

```bash
$ kubectl create deployment hashgenerator-dep --image=jakousa/dwk-app1
deployment.apps/hashgenerator-dep created
```

This action created a few things for us to look at: a *Deployment* and a *Pod*.

#### What is a Pod? ####

A *Pod* is an abstraction around one or more containers. Similarly as you've now used containers to define environments for a single process. Pods provide an context for 1..N containers so that they can share a storage and a network. They can be thought of as a container of containers. _Most_ of the same rules apply: it is deleted if the containers stop running and files will be lost with it.

TODO: Image of a pod

#### What is a Deployment? ####

A *Deployment* takes care of deployment. It's a way to tell Kubernetes what container you want, how they should be running and how many of them should be running.

The Deployment also created a *ReplicaSet*, which is a way to tell how many replicas of a Pod you want. It will delete or create Pods until the the number of Pods you wanted are running. ReplicaSets are managed by Deployments and you should not have to manually define or modify them.

You can view the deployment:
```bash
$ kubectl get deployments
NAME                READY   UP-TO-DATE   AVAILABLE   AGE
hashgenerator-dep   1/1     1            1           54s
```

And the pods:
```bash
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

```bash
2020-03-30T12:15:17.705Z: 8523ecb1-c716-4cb6-a044-b9e83bb98e43
```

Deploy it into your kubernetes cluster and confirm that it's running with `kubectl logs`

## Switch to YAML ##

We created the deployment with 

`$ kubectl create deployment hashgenerator-dep --image=jakousa/dwk-app1`.

If we wanted to scale it 4 times and update the image:

`$ kubectl scale deployment/hashgenerator-dep --replicas=4`

`$ kubectl set image deployment/hashgenerator-dep dwk-app1=jakousa/dwk-app1:78031863af07c4c4cc3c96d07af68e8ce6e3afba`

Things start to get really cumbersome. In the dark ages deployments were created similarly by running commands after each other in a "correct" order. We'll now use a declarative approach, where we define how things should be, rather than iterative is more sustainable in the long term.

Before redoing the previous let's take the deployment down.

```bash
$ kubectl delete deployment hashgenerator-dep
deployment.apps "hashgenerator-dep" deleted
```

and create a new folder named `manifests` to the project and a file called deployment.yaml with the following contents (you can check the example [here](https://github.com/kubernetes-hy/material-example/tree/master/app1)): 

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

> I personally use vscode to create these yaml files. It has helpful autofill, definitions and syntax check for Kubernetes with the extension Kubernetes by Microsoft. Even now it helpfully warns us that we haven't defined resource limitations.

This looks a lot like the docker-compose.ymls we have previously written. Let's ignore what we don't know for now (mainly labels) and focus on the things that we know:

* We're declaring what kind it is (kind: Deployment)
* We're declaring it a name as metadata (name: hashgenerator-dep)
* We're declaring that there should be one of them (replicas: 1)
* We're declaring that it has a container that is from a certain image with a name

Apply the deployment with `apply` command:

```bash
$ kubectl apply -f manifests/deployment.yaml
deployment.apps/hashgenerator-dep created
```

That's it, but for revisions sake lets delete it and create it again:

```bash
$ kubectl delete -f manifests/deployment.yaml
deployment.apps "hashgenerator-dep" deleted

$ kubectl apply -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app1/manifests/deployment.yaml
deployment.apps/hashgenerator-dep created
```

Woah! The fact that you can apply manifest from the internet just like that will come in handy.

Exercise 2:

In your project create the folder for manifests and move your deployment into a declarative file. Make sure everything still works by restarting and following logs.

## Networking Part 1 ##

Restarting and following logs has been a treat. Next we'll open an endpoint to the application and access it via HTTP.

#### Simple networking application ####

Let's develop our application so that it has a HTTP server responding with two hashes: a hash that is stored until the process is exited and a hash that is request specific. The response body can be something like "Application abc123. Request 94k9m2". Choose any port to listen to.

I've prepared one [here](https://github.com/kubernetes-hy/material-example/tree/master/app2). By default it will listen on port 3000.

```bash
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app2/manifests/deployment.yaml
deployment.apps/hashresponse-dep created
```

### Connecting from outside of the cluster ###

We can confirm that the hashresponse-dep is working with `port-forward` command. Let's see the name of the pod first and then port forward there:

```bash
$ kubectl get po # Not a typo
NAME                                READY   STATUS    RESTARTS   AGE
hashgenerator-dep-5cbbf97d5-z2ct9   1/1     Running   0          20h
hashresponse-dep-57bcc888d7-dj5vk   1/1     Running   0          19h

$ kubectl port-forward hashresponse-dep-57bcc888d7-dj5vk 3003:3000 # Local:Pod
Forwarding from 127.0.0.1:3003 -> 3000
Forwarding from [::1]:3003 -> 3000
```

Now we can view the response from http://localhost:3003 and confirm that it is working as expected.

External connections with docker used the flag -p `-p 3003:3000` or in docker-compose ports declaration. Unfortunately Kubernetes isn't as simple. We're going to use either a *Service* resource or an *Ingress* resource.

#### Before anything else ####

Because we are running our cluster inside docker with k3d we have to do a few preparations.
Opening a route from outside of the cluster to the pod will not be enough as we have no means of accessing the cluster inside the containers!

To illustrate:

```
$ docker ps
CONTAINER ID        IMAGE                COMMAND                  CREATED             STATUS              PORTS                    NAMES
83dde7d5fcac        rancher/k3s:v1.0.1   "/bin/k3s agent"         3 days ago          Up 23 hours                                  k3d-k3s-default-worker-1
00b2dff4b2a9        rancher/k3s:v1.0.1   "/bin/k3s agent"         3 days ago          Up 23 hours                                  k3d-k3s-default-worker-0
6a3bef5af379        rancher/k3s:v1.0.1   "/bin/k3s server --h…"   3 days ago          Up 23 hours         0.0.0.0:6443->6443/tcp   k3d-k3s-default-server
```

As you can see only port 6443 is open (this is used by kubectl). Let's delete our old cluster and create a new one with ports 8081 and 8082 open:

```
$ k3d delete
INFO[0000] Removing cluster [k3s-default]               
INFO[0000] ...Removing 2 workers                        
INFO[0022] ...Removing server                           
INFO[0036] ...Removing docker image volume              
INFO[0036] Removed cluster [k3s-default]

$ k3d create --publish 8081:80 --publish 8082:30080@k3d-k3s-default-worker-0 --workers 2
INFO[0000] Created cluster network with ID 903e292db40363804d315ff9543414e58cf1bbdb5985c5e61b9941ed4bc29679 
INFO[0000] Created docker volume  k3d-k3s-default-images
...

$ export KUBECONFIG="$(k3d get-kubeconfig --name='k3s-default')"
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app2/manifests/deployment.yaml
deployment.apps/hashresponse-dep created
```

Now we've opened port 8081 to our master and 8082 to one of our workers port 30080. They will be used to showcase different methods of communicating with the servers.

> Your OS may support using the host network so no ports need to be opened.

#### What is a Service? ####

As *Deployment* resources took care of deployments for us. *Service* resource will take care of serving the application to connections from outside of the cluster. 

Create a file service.yaml into the manifests folder and we need the service to do the following things:

1. Declare that we want a Service
2. Declare which port to listen to
3. Declare the application where the request should be directed to
4. Declare the port where the request should be directed to

This translates into a yaml file with contents

```yml
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

```bash
$ kubectl apply -f manifests/service.yaml
service/hashresponse-svc created
```

As we've published 8082 as 30080 we can access it now via http://localhost:8082.

We've now defined a nodeport with `type: NodePort`. *NodePorts* simply ports that are opened by Kubernetes to **all of the nodes** and the service will handle requests in that port. NodePorts are not flexible and require you to assign a different port for every application. As such NodePorts are not used in production but are helpful to know about.

What we'd want to use instead of NodePort would be a *LoadBalancer* type service but this "only" works with cloud providers as it configures a, possibly costly, load balancer for it. We'll get to know them in part 2.

There's one additional resource that will help us with serving the application, *Ingress*.

#### What is an Ingress? ####

Incoming Network Access resource *Ingress* is completely different type of resource from *Services*. If you've got your OSI model memorized, it works in the layer 7 while services work on layer 4. You could see these used together: first the aforementioned *LoadBalancer* and then Ingress to handle routing. In our case as we don't have a load balancer available we can use the Ingress as the first stop.

This will require us to create two new resources. Ingress will route incoming traffic again to *Services*, but the old nodeport Service won't do. 

```bash
$ kubectl delete -f manifests/service.yaml
service "hashresponse-svc" deleted
```

In this case we will need to declare

For resource 1 the new *Service* we want a simpler version of the one above. A ClusterIP resource that will let TCP traffic from port XXXX to port 3000:

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

```yml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: hashresponse-ing
spec:
  rules:
  - http:
      paths:
      - path: /
        backend:
          serviceName: hashresponse-svc
          servicePort: 2345
```

TODO annotation

Then we can apply everything and view the result

```bash
$ kubectl apply -f manifests/service.yml
service/hashresponse-svc created
$ kubectl apply -f manifests/ingress.yml
ingress.extensions/hashresponse-ing created

$ kubectl get svc
NAME               TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)    AGE
kubernetes         ClusterIP   10.43.0.1      <none>        443/TCP    23h
hashresponse-svc   ClusterIP   10.43.236.27   <none>        2345/TCP   4m23s

$ kubectl get ing
NAME               HOSTS   ADDRESS      PORTS   AGE
hashresponse-ing   *       172.28.0.4   80      77s
```

We can see that the ingress is listening on port 80. As we already opened port there we can access the application on http://localhost:8081.


Exercise 3:

Developing an application and using ingress

Exercise 4:

Microservices get started!
Developing a second application and routing with ingress
