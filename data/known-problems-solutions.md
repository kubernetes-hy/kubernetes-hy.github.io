---
path: '/known-problems-solutions'
title: 'Issues you may face'
hidden: false
information_page: true
hide_in_sidebar: true
---

This page includes some of the problems that have occurred during the following of the examples and their solutions. Good old "have you tried turning it off and on again" is a good place to start, but if that doesn't help then someone else has probably faced the problem.

## First deployment ##

There are a few things that may go wrong with creating the cluster and deploying the first application. Since you don't know any debugging tools, they're in the next section after all, you may have to ask for help in the telegram channel.

You can delete the deployment with `kubectl delete deployment hashgenerator-dep` and/or delete the cluster with `k3d cluster delete` for retrying.

Some of the things that may result in failure are
 1. insufficient space for the cluster
 2. insufficient space for the pods.

If this is the result for get pods:

```
$ kubectl get pods
  NAME                                READY   STATUS    RESTARTS   AGE
  hashgenerator-dep-cdcc6d567-jd8jr   0/1     Pending   0          43s
```

Check what the "Events" for that pod are with the `describe`. And if the events include the following we know that the problem is the space.

```
$ kubectl describe pod hashgenerator-dep-cdcc6d567-jd8jr
  (...)
  Events:
    Type     Reason            Age        From               Message
    ----     ------            ----       ----               -------
    Warning  FailedScheduling  <unknown>  default-scheduler  0/3 nodes are available: 3 node(s) had taint {node.kubernetes.io/disk-pressure: }, that the pod didn't tolerate.
```

You can read solutions here [https://k3d.io/faq/faq/#pods-evicted-due-to-lack-of-disk-space](https://k3d.io/faq/faq/#pods-evicted-due-to-lack-of-disk-space). Depending on your OS the steps may vary.

## ##
