---
path: '/part-2/2-organizing-a-cluster'
title: 'Organizing a cluster'
hidden: false
---

<text-box variant='learningObjectives' name='Learning Objectives'>

After this section you

- know the methods for organizing a cluster

- know about constraining pods to specific nodes

</text-box>

As you can imagine, there may be a lot of resources inside a cluster. In fact, at the moment of writing this Kubernetes supports over 100 000 pods in a single cluster.

### Namespaces ###

Namespaces are used to keep resources separated. A company which uses 1 cluster but has multiple projects can use namespaces to split the cluster into virtual clusters, one for each project. Most commonly they would be used to separate environments such as production, testing, staging. DNS entry for services includes the namespace so you can still have projects communicate with each other if needed through service.namespace address. e.g if the example-service from a previous section was in a namespace "ns-test" it could be found from other namespaces via "http://example-service.ns-test".

Accessing namespaces with kubectl is achieved by using the `-n` flag. For example, you can see what the namespace kube-system has with

```console
$ kubectl get pods -n kube-system
```

To see everything you can use `--all-namespaces`.

```console
$ kubectl get all --all-namespaces
```

Namespaces should be kept separate - you could run all of the examples and do the exercises of this course in a cluster that is shared with critical software. An administrator should set a *ResourceQuota* for that namespace so that you can safely run anything there. We'll look into resource limits and requests later.

Creating a namespace is a oneliner (`kubectl create namespace example-namespace`). You can define the namespace to use by adding it to the metadata section of the yamls.

```yaml
# ...
metadata:
  namespace: example-namespace
  name: example
# ...
```

If you're using a specific namespace constantly, you can set the namespace to be used by default with `kubectl config set-context --current --namespace=<name>`.

**Kubernetes Best Practices - Organizing Kubernetes with Namespaces**

<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/xpnZX3if9Tc" frameborder="0" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

<exercise name='Exercise 2.03: Keep them separated'>

  Create a namespace for the applications in the exercises. Move the "Log output" and "Ping-pong" to that namespace and use that in the future for all of the exercises. You can follow the material in the default namespace.

</exercise>

<exercise name='Exercise 2.04: Project v1.1'>

  Create a namespace for the project and move everything related to the project to that namespace.

</exercise>

### Labels ###

Labels are used to separate an application from others inside a namespace and to group different resources together. Labels are key-value pairs and they can be modified, added or removed at any time. Labels can also be added to almost anything.

Labels can help us humans identify resources and Kubernetes can use them to act upon a group of resources. You can query resources that have a certain label. The labels are also used by selectors when they select objects.

Let's look at the labels in *Deployment* yamls. This is the first yaml we created:

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
          image: jakousa/dwk-app1:b7fc18de2376da80ff0cfc72cf581a9f94d10e64
```

In this case the yaml includes both a selector and a label. The _selector_ and _matchLabels_ reveal that the instructions of the deployment are directed to pods with the following label. _matchLabels_ is a key-value pair but we could've used _matchExpressions_ instead. While the template metadata includes a label with key-value pair app and hashgenerator. We can use the same label on multiple namespaces and the namespace would keep them from interfering with each other.

Grouping is simple. Either add the label into the file or if you've already deployed the hashgenerator above add the label and you can query with `-l`.

```console
$ kubectl label po hashgenerator-dep-7b9b88f8bf-lvcv4 examplelabel=smart
  pod/hashgenerator-dep-7b9b88f8bf-lvcv4 labeled

$ kubectl get po -l examplelabel=smart
  NAME                                 READY   STATUS    RESTARTS   AGE
  hashgenerator-dep-7b9b88f8bf-lvcv4   1/1     Running   0          17m
```

With labels we can even move pods to labeled nodes. Let's say we have a few nodes which have qualities that we wish to avoid. For example they might have a slower network. With labels and _nodeSelector_ configured to deployment we can do just that. First add _nodeSelector_ to the deployment and then label the node(s):

**deployment.yaml**

```yaml
    ...
    spec:
      containers:
        - name: hashgenerator
          image: jakousa/dwk-app1:b7fc18de2376da80ff0cfc72cf581a9f94d10e64
      nodeSelector:
        networkquality: excellent
```

If you already had it running, it won't move the pod to avoid unwanted changes in the system. We'll delete the pod so that Kubernetes will move the new version to the correct node.

```console
$ kubectl delete po hashgenerator-dep-7b9b88f8bf-tnvfg
  pod "hashgenerator-dep-7b9b88f8bf-tnvfg" deleted

$ kubectl get po
  NAME                                 READY   STATUS    RESTARTS   AGE
  hashgenerator-dep-7b9b88f8bf-lvcv4   0/1     Pending   0          4s
```

Now the status is "Pending" as there are no nodes with an excellent network quality. Next, label the agent-1 as being one with excellent network quality and Kubernetes will know where the pod is able to run .

```
$ kubectl label nodes k3d-k3s-default-agent-1 networkquality=excellent
  node/k3d-k3s-default-agent-1 labeled

$ kubectl get po
  NAME                                 READY   STATUS    RESTARTS   AGE
  hashgenerator-dep-7b9b88f8bf-lvcv4   1/1     Running   0          5m30s
```

_nodeSelector_ is a blunt tool. It's great when you want to define binary qualities, like "don't run this application if the node is using an HDD instead of an SSD" by labeling the nodes according to disk types. There are more sophisticated tools you should use when you have a cluster of various machines, ranging from a [fighter jet](https://gcn.com/articles/2020/01/07/af-kubernetes-f16.aspx) to a toaster to a supercomputer. Kubernetes can use _affinity_ and _anti-affinity_ to select which nodes are prioritized for which applications and _taints_ with _tolerances_ so that a pod can avoid certain nodes. For example, if a machine has a high network latency and we wouldn't want it to do some latency critical tasks.

See [affinity and anti-affinity](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#affinity-and-anti-affinity) and [taints and tolerances](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/) for detailed information. We will not be assigning pods to specific nodes on this course, as we have a homogeneous cluster.

<quiz id="7dff6967-da9e-492c-8c5a-fab605868215"></quiz>
