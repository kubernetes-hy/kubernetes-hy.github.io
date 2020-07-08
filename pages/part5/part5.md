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

### Kubernetes Control Plane ###

[Kubernetes Control Plane](https://kubernetes.io/docs/concepts/overview/components/#control-plane-components) consists of

* etcd
  - A key-value storage that Kubernetes uses to save all cluster data

* kube-scheduler
  - 

* kube-controller-manager
  - 

* cloud-controller-manager
  - 

* kube-apiserver
  - This exposes the Kubernetes Control Plane through an API

### Eventual consistency model ###

## Custom Resource Definitions ##

