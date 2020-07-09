---
layout: page
title: Part 5
inheader: yes
permalink: /part5/
order: 5
---

**HERE BE DRAGONS**

Kubernetes is defined as an "container-orchestration system"  and "portable, existensible platform". In this part we'll focus on how and why its built and how to leverage the extensibility of Kubernetes.

## Kubernetes Internals ##

Instead of thinking about Kubernetes as something completely new I've found that comparing it to an operating system helps. I'm not an expert in operating systems but we've all used them.

Kubernetes is a layer on top of which we run our applications. It takes the resources that are accessible from the layers below and manages our applications and resources. And it provides services, such as the DNS, for the applications. With this OS mindset we can also try to go the other way: You may have used a [cron](https://en.wikipedia.org/wiki/Cron) (or windows' [task scheduler](https://en.wikipedia.org/wiki/Windows_Task_Scheduler)) for saving long term backups of some applications. Here's the same thing in Kubernetes with [CronJobs](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/).

Now that we'll start talking about the internals we'll learn new insight on Kubernetes and will be able to prevent and solve problems that may result from its nature.

Due to this section being mostly a reiteration of Kubernetes documentation I will include various links the official version of the documentation - we will not setup our own Kubernetes cluster manually. If you want to go hands on and learn to setup your own cluster with you should read and complete [Kubernetes the Hard Way](https://github.com/kelseyhightower/kubernetes-the-hard-way) by Kelsey Hightower.

### Controllers and Eventual Consistency ###

[Controllers](https://kubernetes.io/docs/concepts/architecture/controller/) watch the state of your cluster and then tries to move the current state of the cluster closer to the desired state. When you declare X replicas of a Pod in your deployment.yaml, a controller called Replication Controller makes sure that that will be true. There are a number of controllers for different responsibilities.

### Kubernetes Control Plane ###

[Kubernetes Control Plane](https://kubernetes.io/docs/concepts/overview/components/#control-plane-components) consists of

* etcd
  - A key-value storage that Kubernetes uses to save all cluster data.

* kube-scheduler
  - Decides on which node a Pod should be run on.

* kube-controller-manager
  - Is responsible for and runs all of the controllers.

* kube-apiserver
  - This exposes the Kubernetes Control Plane through an API

There's also cloud-controller-manager that lets you link your cluster into a cloud provider's API. If you wanted to build your own cluster on [Hetzner](https://www.hetzner.com/cloud), for example, you could use [hcloud-cloud-controller-manager](https://github.com/hetznercloud/hcloud-cloud-controller-manager) in your own cluster installed on their VMs.

### Node Components ###

Every node has a number [components](https://kubernetes.io/docs/concepts/overview/components/#node-components) that maintain the running pods.

* kubelet
  - Makes sure containers are running in a Pod

* kube-proxy
  - network proxy and maintains the network rules. Enables connections outside and inside of the cluster as well as Services to work as we've been using them.

And also the Container Runtime. We've been using Docker for this course.

### Addons ###

In addition to all of the previously mentioned, Kubernetes has [Addons](https://kubernetes.io/docs/concepts/cluster-administration/addons/) which use the same Kubernetes resources we've been using and extend Kubernetes. You can view which resources the addons have created in the `kube-system` namespace.

```console
$ kubectl -n kube-system get all
  NAME                                                            READY   STATUS    RESTARTS   AGE
  pod/event-exporter-v0.2.5-599d65f456-vh4st                      2/2     Running   0          5h42m
  pod/fluentd-gcp-scaler-bfd6cf8dd-kmk2x                          1/1     Running   0          5h42m
  pod/fluentd-gcp-v3.1.1-9sl8g                                    2/2     Running   0          5h41m
  pod/fluentd-gcp-v3.1.1-9wpqh                                    2/2     Running   0          5h41m
  pod/fluentd-gcp-v3.1.1-fr48m                                    2/2     Running   0          5h41m
  pod/heapster-gke-9588c9855-pc4wr                                3/3     Running   0          5h41m
  pod/kube-dns-5995c95f64-m7k4j                                   4/4     Running   0          5h41m
  pod/kube-dns-5995c95f64-rrjpx                                   4/4     Running   0          5h42m
  pod/kube-dns-autoscaler-8687c64fc-xv6p6                         1/1     Running   0          5h41m
  pod/kube-proxy-gke-dwk-cluster-default-pool-700eba89-j735       1/1     Running   0          5h41m
  pod/kube-proxy-gke-dwk-cluster-default-pool-700eba89-mlht       1/1     Running   0          5h41m
  pod/kube-proxy-gke-dwk-cluster-default-pool-700eba89-xss7       1/1     Running   0          5h41m
  pod/l7-default-backend-8f479dd9-jbv9l                           1/1     Running   0          5h42m
  pod/metrics-server-v0.3.1-5c6fbf777-lz2zh                       2/2     Running   0          5h41m
  pod/prometheus-to-sd-jw9rs                                      2/2     Running   0          5h41m
  pod/prometheus-to-sd-qkxvd                                      2/2     Running   0          5h41m
  pod/prometheus-to-sd-z4ssv                                      2/2     Running   0          5h41m
  pod/stackdriver-metadata-agent-cluster-level-5d8cd7b6bf-rfd8d   2/2     Running   0          5h41m
  
  NAME                           TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)         AGE
  service/default-http-backend   NodePort    10.31.251.116   <none>        80:31581/TCP    5h42m
  service/heapster               ClusterIP   10.31.247.145   <none>        80/TCP          5h42m
  service/kube-dns               ClusterIP   10.31.240.10    <none>        53/UDP,53/TCP   5h42m
  service/metrics-server         ClusterIP   10.31.249.74    <none>        443/TCP         5h42m
  
  NAME                                      DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR                                                              AGE
  daemonset.apps/fluentd-gcp-v3.1.1         3         3         3       3            3           beta.kubernetes.io/fluentd-ds-ready=true,beta.kubernetes.io/os=linux       5h42m
  daemonset.apps/metadata-proxy-v0.1        0         0         0       0            0           beta.kubernetes.io/metadata-proxy-ready=true,beta.kubernetes.io/os=linux   5h42m
  daemonset.apps/nvidia-gpu-device-plugin   0         0         0       0            0           <none>                                                                     5h42m
  daemonset.apps/prometheus-to-sd           3         3         3       3            3           beta.kubernetes.io/os=linux                                                5h42m
  
  NAME                                                       READY   UP-TO-DATE   AVAILABLE   AGE
  deployment.apps/event-exporter-v0.2.5                      1/1     1            1           5h42m
  deployment.apps/fluentd-gcp-scaler                         1/1     1            1           5h42m
  deployment.apps/heapster-gke                               1/1     1            1           5h42m
  deployment.apps/kube-dns                                   2/2     2            2           5h42m
  deployment.apps/kube-dns-autoscaler                        1/1     1            1           5h42m
  deployment.apps/l7-default-backend                         1/1     1            1           5h42m
  deployment.apps/metrics-server-v0.3.1                      1/1     1            1           5h42m
  deployment.apps/stackdriver-metadata-agent-cluster-level   1/1     1            1           5h42m
  
  NAME                                                                  DESIRED   CURRENT   READY   AGE
  replicaset.apps/event-exporter-v0.2.5-599d65f456                      1         1         1       5h42m
  replicaset.apps/fluentd-gcp-scaler-bfd6cf8dd                          1         1         1       5h42m
  replicaset.apps/heapster-gke-58bf4cb5f5                               0         0         0       5h42m
  replicaset.apps/heapster-gke-9588c9855                                1         1         1       5h41m
  replicaset.apps/kube-dns-5995c95f64                                   2         2         2       5h42m
  replicaset.apps/kube-dns-autoscaler-8687c64fc                         1         1         1       5h42m
  replicaset.apps/l7-default-backend-8f479dd9                           1         1         1       5h42m
  replicaset.apps/metrics-server-v0.3.1-5c6fbf777                       1         1         1       5h41m
  replicaset.apps/metrics-server-v0.3.1-8559697b9c                      0         0         0       5h42m
  replicaset.apps/stackdriver-metadata-agent-cluster-level-5d8cd7b6bf   1         1         1       5h41m
  replicaset.apps/stackdriver-metadata-agent-cluster-level-7bd5ddd849   0         0         0       5h42m
```

To get a complete picture of how each part communicates with each other [what happens when k8s](https://github.com/jamiehannaford/what-happens-when-k8s) explores what happens when you do `kubectl run nginx --image=nginx --replicas=3` shedding some more light on the magic that happens behind the scenes.

## Custom Resource Definitions ##

We've used a number of CRDs, Custom Resource Definitions, previously. They are a way to extend Kubernetes with our own Resources. So let us do just that and extend Kubernetes! There's another option for [API Aggregation](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/apiserver-aggregation/) but that's left outside of the course. 

We'll want a resource that counts down to 0. And a controller that makes sure that countdowns at 0 are removed. So let's start by defining a resource called "Countdown" - as a template I'll use one provided by the [docs](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/).

**resourcedefinition.yaml**
```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  # name must match the spec fields below, and be in the form: <plural>.<group>
  name: countdown.stable.dwkcu
spec:
  # group name to use for REST API: /apis/<group>/<version>
  group: stable.dwk
  # list of versions supported by this CustomResourceDefinition
  versions:
    - name: v1
      # Each version can be enabled/disabled by Served flag.
      served: true
      # One and only one version must be marked as the storage version.
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                length: # We will be able to define the length of the countdown
                  type: integer
                  default: 10
                image: # define the image for countdown
                  type: string
                replicas: # define how many countdowns
                  type: integer
                  default: 1
  # either Namespaced or Cluster
  scope: Namespaced
  names:
    # kind is normally the CamelCased singular type. Your resource manifests use this.
    kind: Countdown
    # plural name to be used in the URL: /apis/<group>/<version>/<plural>
    plural: countdowns
    # singular name to be used as an alias on the CLI and for display
    singular: countdown
    # shortNames allow shorter string to match your resource on the CLI
    shortNames:
    - cd
```

Now we can create our own Countdown:

```yaml
apiVersion: stable.dwk/v1
kind: Countdown
metadata:
  name: doomsday
spec:
  replicas: 1
  length: 10
  image: jakousa/dwk-app10:sha-adaefc5
```

And then..

```console
$ kubectl apply -f countdown.yaml
  countdown.stable.dwk/doomsday created

$ kubectl get cd
  NAME       AGE
  doomsday   3s
```

Now it's running, but unfortunately 


Exercise, a proxy ???