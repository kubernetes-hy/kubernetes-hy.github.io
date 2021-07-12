---
path: '/part-5/1-kubernetes-internals'
title: 'Kubernetes Internals'
hidden: false
---

<text-box variant='learningObjectives' name='Learning Objectives'>

After this section you

- can explain in broad terms how Kubernetes operates

</text-box>

Instead of thinking about Kubernetes as something completely new I've found that comparing it to an operating system helps. I'm not an expert in operating systems but we've all used them.

Kubernetes is a layer on top of which we run our applications. It takes the resources that are accessible from the layers below and manages our applications and resources. And it provides services, such as the DNS, for the applications. With this OS mindset we can also try to go the other way: You may have used a [cron](https://en.wikipedia.org/wiki/Cron) (or windows' [task scheduler](https://en.wikipedia.org/wiki/Windows_Task_Scheduler)) for saving long term backups of some applications. Here's the same thing in Kubernetes with [CronJobs](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/).

Now that we'll start talking about the internals we'll learn new insight on Kubernetes and will be able to prevent and solve problems that may result from its nature.

Due to this section being mostly a reiteration of Kubernetes documentation I will include various links the official version of the documentation - we will not setup our own Kubernetes cluster manually. If you want to go hands-on and learn to setup your own cluster with you should read and complete [Kubernetes the Hard Way](https://github.com/kelseyhightower/kubernetes-the-hard-way) by Kelsey Hightower. If you have any leftover credits from part 3 this is a great way to spend some of them.

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

To get a complete picture of how each part communicates with each other "[what happens when k8s](https://github.com/jamiehannaford/what-happens-when-k8s)" explores what happens when you do `kubectl run nginx --image=nginx --replicas=3` shedding some more light on the magic that happens behind the scenes.

## Self-healing ##

Back in part 1 we talked a little about the "self-healing" nature of Kubernetes and how pods can be deleted and they're automatically recreated.

Let's see what happens if we delete a node that has a pod in it. Let's first deploy the pod, a web application with ingress from part 1, confirm that it's running and then see which pod has it running.

```console
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app2/manifests/deployment.yaml \
                -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app2/manifests/ingress.yaml \
                -f https://raw.githubusercontent.com/kubernetes-hy/material-example/master/app2/manifests/service.yaml
  deployment.apps/hashresponse-dep created
  ingress.extensions/dwk-material-ingress created
  service/hashresponse-svc created

$ curl localhost:8081
9eaxf3: 8k2deb

$ kubectl describe po hashresponse-dep-57bcc888d7-5gkc9 | grep 'Node:'
  Node:         k3d-k3s-default-agent-1/172.30.0.2
```

In this case it's in agent-1. Let's make the node go "offline" with pause:

```console
$ docker ps
  CONTAINER ID        IMAGE                      COMMAND                  CREATED             STATUS              PORTS                                           NAMES
  5c43fe0a936e        rancher/k3d-proxy:v3.0.0   "/bin/sh -c nginx-pr…"   10 days ago         Up 2 hours          0.0.0.0:8081->80/tcp, 0.0.0.0:50207->6443/tcp   k3d-k3s-default-serverlb
  fea775395132        rancher/k3s:latest         "/bin/k3s agent"         10 days ago         Up 2 hours                                                          k3d-k3s-default-agent-1
  70b68b040360        rancher/k3s:latest         "/bin/k3s agent"         10 days ago         Up 2 hours          0.0.0.0:8082->30080/tcp                         k3d-k3s-default-agent-0
  28cc6cef76ee        rancher/k3s:latest         "/bin/k3s server --t…"   10 days ago         Up 2 hours                                                          k3d-k3s-default-server-0

$ docker pause k3d-k3s-default-agent-1
k3d-k3s-default-agent-1
```

Now wait for a while and this should be the new state:

```console
$ kubectl get po
NAME                                READY   STATUS        RESTARTS   AGE
hashresponse-dep-57bcc888d7-5gkc9   1/1     Terminating   0          15m
hashresponse-dep-57bcc888d7-4klvg   1/1     Running       0          30s

$ curl localhost:8081
6xluh2: ta0ztp
```

What did just happen? Read [this explanation on how kubernetes handles offline nodes](https://dev.to/duske/how-kubernetes-handles-offline-nodes-53b5)

Well then, what happens if you delete the only control-plane node? Nothing good. In our local cluster it's our single point of failure. See Kubernetes documentation for "[Options for Highly Available topology](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/ha-topology/)" to avoid getting the whole cluster crippled by a single faulty hardware.

<quiz id="f4ad98ef-f8de-448b-ac0f-1971374d5c05"></quiz>
