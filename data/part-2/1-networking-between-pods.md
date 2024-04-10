---
path: "/part-2/1-networking-between-pods"
title: "Networking between pods"
hidden: false
---

<text-box variant='learningObjectives' name='Learning Objectives'>

After this section

- You know about Kubernetes DNS

- Send requests from a pod to another pod within a cluster

</text-box>

In part 1 we managed to setup networking configuration to enable routing traffic from outside of the cluster to a container inside a pod. In Part 2 we'll focus on communication between pods.

Kubernetes includes a DNS service so communication between pods and containers in Kubernetes is pretty simillar as it was with containers in Docker compose. Containers in a pod share the network. As such every other container inside a pod is accessible from `localhost`. For communication between Pods a _Service_ is used as they expose the Pods as a network service.

The following service, taken from an exercise in last part, creates a cluster-internal IP which will enable other pods in the cluster to access the port 3000 of _todo-backend_ application in http://todo-backend-svc:2345.

**service.yaml**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: todo-backend-svc
spec:
  type: ClusterIP
  selector:
    app: todo-backend
  ports:
    - port: 2345
      protocol: TCP
      targetPort: 3000
```

Alternatively each Pod has an IP created by Kubernetes.

### A debugging pod

Sometimes, the best way to debug is to manually test what is going on. You can just go inside a pod or send a request manually from another pod. You can use eg. [busybox](https://en.wikipedia.org/wiki/BusyBox), that is a light wight Linux distro for debugging.

Let us start a busybox pod by applying the following yaml:

**pod_for_debugging.yaml**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-busybox
  labels:
    app: my-busybox
spec:
  containers:
  - image: busybox
    command:
      - sleep
      - "3600"
    imagePullPolicy: IfNotPresent
    name: busybox
  restartPolicy: Always
```

Now we can just exec a command:

```bash
$ kubectl exec -it my-busybox -- wget -qO - http://todo-backend-svc:2345
```

We used the [wget](https://www.gnu.org/software/wget/) command since our usual tool for the purposes curl is not readily available in busybox.

We can also open a shell to the pod with command [kubectl exec](https://kubernetes.io/docs/tasks/debug/debug-application/get-shell-running-container/) to run several commands:

```yaml
$ kubectl exec -it my-busybox sh
/ # wget -qO - http://todo-backend-svc:2345
<html>
   <body>
      <h1>Kube todo</h1>
      <img src="/picture.jpg" alt="rndpic" width="200" height="200">

      <form action="/create-todo" method="POST">
         <input type="text" name="todo" maxlength="140" placeholder="Enter todo">
         <button type="submit">Create</button>
      </form>

      <ul>
            <li>Buy milk</li>
            <li>Send a letter</li>
            <li>Pay bills</li>
      </ul>
   </body>
</html>/ #
$ exit
```

You get the same result by using the service cluster IP address. Let us check the address:

```bash
$ kubectl get svc
NAME               TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)    AGE
todo-backend-svc   ClusterIP   10.43.89.182   <none>        2345/TCP   2d1h
```

The following shows the main page of the todo-app:

```bash
$ kubectl exec -it my-busybox -- wget -qO - http://10.43.89.182:2345
```

Let us try to access a pod directly. We can get the IP address with _kubectl describe_ command:

```bash
$ kubectl describe pod todo-backend-dep-84fcdff4cc-2x9wl
Name:             todo-backend-dep-84fcdff4cc-2x9wl
Namespace:        default
Priority:         0
Service Account:  default
Node:             k3d-k3s-default-agent-0/192.168.176.5
Start Time:       Mon, 08 Apr 2024 23:27:00 +0300
Labels:           app=todo-backend
                  pod-template-hash=84fcdff4cc
Annotations:      <none>
Status:           Running
IP:               10.42.0.63
```

So one of the pods that is running the todo-app has cluster internal IP address _10.42.0.63_. We can wget to this address, but this time we have to remember that the port in the pod is 3000:

```bash
$ kubectl exec -it my-busybox wget -qO - http://10.42.0.63:3000
```

Note that in contrast to the last part, we have now created a stand-alone pod in our cluster, there was no deployment object at all. Once we are done, we should destroy the pod, eg. with the command

```yaml
$ kubectl delete pod/my-busybox
```
In general, these kinds of "stand-alone" pods are good for debugging but all application pods should be created by using a deployment. The reason for this is that if a node where the pod resides crashes, the stand-alone pods are gone. When a pod is controlled by a deployment, Kubernetes takes care of redeployment in case of node failures.

</text-box>

<exercise name='Exercise 2.01: Connecting pods'>

Connect the "Log output" application and "Ping-pong" application. Instead of sharing data via files use HTTP endpoints to respond with the number of pongs. Deprecate all the volume between the two applications for the time being.

The output will stay the same:

```
2020-03-30T12:15:17.705Z: 8523ecb1-c716-4cb6-a044-b9e83bb98e43.
Ping / Pongs: 3
```

</exercise>

<exercise name='Exercise 2.02: Project v1.0'>

Create a new image for the *backend of the todo application*.

Use ingress routing to enable access to the backend.

Create a POST /todos endpoint and a GET /todos endpoint in the new service where we can post a new todo and get all of the todos. You can also move the image logic to the new service if it requires backend logic.

The todos can be saved into memory, we'll add database later.

Frontend already has an input field. Connect it into our backend so that inputting data and pressing send will add a new todo into the list.

</exercise>
